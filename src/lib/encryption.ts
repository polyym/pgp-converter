import { readKey, encrypt, createMessage } from 'openpgp';
import { getUserFriendlyError } from './errors';

export interface EncryptionResult {
	success: boolean;
	data?: string;
	error?: string;
}

/**
 * Encrypts a plaintext message using a PGP public key
 * @param plaintext - The message to encrypt
 * @param armoredPublicKey - The armored PGP public key
 * @returns EncryptionResult with the encrypted message or error
 */
export async function encryptMessage(
	plaintext: string,
	armoredPublicKey: string
): Promise<EncryptionResult> {
	try {
		const publicKeyObj = await readKey({ armoredKey: armoredPublicKey });
		const message = await createMessage({ text: plaintext });
		const encryptedMessage = await encrypt({
			message: message,
			encryptionKeys: publicKeyObj,
			config: { allowMissingKeyFlags: true }
		});

		return {
			success: true,
			data: String(encryptedMessage)
		};
	} catch (e: unknown) {
		if (import.meta.env.DEV) console.error(e);
		const message = e instanceof Error ? e.message : String(e);
		return {
			success: false,
			error: getUserFriendlyError(message, 'encrypt')
		};
	}
}
