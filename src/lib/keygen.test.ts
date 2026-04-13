import { describe, it, expect } from 'vitest';
import { generateKeyPair } from './keygen';

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
