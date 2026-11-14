import { createMessage, encrypt, type PrivateKey } from 'openpgp';
import { getUserFriendlyError, type ErrorStage } from './errors.ts';
import {
	readPublicKeys,
	describeKey,
	readUsablePrivateKey,
	PassphraseRequiredError,
	type KeyInfo
} from './keys.ts';
import { SIGNING_PASSPHRASE_REQUIRED_ERROR } from './signatures.ts';

export interface EncryptionResult {
	success: boolean;
	data?: string;
	/** Details of every key the message was encrypted to */
	recipients?: KeyInfo[];
	/** The key that signed the message, when it was signed */
	signer?: KeyInfo;
	error?: string;
	/** The input the error is about, when it is about one in particular */
	errorField?: 'publicKey' | 'signingKey' | 'signingPassphrase';
}

/** The sender's own key, when the message is to be signed as well as encrypted */
export interface Signer {
	armoredPrivateKey: string;
	passphrase: string;
}

/** Library errors that mean a recipient's key is at fault, though they only surface when encrypting */
const RECIPIENT_KEY_FAULT =
	/expired|revoked|could not find valid encryption key|considered too weak/i;

export const PRIVATE_KEY_ERROR =
	"That is a private key. Encryption needs the recipient's public key; never paste or share a private key.";

/**
 * Encrypts a plaintext message to one or more PGP public keys, optionally signing it first
 * @param plaintext - The message to encrypt
 * @param armoredPublicKeys - One or more armored PGP public keys
 * @param signer - The sender's private key and passphrase; leave out to send the message unsigned
 * @returns EncryptionResult with the encrypted message and its recipients, or an error
 */
export async function encryptMessage(
	plaintext: string,
	armoredPublicKeys: string,
	signer?: Signer
): Promise<EncryptionResult> {
	let stage: ErrorStage = 'public-key';
	// Errors from the signing key must not be described as problems with the recipient's key
	let context: 'encrypt' | 'sign' = 'encrypt';
	try {
		const publicKeys = await readPublicKeys(armoredPublicKeys);
		// OpenPGP.js would quietly use the public half of a private key. Refuse instead,
		// so nobody learns that pasting a private key into this box is acceptable.
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
			// Checked here so that a key that cannot sign is reported as that, not as a failed encryption
			stage = 'operation';
			await signingKey.getSigningKey();
			context = 'encrypt';
		}

		stage = 'operation';
		const message = await createMessage({ text: plaintext });
		// Typed by hand: the library's own type for this result needs a types package
		// (@openpgp/web-stream-tools) that is only installed for streaming. A text
		// message comes back as armoured text.
		const encryptedMessage: unknown = await encrypt({
			message,
			encryptionKeys: publicKeys,
			signingKeys: signingKey,
			config: { allowMissingKeyFlags: true }
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
		// The step is updated from inside a callback, which the compiler cannot follow
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
