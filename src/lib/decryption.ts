import { readMessage, decrypt, type Key } from 'openpgp';
import {
	getUserFriendlyError,
	PASSWORD_ONLY_MESSAGE_ERROR,
	NOT_ENCRYPTED_MESSAGE_ERROR,
	OVERSIZED_MESSAGE_ERROR,
	type ErrorStage
} from './errors.ts';
import { MESSAGE_READING_LIMITS } from './constants.ts';
import { CLEARTEXT_HEADER, normaliseArmor } from './armor.ts';
import { readPublicKeys, readUsablePrivateKey, PassphraseRequiredError } from './keys.ts';
import { checkSignatures, PRIVATE_KEY_AS_SENDER_ERROR, type SignatureCheck } from './signatures.ts';

export interface DecryptionResult {
	success: boolean;
	data?: string;
	/** True when the message carried at least one digital signature */
	isSigned?: boolean;
	/** The result of checking each signature against the sender's keys; empty if the message is unsigned */
	signatures?: SignatureCheck[];
	error?: string;
	/** The input the error is about, when it is about one in particular */
	errorField?: 'encrypted' | 'privateKey' | 'passphrase' | 'senderKey';
}

const FIELD_FOR_STAGE: Partial<Record<ErrorStage, DecryptionResult['errorField']>> = {
	'private-key': 'privateKey',
	passphrase: 'passphrase',
	message: 'encrypted'
};

export const PASSPHRASE_REQUIRED_ERROR =
	'This private key is protected by a passphrase. Enter the passphrase to decrypt.';
export const SIGNED_NOT_ENCRYPTED_ERROR =
	'This is a signed message, not an encrypted one: anyone can read it as it is. To check who signed it, use the Verify page.';

/** Errors that are about the message itself, though they only surface once decryption is tried */
const MESSAGE_ERRORS: ReadonlySet<string> = new Set([
	PASSWORD_ONLY_MESSAGE_ERROR,
	NOT_ENCRYPTED_MESSAGE_ERROR,
	OVERSIZED_MESSAGE_ERROR
]);

/**
 * Decrypts a PGP encrypted message using a private key and passphrase,
 * and checks its signature when the sender's public key is supplied
 * @param armoredMessage - The armored PGP encrypted message
 * @param armoredPrivateKey - The armored PGP private key
 * @param passphrase - The passphrase to unlock the private key; ignored if the key is not protected
 * @param armoredSenderKeys - Public keys of the people who may have signed the message; leave empty to skip the check
 * @returns DecryptionResult with the decrypted message or error
 */
export async function decryptMessage(
	armoredMessage: string,
	armoredPrivateKey: string,
	passphrase: string,
	armoredSenderKeys = ''
): Promise<DecryptionResult> {
	let stage: ErrorStage = 'private-key';
	// Errors from the sender's key must not be described as problems with the reader's own key
	let context: 'decrypt' | 'verify' = 'decrypt';
	try {
		const usableKey = await readUsablePrivateKey(armoredPrivateKey, passphrase, (s) => (stage = s));

		let senderKeys: Key[] = [];
		if (armoredSenderKeys.trim()) {
			context = 'verify';
			stage = 'public-key';
			senderKeys = await readPublicKeys(armoredSenderKeys);
			if (senderKeys.some((key) => key.isPrivate())) {
				return { success: false, error: PRIVATE_KEY_AS_SENDER_ERROR, errorField: 'senderKey' };
			}
			context = 'decrypt';
		}

		stage = 'message';
		const armored = normaliseArmor(armoredMessage);
		if (armored.includes(CLEARTEXT_HEADER)) {
			return { success: false, error: SIGNED_NOT_ENCRYPTED_ERROR, errorField: 'encrypted' };
		}
		const message = await readMessage({ armoredMessage: armored, config: MESSAGE_READING_LIMITS });

		stage = 'operation';
		const decryptedMessage = await decrypt({
			message,
			decryptionKeys: usableKey,
			verificationKeys: senderKeys,
			config: { allowMissingKeyFlags: true, ...MESSAGE_READING_LIMITS }
		});
		const data = String(decryptedMessage.data);

		return {
			success: true,
			data,
			isSigned: decryptedMessage.signatures.length > 0,
			signatures: await checkSignatures(decryptedMessage.signatures, senderKeys)
		};
	} catch (e: unknown) {
		if (e instanceof PassphraseRequiredError) {
			return { success: false, error: PASSPHRASE_REQUIRED_ERROR, errorField: 'passphrase' };
		}
		if (import.meta.env.DEV) {
			console.error(e);
		}
		const message = e instanceof Error ? e.message : String(e);
		const error = getUserFriendlyError(message, context, stage);
		// The step is updated from inside a callback, which the compiler cannot follow
		const failedAt = stage as ErrorStage;
		const messageField = MESSAGE_ERRORS.has(error) ? 'encrypted' : undefined;
		return {
			success: false,
			error,
			errorField: context === 'verify' ? 'senderKey' : (FIELD_FOR_STAGE[failedAt] ?? messageField)
		};
	}
}
