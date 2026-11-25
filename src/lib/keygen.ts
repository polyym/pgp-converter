import { generateKey } from 'openpgp';
import { getUserFriendlyError } from './errors.ts';
import { MIN_PASSPHRASE_LENGTH, EMAIL_REGEX } from './constants.ts';
import { formatFingerprint } from './keys.ts';

export interface KeyPair {
	publicKey: string;
	privateKey: string;
	/** Upper-case hex in groups of four, as formatFingerprint writes it */
	fingerprint: string;
}

export interface KeyGenResult {
	success: boolean;
	data?: KeyPair;
	error?: string;
}

export const NAME_REQUIRED_ERROR =
	'Enter a name for the key. It does not have to be your real one.';
export const INVALID_EMAIL_ERROR =
	'That email address does not look right. Correct it, or leave it empty.';

export interface KeyGenOptions {
	/** Goes into the user ID, which anyone with the public key can read, so any label will do */
	name: string;
	/**
	 * Optional, because OpenPGP needs no address and anything here is public with
	 * the key. Empty or whitespace-only gives a user ID with no address.
	 */
	email: string;
	/** At least MIN_PASSPHRASE_LENGTH characters */
	passphrase: string;
	keyType: 'ecc' | 'rsa';
	/** ECC only; defaults to 'curve25519' */
	curve?: 'curve25519' | 'nistP256' | 'nistP384' | 'nistP521';
	/** RSA only; defaults to 4096 */
	rsaBits?: 2048 | 3072 | 4096;
}

const DEFAULT_RSA_BITS = 4096;

/**
 * Generates a key pair whose private key is locked with the passphrase, and
 * returns both keys armoured, with the fingerprint. Checks the name, email and
 * passphrase length first. Never throws: a failure returns a user-facing error.
 */
export async function generateKeyPair(options: KeyGenOptions): Promise<KeyGenResult> {
	try {
		const { name, email, passphrase, keyType, curve, rsaBits } = options;

		if (!name.trim()) {
			return {
				success: false,
				error: NAME_REQUIRED_ERROR
			};
		}

		const address = email.trim();
		if (address && !EMAIL_REGEX.test(address)) {
			return {
				success: false,
				error: INVALID_EMAIL_ERROR
			};
		}

		if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
			return {
				success: false,
				error: `Passphrase must be at least ${String(MIN_PASSPHRASE_LENGTH)} characters`
			};
		}

		const userIDs = [address ? { name: name.trim(), email: address } : { name: name.trim() }];

		// Curve25519 uses OpenPGP.js's legacy encoding (EdDSALegacy signing key, ECDH
		// subkey). The library's 'curve25519' key type writes the RFC 9580 Ed25519 and
		// X25519 format instead, which GnuPG 2.4 and other common clients cannot import.
		// It is the same cryptography, and the legacy format is GnuPG's own default.
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
						rsaBits: rsaBits ?? DEFAULT_RSA_BITS,
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
		if (import.meta.env.DEV) {
			console.error(e);
		}
		const message = e instanceof Error ? e.message : String(e);
		return {
			success: false,
			error: getUserFriendlyError(message, 'keygen')
		};
	}
}
