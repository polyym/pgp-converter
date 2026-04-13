import { generateKey } from 'openpgp';
import { getUserFriendlyError } from './errors';
import { MIN_PASSPHRASE_LENGTH, EMAIL_REGEX } from './constants';

export interface KeyPair {
	publicKey: string;
	privateKey: string;
}

export interface KeyGenResult {
	success: boolean;
	data?: KeyPair;
	error?: string;
}

export interface KeyGenOptions {
	name: string;
	email: string;
	passphrase: string;
	keyType: 'ecc' | 'rsa';
	curve?: 'curve25519' | 'nistP256' | 'nistP384' | 'nistP521';
	rsaBits?: 2048 | 3072 | 4096;
}

/**
 * Generates a PGP key pair with the specified options
 * @param options - Key generation configuration (name, email, passphrase, key type)
 * @returns KeyGenResult with the generated public and private keys, or an error
 */
export async function generateKeyPair(options: KeyGenOptions): Promise<KeyGenResult> {
	try {
		const { name, email, passphrase, keyType, curve, rsaBits } = options;

		if (!name.trim() || !email.trim()) {
			return {
				success: false,
				error: 'Name and email are required'
			};
		}

		if (!EMAIL_REGEX.test(email.trim())) {
			return {
				success: false,
				error: 'Please enter a valid email address'
			};
		}

		if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
			return {
				success: false,
				error: `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`
			};
		}

		const userIDs = [{ name: name.trim(), email: email.trim() }];

		let result: { privateKey: string; publicKey: string };

		if (keyType === 'ecc') {
			if (!curve || curve === 'curve25519') {
				result = await generateKey({
					type: 'curve25519',
					userIDs,
					passphrase,
					format: 'armored'
				});
			} else {
				result = await generateKey({
					type: 'ecc',
					curve,
					userIDs,
					passphrase,
					format: 'armored'
				});
			}
		} else {
			result = await generateKey({
				type: 'rsa',
				rsaBits: rsaBits || 4096,
				userIDs,
				passphrase,
				format: 'armored'
			});
		}

		return {
			success: true,
			data: {
				publicKey: result.publicKey,
				privateKey: result.privateKey
			}
		};
	} catch (e: unknown) {
		console.error(e);
		const message = e instanceof Error ? e.message : String(e);
		return {
			success: false,
			error: getUserFriendlyError(message, 'keygen')
		};
	}
}

/**
 * Downloads a PGP key as a file via a temporary anchor element
 * @param content - The key content to download
 * @param filename - The filename for the downloaded file
 */
export function downloadKey(content: string, filename: string): void {
	const blob = new Blob([content], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
