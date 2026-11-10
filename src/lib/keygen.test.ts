import { describe, it, expect } from 'vitest';
import { readKey, readPrivateKey, decryptKey } from 'openpgp';
import { generateKeyPair } from './keygen';
import { formatFingerprint } from './keys';

const validOptions = {
	name: 'Test User',
	email: 'test@example.com',
	passphrase: 'strongpassphrase',
	keyType: 'ecc' as const,
	curve: 'curve25519' as const
};

describe('generateKeyPair', () => {
	it('should generate an ECC key pair', async () => {
		const result = await generateKeyPair(validOptions);

		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data!.publicKey).toContain('-----BEGIN PGP PUBLIC KEY BLOCK-----');
		expect(result.data!.privateKey).toContain('-----BEGIN PGP PRIVATE KEY BLOCK-----');
	}, 15000);

	it('should generate Curve25519 keys in the format GnuPG can import', async () => {
		const result = await generateKeyPair(validOptions);
		const key = await readKey({ armoredKey: result.data!.publicKey });

		// The newer 'ed25519' / 'x25519' encoding is rejected by GnuPG 2.4
		expect(key.getAlgorithmInfo()).toMatchObject({ algorithm: 'eddsaLegacy', curve: 'ed25519Legacy' });
		expect(key.subkeys[0].getAlgorithmInfo()).toMatchObject({ algorithm: 'ecdh', curve: 'curve25519Legacy' });
	}, 15000);

	it('should use the same format when no curve is given', async () => {
		const result = await generateKeyPair({ ...validOptions, curve: undefined });
		const key = await readKey({ armoredKey: result.data!.publicKey });

		expect(key.getAlgorithmInfo().algorithm).toBe('eddsaLegacy');
	}, 15000);

	it('should generate a NIST P-256 key pair', async () => {
		const result = await generateKeyPair({ ...validOptions, curve: 'nistP256' });
		const key = await readKey({ armoredKey: result.data!.publicKey });

		expect(key.getAlgorithmInfo()).toMatchObject({ algorithm: 'ecdsa', curve: 'nistP256' });
	}, 15000);

	it('should lock the private key with the passphrase', async () => {
		const result = await generateKeyPair(validOptions);
		const key = await readPrivateKey({ armoredKey: result.data!.privateKey });

		expect(key.isDecrypted()).toBe(false);
		expect(key.getKeys().every((part) => !part.keyPacket.isDecrypted())).toBe(true);
		await expect(decryptKey({ privateKey: key, passphrase: 'not the passphrase' })).rejects.toThrow();
		await expect(decryptKey({ privateKey: key, passphrase: validOptions.passphrase })).resolves.toBeDefined();
	}, 15000);

	it('should return the fingerprint of the new key', async () => {
		const result = await generateKeyPair(validOptions);
		const key = await readKey({ armoredKey: result.data!.publicKey });

		expect(result.data!.fingerprint).toMatch(/^([0-9A-F]{4} ){9}[0-9A-F]{4}$/);
		expect(result.data!.fingerprint).toBe(formatFingerprint(key.getFingerprint()));
	}, 15000);

	it('should generate an RSA key pair', async () => {
		const result = await generateKeyPair({
			...validOptions,
			keyType: 'rsa',
			rsaBits: 2048,
			curve: undefined
		});

		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data!.publicKey).toContain('-----BEGIN PGP PUBLIC KEY BLOCK-----');
	}, 30000);

	it('should fail with empty name', async () => {
		const result = await generateKeyPair({ ...validOptions, name: '' });

		expect(result.success).toBe(false);
		expect(result.error).toBe('Name and email are required');
	});

	it('should fail with empty email', async () => {
		const result = await generateKeyPair({ ...validOptions, email: '' });

		expect(result.success).toBe(false);
		expect(result.error).toBe('Name and email are required');
	});

	it('should fail with invalid email format', async () => {
		const result = await generateKeyPair({ ...validOptions, email: 'not-an-email' });

		expect(result.success).toBe(false);
		expect(result.error).toBe('Please enter a valid email address');
	});

	it('should fail with short passphrase', async () => {
		const result = await generateKeyPair({ ...validOptions, passphrase: 'short' });

		expect(result.success).toBe(false);
		expect(result.error).toContain('at least');
	});

	it('should fail with whitespace-only name', async () => {
		const result = await generateKeyPair({ ...validOptions, name: '   ' });

		expect(result.success).toBe(false);
		expect(result.error).toBe('Name and email are required');
	});
});
