import { readPrivateKey, decryptKey, readMessage, decrypt } from 'openpgp';

export interface DecryptionResult {
	success: boolean;
	data?: string;
	error?: string;
}

/**
 * Decrypts a PGP encrypted message using a private key and passphrase
 * @param armoredMessage - The armored PGP encrypted message
 * @param armoredPrivateKey - The armored PGP private key
 * @param passphrase - The passphrase to unlock the private key
 * @returns DecryptionResult with the decrypted message or error
 */
export async function decryptMessage(
	armoredMessage: string,
	armoredPrivateKey: string,
	passphrase: string
): Promise<DecryptionResult> {
	try {
		const privateKeyObject = await readPrivateKey({ armoredKey: armoredPrivateKey });
		const decryptedPrivateKey = await decryptKey({
			privateKey: privateKeyObject,
			passphrase: passphrase
		});

		const message = await readMessage({ armoredMessage: armoredMessage });
		const decryptedMessage = await decrypt({
			message: message,
			decryptionKeys: decryptedPrivateKey
		});

		return {
			success: true,
			data: decryptedMessage.data as string
		};
	} catch (e) {
		console.error(e);
		return {
			success: false,
			error: `Error decrypting message: ${(e as Error).message}`
		};
	}
}
