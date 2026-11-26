import { readMessage, decrypt, type Key } from 'openpgp';
import {
	getUserFriendlyError,
	PASSWORD_ONLY_MESSAGE_ERROR,
	NOT_ENCRYPTED_MESSAGE_ERROR,
	OVERSIZED_MESSAGE_ERROR,
	type ErrorStage
} from './errors.ts';
import { KEY_USE_SETTINGS, MESSAGE_READING_LIMITS } from './constants.ts';
import { CLEARTEXT_HEADER, hasOtherText, normaliseArmor } from './armor.ts';
import { readPublicKeys, readUsablePrivateKey, PassphraseRequiredError } from './keys.ts';
import { checkSignatures, PRIVATE_KEY_AS_SENDER_ERROR, type SignatureCheck } from './signatures.ts';

export interface DecryptionResult {
	success: boolean;
	data?: string;
	/** True when the message carries at least one signature, whether or not it verified */
	isSigned?: boolean;
	/** The result of checking each signature against the sender's keys; empty if the message is unsigned */
	signatures?: SignatureCheck[];
	/** True when the pasted text holds more than the message. The signature verdicts do not cover the rest. */
	hasOtherText?: boolean;
	error?: string;
	/** The input field to highlight; undefined when the error is not about one input */
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

/**
 * User-facing errors for faults in the message. When OpenPGP.js reports one from
 * decrypt(), at the 'operation' stage, which FIELD_FOR_STAGE maps to no field, the
 * error still goes under the message field.
 */
const MESSAGE_ERRORS: ReadonlySet<string> = new Set([
	PASSWORD_ONLY_MESSAGE_ERROR,
	NOT_ENCRYPTED_MESSAGE_ERROR,
	OVERSIZED_MESSAGE_ERROR
]);

/**
 * Decrypts an armoured message and checks its signatures against the sender's
 * public keys. Every input is cleaned up with normaliseArmor first, so quoted,
 * indented or reflowed text is accepted. Never throws: a failure returns a
 * user-facing error and the field to highlight.
 * @param armoredPrivateKey - may also hold the public key, as the combined key pair file does
 * @param passphrase - ignored when the private key is not protected
 * @param armoredSenderKeys - public keys of possible signers; without them each signature's key is unknown
 */
export async function decryptMessage(
	armoredMessage: string,
	armoredPrivateKey: string,
	passphrase: string,
	armoredSenderKeys = ''
): Promise<DecryptionResult> {
	let stage: ErrorStage = 'private-key';
	// 'verify' while the sender's keys are read, so their errors are not worded as
	// problems with the reader's own key
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
			config: { ...KEY_USE_SETTINGS, ...MESSAGE_READING_LIMITS }
		});
		const data = String(decryptedMessage.data);

		return {
			success: true,
			data,
			isSigned: decryptedMessage.signatures.length > 0,
			signatures: await checkSignatures(decryptedMessage.signatures, senderKeys),
			hasOtherText: hasOtherText(armored)
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
		// Widen to ErrorStage: narrowing does not see the assignment in the onStage callback
		const failedAt = stage as ErrorStage;
		const messageField = MESSAGE_ERRORS.has(error) ? 'encrypted' : undefined;
		return {
			success: false,
			error,
			errorField: context === 'verify' ? 'senderKey' : (FIELD_FOR_STAGE[failedAt] ?? messageField)
		};
	}
}
