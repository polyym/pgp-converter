import { readPrivateKey, decryptKey, readMessage, decrypt } from 'openpgp';
import { getUserFriendlyError, type ErrorStage } from './errors';
import { normaliseArmor, splitKeyBlocks } from './armor';

export interface DecryptionResult {
	success: boolean;
	data?: string;
	/** True when the message carried a digital signature, which this app does not verify */
	signed?: boolean;
	error?: string;
}

export const PASSPHRASE_REQUIRED_ERROR =
	'This private key is protected by a passphrase. Enter the passphrase to decrypt.';

const PRIVATE_KEY_HEADER = '-----BEGIN PGP PRIVATE KEY BLOCK-----';

/**
 * Picks the private key out of pasted text that may hold other blocks too.
 * The "Download Both Keys" file from the generate page puts the public key
 * first, and the library would otherwise read only that one.
 */
function pickPrivateKeyBlock(text: string): string {
	const normalised = normaliseArmor(text);
	return splitKeyBlocks(normalised).find((block) => block.startsWith(PRIVATE_KEY_HEADER)) ?? normalised;
}

/**
 * Decrypts a PGP encrypted message using a private key and passphrase
 * @param armoredMessage - The armored PGP encrypted message
 * @param armoredPrivateKey - The armored PGP private key
 * @param passphrase - The passphrase to unlock the private key; ignored if the key is not protected
 * @returns DecryptionResult with the decrypted message or error
 */
export async function decryptMessage(
	armoredMessage: string,
	armoredPrivateKey: string,
	passphrase: string
): Promise<DecryptionResult> {
	let stage: ErrorStage = 'private-key';
	try {
		const privateKeyObject = await readPrivateKey({ armoredKey: pickPrivateKeyBlock(armoredPrivateKey) });

		stage = 'passphrase';
		// A key exported without a passphrase is already unlocked; asking the library
		// to unlock it again fails, so only do so when the key is protected.
		const isProtected = !privateKeyObject.isDecrypted();
		if (isProtected && !passphrase) {
			return { success: false, error: PASSPHRASE_REQUIRED_ERROR };
		}
		const usableKey = isProtected
			? await decryptKey({ privateKey: privateKeyObject, passphrase: passphrase })
			: privateKeyObject;

		stage = 'message';
		const message = await readMessage({ armoredMessage: normaliseArmor(armoredMessage) });

		stage = 'operation';
		const decryptedMessage = await decrypt({
			message: message,
			decryptionKeys: usableKey,
			config: { allowMissingKeyFlags: true }
		});

		return {
			success: true,
			data: String(decryptedMessage.data),
			signed: decryptedMessage.signatures.length > 0
		};
	} catch (e: unknown) {
		if (import.meta.env.DEV) console.error(e);
		const message = e instanceof Error ? e.message : String(e);
		return {
			success: false,
			error: getUserFriendlyError(message, 'decrypt', stage)
		};
	}
}
