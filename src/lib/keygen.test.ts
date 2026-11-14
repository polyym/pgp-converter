import { describe, it, expect } from 'vitest';
import { readKey, readPrivateKey, decryptKey } from 'openpgp';
import { generateKeyPair, NAME_REQUIRED_ERROR, INVALID_EMAIL_ERROR } from './keygen.ts';
import { formatFingerprint } from './keys.ts';
import { must } from './testing.ts';

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
		expect(must(result.data).publicKey).toContain('-----BEGIN PGP PUBLIC KEY BLOCK-----');
		expect(must(result.data).privateKey).toContain('-----BEGIN PGP PRIVATE KEY BLOCK-----');
	}, 15_000);

	it('should generate Curve25519 keys in the format GnuPG can import', async () => {
		const result = await generateKeyPair(validOptions);
		const key = await readKey({ armoredKey: must(result.data).publicKey });

		// The newer 'ed25519' / 'x25519' encoding is rejected by GnuPG 2.4
		expect(key.getAlgorithmInfo()).toMatchObject({
			algorithm: 'eddsaLegacy',
			curve: 'ed25519Legacy'
		});
		expect(key.subkeys[0].getAlgorithmInfo()).toMatchObject({
			algorithm: 'ecdh',
			curve: 'curve25519Legacy'
		});
	}, 15_000);

	it('should use the same format when no curve is given', async () => {
		const result = await generateKeyPair({ ...validOptions, curve: undefined });
		const key = await readKey({ armoredKey: must(result.data).publicKey });

		expect(key.getAlgorithmInfo().algorithm).toBe('eddsaLegacy');
	}, 15_000);

	it('should generate a NIST P-256 key pair', async () => {
		const result = await generateKeyPair({ ...validOptions, curve: 'nistP256' });
		const key = await readKey({ armoredKey: must(result.data).publicKey });

		expect(key.getAlgorithmInfo()).toMatchObject({ algorithm: 'ecdsa', curve: 'nistP256' });
	}, 15_000);

	it('should lock the private key with the passphrase', async () => {
		const result = await generateKeyPair(validOptions);
		const key = await readPrivateKey({ armoredKey: must(result.data).privateKey });

		expect(key.isDecrypted()).toBe(false);
		expect(key.getKeys().every((part) => !part.keyPacket.isDecrypted())).toBe(true);
		await expect(
			decryptKey({ privateKey: key, passphrase: 'not the passphrase' })
		).rejects.toThrow();
		await expect(
			decryptKey({ privateKey: key, passphrase: validOptions.passphrase })
		).resolves.toBeDefined();
	}, 15_000);

	it('should return the fingerprint of the new key', async () => {
		const result = await generateKeyPair(validOptions);
		const key = await readKey({ armoredKey: must(result.data).publicKey });

		expect(must(result.data).fingerprint).toMatch(/^([0-9A-F]{4} ){9}[0-9A-F]{4}$/);
		expect(must(result.data).fingerprint).toBe(formatFingerprint(key.getFingerprint()));
	}, 15_000);

	it('should generate an RSA key pair', async () => {
		const result = await generateKeyPair({
			...validOptions,
			keyType: 'rsa',
			rsaBits: 2048,
			curve: undefined
		});

		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(must(result.data).publicKey).toContain('-----BEGIN PGP PUBLIC KEY BLOCK-----');
	}, 30_000);

	it('should fail with empty name', async () => {
		const result = await generateKeyPair({ ...validOptions, name: '' });

		expect(result.success).toBe(false);
		expect(result.error).toBe(NAME_REQUIRED_ERROR);
	});

	it('should make a key that carries no email address when none is given', async () => {
		const result = await generateKeyPair({ ...validOptions, name: 'Pseudonym', email: '' });
		expect(result.success).toBe(true);

		const key = await readKey({ armoredKey: must(result.data).publicKey });
		expect(key.getUserIDs()).toEqual(['Pseudonym']);
		expect(must(result.data).publicKey).not.toContain('@');
	}, 15_000);

	it('should treat an email of spaces as no email', async () => {
		const result = await generateKeyPair({ ...validOptions, email: ' '.repeat(3) });
		expect(result.success).toBe(true);
		const key = await readKey({ armoredKey: must(result.data).publicKey });
		expect(key.getUserIDs()[0]).not.toContain('<');
	}, 15_000);

	it('should fail with invalid email format', async () => {
		const result = await generateKeyPair({ ...validOptions, email: 'not-an-email' });

		expect(result.success).toBe(false);
		expect(result.error).toBe(INVALID_EMAIL_ERROR);
	});

	it('should fail with short passphrase', async () => {
		const result = await generateKeyPair({ ...validOptions, passphrase: 'short' });

		expect(result.success).toBe(false);
		expect(result.error).toContain('at least');
	});

	it('should fail with whitespace-only name', async () => {
		const result = await generateKeyPair({ ...validOptions, name: ' '.repeat(3) });

		expect(result.success).toBe(false);
		expect(result.error).toBe(NAME_REQUIRED_ERROR);
	});
});
