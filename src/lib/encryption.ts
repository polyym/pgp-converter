import { readKey, encrypt, createMessage } from 'openpgp';

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
			encryptionKeys: publicKeyObj
		});

		return {
			success: true,
			data: encryptedMessage as string
		};
	} catch (e) {
		console.error(e);
		return {
			success: false,
			error: `Error encrypting message: ${(e as Error).message}`
		};
	}
}
