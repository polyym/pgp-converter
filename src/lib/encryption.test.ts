import { describe, it, expect } from 'vitest';
import { encryptMessage, PRIVATE_KEY_ERROR } from './encryption.ts';
import { WEAK_RECIPIENT_KEY_ERROR } from './errors.ts';
import { decryptMessage } from './decryption.ts';
import { generateKey, readMessage, revokeKey } from 'openpgp';
import { must } from './testing.ts';

const TEST_PASSPHRASE = 'testpassphrase';

async function createTestKeyPair(name = 'Test User') {
	const { publicKey, privateKey } = await generateKey({
		type: 'curve25519',
		userIDs: [{ name, email: 'test@example.com' }],
		passphrase: TEST_PASSPHRASE,
		format: 'armored'
	});
	return { publicKey, privateKey };
}

describe('encryptMessage', () => {
	it('should successfully encrypt a message with a valid public key', async () => {
		const { publicKey } = await createTestKeyPair();
		const result = await encryptMessage('Hello, World!', publicKey);

		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data).toContain('-----BEGIN PGP MESSAGE-----');
		expect(result.error).toBeUndefined();
	}, 15_000);

	it('should return a user-friendly error for invalid public key', async () => {
		const result = await encryptMessage('Hello', 'not-a-valid-key');

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.data).toBeUndefined();
		// Should be a friendly message, not raw OpenPGP error
		expect(result.error).not.toContain('Error encrypting message:');
		expect(result.error).toContain('The public key appears to be invalid');
	});

	it('should return a user-friendly error for empty key', async () => {
		const result = await encryptMessage('Hello', '');

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should report who the message was encrypted to', async () => {
		const { publicKey } = await createTestKeyPair('Alice');
		const result = await encryptMessage('Hello', publicKey);

		expect(result.recipients).toHaveLength(1);
		expect(must(result.recipients)[0].userIDs).toEqual(['Alice <test@example.com>']);
		expect(must(result.recipients)[0].fingerprint).toMatch(/^[0-9A-F ]+$/);
	}, 15_000);

	it('should refuse a private key instead of quietly using it', async () => {
		const { privateKey } = await createTestKeyPair();
		const result = await encryptMessage('Hello', privateKey);

		expect(result.success).toBe(false);
		expect(result.data).toBeUndefined();
		expect(result.error).toBe(PRIVATE_KEY_ERROR);
	}, 15_000);

	it('should encrypt to every key when several are pasted', async () => {
		const alice = await createTestKeyPair('Alice');
		const bob = await createTestKeyPair('Bob');

		const result = await encryptMessage('For both of you', `${alice.publicKey}\n${bob.publicKey}`);
		expect(result.success).toBe(true);
		expect(result.recipients).toHaveLength(2);

		const message = await readMessage({ armoredMessage: must(result.data) });
		expect(message.getEncryptionKeyIDs()).toHaveLength(2);

		for (const pair of [alice, bob]) {
			const decrypted = await decryptMessage(must(result.data), pair.privateKey, TEST_PASSPHRASE);
			expect(decrypted.data).toBe('For both of you');
		}
	}, 20_000);

	it('should accept a key that was indented or quoted in an email', async () => {
		const { publicKey } = await createTestKeyPair();
		const indented = publicKey
			.split('\n')
			.map((line) => ' '.repeat(4) + line)
			.join('\n');
		const quoted = publicKey
			.split('\n')
			.map((line) => '> ' + line)
			.join('\n');

		expect((await encryptMessage('Hello', indented)).success).toBe(true);
		expect((await encryptMessage('Hello', quoted)).success).toBe(true);
	}, 15_000);

	it('should say when a message is pasted instead of a key', async () => {
		const { publicKey } = await createTestKeyPair();
		const message = await encryptMessage('Hello', publicKey);
		const result = await encryptMessage('Hello', must(message.data));

		expect(result.success).toBe(false);
		expect(result.error).toContain('valid PGP public key');
	}, 15_000);

	it('should explain that an expired key cannot be used', async () => {
		const expired = await generateKey({
			type: 'curve25519',
			userIDs: [{ name: 'Old', email: 'old@example.com' }],
			keyExpirationTime: 1,
			date: new Date(Date.now() - 86_400_000),
			format: 'armored'
		});
		const result = await encryptMessage('Hello', expired.publicKey);

		expect(result.success).toBe(false);
		expect(result.error).toContain('expired');
		// Shown under the key box, where it stays, not in a message that fades
		expect(result.errorField).toBe('publicKey');
	}, 15_000);

	it('should explain that a revoked key cannot be used', async () => {
		const pair = await generateKey({
			type: 'curve25519',
			userIDs: [{ name: 'Gone', email: 'gone@example.com' }],
			format: 'object'
		});
		const revoked = await revokeKey({ key: pair.privateKey, format: 'armored' });
		const result = await encryptMessage('Hello', revoked.publicKey);

		expect(result.success).toBe(false);
		expect(result.error).toContain('revoked');
		expect(result.errorField).toBe('publicKey');
	}, 15_000);

	it('should explain that a short RSA key is no longer accepted', async () => {
		// The library will only make a key this short when told the limit is lower
		const weak = await generateKey({
			type: 'rsa',
			rsaBits: 1024,
			userIDs: [{ name: 'Old Timer', email: 'old@example.com' }],
			format: 'armored',
			config: { minRSABits: 1024 }
		});
		const result = await encryptMessage('Hello', weak.publicKey);

		expect(result.success).toBe(false);
		expect(result.error).toBe(WEAK_RECIPIENT_KEY_ERROR);
		expect(result.errorField).toBe('publicKey');
	}, 30_000);
});
