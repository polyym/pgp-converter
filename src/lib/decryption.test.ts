import { describe, it, expect } from 'vitest';
import { decryptMessage } from './decryption';
import { encryptMessage } from './encryption';
import { generateKey } from 'openpgp';

const TEST_PASSPHRASE = 'testpassphrase';

async function createTestKeyPair() {
	const { publicKey, privateKey } = await generateKey({
		type: 'curve25519',
		userIDs: [{ name: 'Test User', email: 'test@example.com' }],
		passphrase: TEST_PASSPHRASE,
		format: 'armored'
	});
	return { publicKey, privateKey };
}

describe('decryptMessage', () => {
	it('should successfully decrypt a message', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const encrypted = await encryptMessage('Secret message', publicKey);
		expect(encrypted.success).toBe(true);

		const result = await decryptMessage(encrypted.data!, privateKey, TEST_PASSPHRASE);
		expect(result.success).toBe(true);
		expect(result.data).toBe('Secret message');
	}, 15000);

	it('should return a friendly error for wrong passphrase', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const encrypted = await encryptMessage('Secret', publicKey);

		const result = await decryptMessage(encrypted.data!, privateKey, 'wrongpassphrase');
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).not.toContain('Error decrypting message:');
	}, 15000);

	it('should return a friendly error for invalid encrypted message', async () => {
		const { privateKey } = await createTestKeyPair();
		const result = await decryptMessage('not-encrypted-text', privateKey, TEST_PASSPHRASE);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	}, 15000);

	it('should return a friendly error for wrong private key', async () => {
		const keyPair1 = await createTestKeyPair();
		const keyPair2 = await createTestKeyPair();

		const encrypted = await encryptMessage('Secret', keyPair1.publicKey);
		const result = await decryptMessage(encrypted.data!, keyPair2.privateKey, TEST_PASSPHRASE);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	}, 20000);
});
