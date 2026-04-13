import { describe, it, expect } from 'vitest';
import { encryptMessage } from './encryption';
import { generateKey } from 'openpgp';

async function createTestKeyPair() {
	const { publicKey, privateKey } = await generateKey({
		type: 'curve25519',
		userIDs: [{ name: 'Test User', email: 'test@example.com' }],
		passphrase: 'testpassphrase',
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
	}, 15000);

	it('should return a user-friendly error for invalid public key', async () => {
		const result = await encryptMessage('Hello', 'not-a-valid-key');

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.data).toBeUndefined();
		// Should be a friendly message, not raw OpenPGP error
		expect(result.error).not.toContain('Error encrypting message:');
	});

	it('should return a user-friendly error for empty key', async () => {
		const result = await encryptMessage('Hello', '');

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});
