import { encrypt, createMessage } from 'openpgp';
import { getUserFriendlyError, type ErrorStage } from './errors';
import { readPublicKeys, describeKey, type KeyInfo } from './keys';

export interface EncryptionResult {
	success: boolean;
	data?: string;
	/** Details of every key the message was encrypted to */
	recipients?: KeyInfo[];
	error?: string;
}

export const PRIVATE_KEY_ERROR =
	"That is a private key. Encryption needs the recipient's public key; never paste or share a private key.";

/**
 * Encrypts a plaintext message to one or more PGP public keys
 * @param plaintext - The message to encrypt
 * @param armoredPublicKeys - One or more armored PGP public keys
 * @returns EncryptionResult with the encrypted message and its recipients, or an error
 */
export async function encryptMessage(
	plaintext: string,
	armoredPublicKeys: string
): Promise<EncryptionResult> {
	let stage: ErrorStage = 'public-key';
	try {
		const publicKeys = await readPublicKeys(armoredPublicKeys);
		// OpenPGP.js would quietly use the public half of a private key. Refuse instead,
		// so nobody learns that pasting a private key into this box is acceptable.
		if (publicKeys.some((key) => key.isPrivate())) {
			return { success: false, error: PRIVATE_KEY_ERROR };
		}

		stage = 'operation';
		const message = await createMessage({ text: plaintext });
		const encryptedMessage = await encrypt({
			message: message,
			encryptionKeys: publicKeys,
			config: { allowMissingKeyFlags: true }
		});

		return {
			success: true,
			data: String(encryptedMessage),
			recipients: await Promise.all(publicKeys.map(describeKey))
		};
	} catch (e: unknown) {
		if (import.meta.env.DEV) console.error(e);
		const message = e instanceof Error ? e.message : String(e);
		return {
			success: false,
			error: getUserFriendlyError(message, 'encrypt', stage)
		};
	}
}
