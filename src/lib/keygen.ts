import { generateKey } from 'openpgp';
import { getUserFriendlyError } from './errors.ts';
import { MIN_PASSPHRASE_LENGTH, EMAIL_REGEX } from './constants.ts';
import { formatFingerprint } from './keys.ts';

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

export const NAME_REQUIRED_ERROR =
	'Enter a name for the key. It does not have to be your real one.';
export const INVALID_EMAIL_ERROR =
	'That email address does not look right. Correct it, or leave it empty.';

export interface KeyGenOptions {
	/** Written into the key and visible to anyone who has the public key; any label will do */
	name: string;
	/** Also written into the key. Leave empty for a key that carries no address. */
	email: string;
	passphrase: string;
	keyType: 'ecc' | 'rsa';
	curve?: 'curve25519' | 'nistP256' | 'nistP384' | 'nistP521';
	rsaBits?: 2048 | 3072 | 4096;
}

const DEFAULT_RSA_BITS = 4096;

/**
 * Generates a PGP key pair with the specified options
 * @param options - Key generation configuration (name, optional email, passphrase, key type)
 * @returns KeyGenResult with the generated public and private keys, or an error
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

		// A public key is meant to be handed out, and whatever identifies its owner
		// goes with it. PGP does not need an address, so nobody is made to give one.
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
