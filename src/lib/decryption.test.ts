import { describe, it, expect } from 'vitest';
import { decryptMessage, PASSPHRASE_REQUIRED_ERROR } from './decryption';
import { encryptMessage } from './encryption';
import { generateKey, readKey, encrypt, createMessage, SecretKeyPacket } from 'openpgp';

const TEST_PASSPHRASE = 'testpassphrase';

/** Pass null for a key with no passphrase */
async function createTestKeyPair(passphrase: string | null = TEST_PASSPHRASE) {
	const { publicKey, privateKey } = await generateKey({
		type: 'curve25519',
		userIDs: [{ name: 'Test User', email: 'test@example.com' }],
		passphrase: passphrase ?? undefined,
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
		expect(result.signed).toBe(false);
	}, 15000);

	it('should return a friendly error for wrong passphrase', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const encrypted = await encryptMessage('Secret', publicKey);

		const result = await decryptMessage(encrypted.data!, privateKey, 'wrongpassphrase');
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).not.toContain('Error decrypting message:');
		expect(result.error).toContain('Incorrect passphrase');
	}, 15000);

	it('should ask for the passphrase when a protected key is used without one', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const encrypted = await encryptMessage('Secret', publicKey);

		const result = await decryptMessage(encrypted.data!, privateKey, '');
		expect(result.success).toBe(false);
		expect(result.error).toBe(PASSPHRASE_REQUIRED_ERROR);
	}, 15000);

	it('should decrypt with a private key that has no passphrase', async () => {
		const { publicKey, privateKey } = await createTestKeyPair(null);
		const encrypted = await encryptMessage('No passphrase needed', publicKey);

		const result = await decryptMessage(encrypted.data!, privateKey, '');
		expect(result.success).toBe(true);
		expect(result.data).toBe('No passphrase needed');

		// A passphrase typed out of habit must not get in the way either
		const withPassphrase = await decryptMessage(encrypted.data!, privateKey, 'typed anyway');
		expect(withPassphrase.data).toBe('No passphrase needed');
	}, 15000);

	it('should decrypt with a subkeys-only key, whose primary secret key has been stripped', async () => {
		// What "gpg --export-secret-subkeys" produces: a stub in place of the primary
		// secret key, with the encryption subkey still locked by the passphrase
		const pair = await generateKey({
			type: 'ecc',
			curve: 'curve25519Legacy',
			userIDs: [{ name: 'Subkeys Only', email: 'subkeys@example.com' }],
			passphrase: TEST_PASSPHRASE,
			format: 'object'
		});
		const encrypted = await encryptMessage('For the subkey', pair.publicKey.armor());
		const primary = pair.privateKey.keyPacket;
		if (!(primary instanceof SecretKeyPacket)) throw new Error('Expected a secret key packet');
		primary.makeDummy();
		const stripped = pair.privateKey.armor();

		const result = await decryptMessage(encrypted.data!, stripped, TEST_PASSPHRASE);
		expect(result.data).toBe('For the subkey');

		const withoutPassphrase = await decryptMessage(encrypted.data!, stripped, '');
		expect(withoutPassphrase.error).toBe(PASSPHRASE_REQUIRED_ERROR);
	}, 15000);

	it('should find the private key in the "both keys" download from the generate page', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const encrypted = await encryptMessage('Secret', publicKey);
		// The same layout that downloadBothKeys writes
		const bothKeys = `=== PUBLIC KEY ===\n\n${publicKey}\n\n=== PRIVATE KEY ===\n\n${privateKey}`;

		const result = await decryptMessage(encrypted.data!, bothKeys, TEST_PASSPHRASE);
		expect(result.success).toBe(true);
		expect(result.data).toBe('Secret');
	}, 15000);

	it('should blame the message, not the key, for an invalid encrypted message', async () => {
		const { privateKey } = await createTestKeyPair();
		const result = await decryptMessage('not-encrypted-text', privateKey, TEST_PASSPHRASE);

		expect(result.success).toBe(false);
		expect(result.error).toContain('The encrypted message appears to be invalid');
	}, 15000);

	it('should say when a key is pasted into the message box', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const result = await decryptMessage(publicKey, privateKey, TEST_PASSPHRASE);

		expect(result.success).toBe(false);
		expect(result.error).toContain("doesn't appear to be a PGP message");
	}, 15000);

	it('should say when a public key is pasted into the private key box', async () => {
		const { publicKey } = await createTestKeyPair();
		const encrypted = await encryptMessage('Secret', publicKey);
		const result = await decryptMessage(encrypted.data!, publicKey, TEST_PASSPHRASE);

		expect(result.success).toBe(false);
		expect(result.error).toContain('valid PGP private key');
	}, 15000);

	it('should say when the message was encrypted to a different key', async () => {
		const keyPair1 = await createTestKeyPair();
		const keyPair2 = await createTestKeyPair();

		const encrypted = await encryptMessage('Secret', keyPair1.publicKey);
		const result = await decryptMessage(encrypted.data!, keyPair2.privateKey, TEST_PASSPHRASE);

		expect(result.success).toBe(false);
		expect(result.error).toContain('not encrypted with the private key');
	}, 20000);

	it('should say when the message has been cut short', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const encrypted = await encryptMessage('A longer secret message. '.repeat(40), publicKey);
		const lines = encrypted.data!.split('\n');
		const truncated = lines.slice(0, 6).concat(lines.slice(-2)).join('\n');

		const result = await decryptMessage(truncated, privateKey, TEST_PASSPHRASE);
		expect(result.success).toBe(false);
		expect(result.error).toContain('incomplete or has been altered');
	}, 15000);

	it('should treat a message that decrypts to nothing as a success', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const empty = await encrypt({
			message: await createMessage({ text: '' }),
			encryptionKeys: await readKey({ armoredKey: publicKey })
		});

		const result = await decryptMessage(String(empty), privateKey, TEST_PASSPHRASE);
		expect(result.success).toBe(true);
		expect(result.data).toBe('');
	}, 15000);

	it('should report that a message carries a signature it did not verify', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const stranger = await generateKey({
			type: 'curve25519',
			userIDs: [{ name: 'Stranger', email: 'stranger@example.com' }],
			format: 'object'
		});
		const signed = await encrypt({
			message: await createMessage({ text: 'Signed by someone' }),
			encryptionKeys: await readKey({ armoredKey: publicKey }),
			signingKeys: stranger.privateKey
		});

		const result = await decryptMessage(String(signed), privateKey, TEST_PASSPHRASE);
		expect(result.success).toBe(true);
		expect(result.data).toBe('Signed by someone');
		expect(result.signed).toBe(true);
	}, 15000);

	it('should accept inputs that were indented or quoted in an email', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const encrypted = await encryptMessage('Secret', publicKey);
		const quote = (text: string) => text.split('\n').map((line) => '> ' + line).join('\n');

		const result = await decryptMessage(quote(encrypted.data!), quote(privateKey), TEST_PASSPHRASE);
		expect(result.data).toBe('Secret');
	}, 15000);
});
