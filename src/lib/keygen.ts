import { generateKey } from 'openpgp';
import { getUserFriendlyError } from './errors';
import { MIN_PASSPHRASE_LENGTH, EMAIL_REGEX } from './constants';
import { formatFingerprint } from './keys';

export interface KeyPair {
	publicKey: string;
	privateKey: string;
	/** Fingerprint of the new key, formatted for comparing by eye */
	fingerprint: string;
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

		// OpenPGP.js offers two encodings of Curve25519 keys. Its 'curve25519' type writes
		// the newer one, which GnuPG 2.4 and other widely used clients cannot import. The
		// legacy encoding is the same cryptography in the format those clients expect, and
		// it is what GnuPG itself generates by default.
		const eccCurve = !curve || curve === 'curve25519' ? 'curve25519Legacy' : curve;

		const generated =
			keyType === 'ecc'
				? await generateKey({
						type: 'ecc',
						curve: eccCurve,
						userIDs,
						passphrase,
						format: 'object'
					})
				: await generateKey({
						type: 'rsa',
						rsaBits: rsaBits || 4096,
						userIDs,
						passphrase,
						format: 'object'
					});

		return {
			success: true,
			data: {
				publicKey: generated.publicKey.armor(),
				privateKey: generated.privateKey.armor(),
				fingerprint: formatFingerprint(generated.publicKey.getFingerprint())
			}
		};
	} catch (e: unknown) {
		if (import.meta.env.DEV) console.error(e);
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
