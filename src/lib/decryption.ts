import { readPrivateKey, decryptKey, readMessage, decrypt } from 'openpgp';
import { getUserFriendlyError } from './errors';

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
			decryptionKeys: decryptedPrivateKey,
			config: { allowMissingKeyFlags: true }
		});

		return {
			success: true,
			data: String(decryptedMessage.data)
		};
	} catch (e: unknown) {
		console.error(e);
		const message = e instanceof Error ? e.message : String(e);
		return {
			success: false,
			error: getUserFriendlyError(message, 'decrypt')
		};
	}
}
