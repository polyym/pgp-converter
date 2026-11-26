import { createMessage, encrypt, type PrivateKey } from 'openpgp';
import { KEY_USE_SETTINGS } from './constants.ts';
import { getUserFriendlyError, type ErrorStage } from './errors.ts';
import {
	readPublicKeys,
	describeKey,
	readUsablePrivateKey,
	PassphraseRequiredError,
	KEY_CHECK_CONFIG,
	type KeyInfo
} from './keys.ts';
import { SIGNING_PASSPHRASE_REQUIRED_ERROR } from './signatures.ts';

export interface EncryptionResult {
	success: boolean;
	data?: string;
	/** One entry per recipient key; copies of the same key count once */
	recipients?: KeyInfo[];
	/** The key that signed the message, when it was signed */
	signer?: KeyInfo;
	error?: string;
	/** The input field to highlight; undefined when the error is not about one input */
	errorField?: 'publicKey' | 'signingKey' | 'signingPassphrase';
}

/** The sender's own key, when the message is to be signed as well as encrypted */
export interface Signer {
	armoredPrivateKey: string;
	passphrase: string;
}

/** Recipient-key errors that OpenPGP.js raises only inside encrypt(), at the 'operation' stage */
const RECIPIENT_KEY_FAULT =
	/expired|revoked|could not find valid encryption key|considered too weak/i;

export const PRIVATE_KEY_ERROR =
	"That is a private key. Encryption needs the recipient's public key; never paste or share a private key.";

/**
 * Encrypts text to every public key in `armoredPublicKeys` and, when a signer
 * is given, signs it as well. On success `data` is an armoured PGP MESSAGE.
 * Keys are cleaned up with normaliseArmor first, and a private key is refused.
 * Never throws: a failure returns a user-facing error and the field to highlight.
 * @param signer - omit to send the message unsigned
 */
export async function encryptMessage(
	plaintext: string,
	armoredPublicKeys: string,
	signer?: Signer
): Promise<EncryptionResult> {
	let stage: ErrorStage = 'public-key';
	// 'sign' while the signing key is read and checked, so its errors are not worded
	// as problems with a recipient's key
	let context: 'encrypt' | 'sign' = 'encrypt';
	try {
		const publicKeys = await readPublicKeys(armoredPublicKeys);
		// OpenPGP.js would silently encrypt to the public half of a private key. Refuse
		// it, so nobody learns that pasting a private key into this box is acceptable.
		if (publicKeys.some((key) => key.isPrivate())) {
			return { success: false, error: PRIVATE_KEY_ERROR, errorField: 'publicKey' };
		}

		let signingKey: PrivateKey | undefined;
		if (signer) {
			context = 'sign';
			signingKey = await readUsablePrivateKey(
				signer.armoredPrivateKey,
				signer.passphrase,
				(s) => (stage = s)
			);
			// Check now, while the context is 'sign', so an expired, revoked or weak signing
			// key is reported as such rather than as a failed encryption
			stage = 'operation';
			await signingKey.getSigningKey(undefined, undefined, undefined, KEY_CHECK_CONFIG);
			context = 'encrypt';
		}

		stage = 'operation';
		const message = await createMessage({ text: plaintext });
		// Typed as unknown: OpenPGP.js's declared return type needs the types from
		// @openpgp/web-stream-tools, which this project does not install. For a text
		// message the result is an armoured string.
		const encryptedMessage: unknown = await encrypt({
			message,
			encryptionKeys: publicKeys,
			signingKeys: signingKey,
			config: KEY_USE_SETTINGS
		});

		return {
			success: true,
			data: String(encryptedMessage),
			recipients: await Promise.all(publicKeys.map((key) => describeKey(key, 'encrypt'))),
			signer: signingKey ? await describeKey(signingKey, 'sign') : undefined
		};
	} catch (e: unknown) {
		if (e instanceof PassphraseRequiredError) {
			return {
				success: false,
				error: SIGNING_PASSPHRASE_REQUIRED_ERROR,
				errorField: 'signingPassphrase'
			};
		}
		if (import.meta.env.DEV) {
			console.error(e);
		}
		const message = e instanceof Error ? e.message : String(e);
		// Widen to ErrorStage: narrowing does not see the assignment in the onStage callback
		const failedAt = stage as ErrorStage;
		const signerField = failedAt === 'passphrase' ? 'signingPassphrase' : 'signingKey';
		return {
			success: false,
			error: getUserFriendlyError(message, context, failedAt),
			errorField:
				context === 'sign'
					? signerField
					: failedAt === 'public-key' || RECIPIENT_KEY_FAULT.test(message)
						? 'publicKey'
						: undefined
		};
	}
}
