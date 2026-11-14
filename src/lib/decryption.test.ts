import { describe, it, expect } from 'vitest';
import {
	decryptMessage,
	PASSPHRASE_REQUIRED_ERROR,
	SIGNED_NOT_ENCRYPTED_ERROR
} from './decryption.ts';
import {
	PASSWORD_ONLY_MESSAGE_ERROR,
	NOT_ENCRYPTED_MESSAGE_ERROR,
	OVERSIZED_MESSAGE_ERROR
} from './errors.ts';
import { MAX_UNPACKED_MESSAGE_BYTES } from './constants.ts';
import { encryptMessage } from './encryption.ts';
import {
	generateKey,
	readKey,
	readPrivateKey,
	decryptKey,
	encrypt,
	sign,
	createMessage,
	createCleartextMessage,
	enums,
	SecretKeyPacket
} from 'openpgp';
import { must } from './testing.ts';

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

/** The lines of an armoured block, without the blank ones */
function linesOf(armor: string): string[] {
	return armor
		.trim()
		.split(/\r?\n/)
		.filter((line) => line !== '');
}

/** The text as an email program quotes it */
function quote(text: string): string {
	return text
		.split('\n')
		.map((line) => `> ${line}`)
		.join('\n');
}

describe('decryptMessage', () => {
	it('should successfully decrypt a message', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const encrypted = await encryptMessage('Secret message', publicKey);
		expect(encrypted.success).toBe(true);

		const result = await decryptMessage(must(encrypted.data), privateKey, TEST_PASSPHRASE);
		expect(result.success).toBe(true);
		expect(result.data).toBe('Secret message');
		expect(result.isSigned).toBe(false);
	}, 15_000);

	it('should return a friendly error for wrong passphrase', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const encrypted = await encryptMessage('Secret', publicKey);

		const result = await decryptMessage(must(encrypted.data), privateKey, 'wrongpassphrase');
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).not.toContain('Error decrypting message:');
		expect(result.error).toContain('Incorrect passphrase');
	}, 15_000);

	it('should ask for the passphrase when a protected key is used without one', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const encrypted = await encryptMessage('Secret', publicKey);

		const result = await decryptMessage(must(encrypted.data), privateKey, '');
		expect(result.success).toBe(false);
		expect(result.error).toBe(PASSPHRASE_REQUIRED_ERROR);
	}, 15_000);

	it('should decrypt with a private key that has no passphrase', async () => {
		const { publicKey, privateKey } = await createTestKeyPair(null);
		const encrypted = await encryptMessage('No passphrase needed', publicKey);

		const result = await decryptMessage(must(encrypted.data), privateKey, '');
		expect(result.success).toBe(true);
		expect(result.data).toBe('No passphrase needed');

		// A passphrase typed out of habit must not get in the way either
		const withPassphrase = await decryptMessage(must(encrypted.data), privateKey, 'typed anyway');
		expect(withPassphrase.data).toBe('No passphrase needed');
	}, 15_000);

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
		if (!(primary instanceof SecretKeyPacket)) {
			throw new TypeError('Expected a secret key packet');
		}
		primary.makeDummy();
		const stripped = pair.privateKey.armor();

		const result = await decryptMessage(must(encrypted.data), stripped, TEST_PASSPHRASE);
		expect(result.data).toBe('For the subkey');

		const withoutPassphrase = await decryptMessage(must(encrypted.data), stripped, '');
		expect(withoutPassphrase.error).toBe(PASSPHRASE_REQUIRED_ERROR);
	}, 15_000);

	it('should find the private key in the "both keys" download from the generate page', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const encrypted = await encryptMessage('Secret', publicKey);
		// The same layout that downloadBothKeys writes
		const bothKeys = `=== PUBLIC KEY ===\n\n${publicKey}\n\n=== PRIVATE KEY ===\n\n${privateKey}`;

		const result = await decryptMessage(must(encrypted.data), bothKeys, TEST_PASSPHRASE);
		expect(result.success).toBe(true);
		expect(result.data).toBe('Secret');
	}, 15_000);

	it('should blame the message, not the key, for an invalid encrypted message', async () => {
		const { privateKey } = await createTestKeyPair();
		const result = await decryptMessage('not-encrypted-text', privateKey, TEST_PASSPHRASE);

		expect(result.success).toBe(false);
		expect(result.error).toContain('The encrypted message appears to be invalid');
	}, 15_000);

	it('should say when a key is pasted into the message box', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const result = await decryptMessage(publicKey, privateKey, TEST_PASSPHRASE);

		expect(result.success).toBe(false);
		expect(result.error).toContain("doesn't appear to be a PGP message");
	}, 15_000);

	it('should say when a public key is pasted into the private key box', async () => {
		const { publicKey } = await createTestKeyPair();
		const encrypted = await encryptMessage('Secret', publicKey);
		const result = await decryptMessage(must(encrypted.data), publicKey, TEST_PASSPHRASE);

		expect(result.success).toBe(false);
		expect(result.error).toContain('valid PGP private key');
	}, 15_000);

	it('should say when the message was encrypted to a different key', async () => {
		const keyPair1 = await createTestKeyPair();
		const keyPair2 = await createTestKeyPair();

		const encrypted = await encryptMessage('Secret', keyPair1.publicKey);
		const result = await decryptMessage(must(encrypted.data), keyPair2.privateKey, TEST_PASSPHRASE);

		expect(result.success).toBe(false);
		expect(result.error).toContain('not encrypted with the private key');
	}, 20_000);

	it('should say when the message has been cut short', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const encrypted = await encryptMessage('A longer secret message. '.repeat(40), publicKey);
		const lines = must(encrypted.data).split('\n');
		const truncated = [...lines.slice(0, 6), ...lines.slice(-2)].join('\n');

		const result = await decryptMessage(truncated, privateKey, TEST_PASSPHRASE);
		expect(result.success).toBe(false);
		expect(result.error).toContain('incomplete or has been altered');
	}, 15_000);

	it('should treat a message that decrypts to nothing as a success', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const empty: unknown = await encrypt({
			message: await createMessage({ text: '' }),
			encryptionKeys: await readKey({ armoredKey: publicKey })
		});

		const result = await decryptMessage(String(empty), privateKey, TEST_PASSPHRASE);
		expect(result.success).toBe(true);
		expect(result.data).toBe('');
	}, 15_000);

	it('should report that a message carries a signature it did not verify', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const stranger = await generateKey({
			type: 'curve25519',
			userIDs: [{ name: 'Stranger', email: 'stranger@example.com' }],
			format: 'object'
		});
		const signed: unknown = await encrypt({
			message: await createMessage({ text: 'Signed by someone' }),
			encryptionKeys: await readKey({ armoredKey: publicKey }),
			signingKeys: stranger.privateKey
		});

		const result = await decryptMessage(String(signed), privateKey, TEST_PASSPHRASE);
		expect(result.success).toBe(true);
		expect(result.data).toBe('Signed by someone');
		expect(result.isSigned).toBe(true);
	}, 15_000);

	it('should accept a message and a key whose line breaks were lost', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const encrypted = await encryptMessage('Secret message', publicKey);

		const spaces = await decryptMessage(
			linesOf(must(encrypted.data)).join(' '),
			linesOf(privateKey).join(' '),
			TEST_PASSPHRASE
		);
		expect(spaces.data).toBe('Secret message');

		const nothing = await decryptMessage(
			linesOf(must(encrypted.data)).join(''),
			privateKey,
			TEST_PASSPHRASE
		);
		expect(nothing.data).toBe('Secret message');

		const noEmptyLine = await decryptMessage(
			linesOf(must(encrypted.data)).join('\n'),
			privateKey,
			TEST_PASSPHRASE
		);
		expect(noEmptyLine.data).toBe('Secret message');
	}, 15_000);

	it('should accept inputs that were indented or quoted in an email', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const encrypted = await encryptMessage('Secret', publicKey);
		const result = await decryptMessage(
			quote(must(encrypted.data)),
			quote(privateKey),
			TEST_PASSPHRASE
		);
		expect(result.data).toBe('Secret');
	}, 15_000);

	it('should say when the message is protected with a password instead of a key', async () => {
		const { privateKey } = await createTestKeyPair();
		const passwordOnly: unknown = await encrypt({
			message: await createMessage({ text: 'Secret' }),
			passwords: ['a shared password']
		});

		const result = await decryptMessage(String(passwordOnly), privateKey, TEST_PASSPHRASE);
		expect(result.success).toBe(false);
		expect(result.error).toBe(PASSWORD_ONLY_MESSAGE_ERROR);
		expect(result.errorField).toBe('encrypted');
	}, 15_000);

	it('should say when the message is signed but not encrypted', async () => {
		const { privateKey } = await createTestKeyPair();
		const signingKey = await decryptKey({
			privateKey: await readPrivateKey({ armoredKey: privateKey }),
			passphrase: TEST_PASSPHRASE
		});
		const signedOnly: unknown = await sign({
			message: await createMessage({ text: 'Public notice' }),
			signingKeys: signingKey
		});

		const result = await decryptMessage(String(signedOnly), privateKey, TEST_PASSPHRASE);
		expect(result.success).toBe(false);
		expect(result.error).toBe(NOT_ENCRYPTED_MESSAGE_ERROR);
		expect(result.errorField).toBe('encrypted');
	}, 15_000);

	it('should point to the Verify page for a message signed in cleartext', async () => {
		const { privateKey } = await createTestKeyPair();
		const signingKey = await decryptKey({
			privateKey: await readPrivateKey({ armoredKey: privateKey }),
			passphrase: TEST_PASSPHRASE
		});
		const cleartext = await sign({
			message: await createCleartextMessage({ text: 'Public notice' }),
			signingKeys: signingKey
		});

		const result = await decryptMessage(cleartext, privateKey, TEST_PASSPHRASE);
		expect(result.success).toBe(false);
		expect(result.error).toBe(SIGNED_NOT_ENCRYPTED_ERROR);
		expect(result.errorField).toBe('encrypted');
	}, 15_000);
});

/** Encrypts a text to a key, compressed first as other programs do by default */
async function compressedTo(publicKey: string, text: string): Promise<string> {
	const encrypted: unknown = await encrypt({
		message: await createMessage({ text }),
		encryptionKeys: await readKey({ armoredKey: publicKey }),
		config: { preferredCompressionAlgorithm: enums.compression.zlib }
	});
	return String(encrypted);
}

describe('decryptMessage, on a message that unpacks to far more than it weighs', () => {
	it('should refuse one that passes the limit, and name the message as the cause', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const bomb = await compressedTo(publicKey, 'A'.repeat(MAX_UNPACKED_MESSAGE_BYTES + 1_000_000));
		// A few dozen kilobytes as sent
		expect(bomb.length).toBeLessThan(100_000);

		const result = await decryptMessage(bomb, privateKey, TEST_PASSPHRASE);
		expect(result.success).toBe(false);
		expect(result.error).toBe(OVERSIZED_MESSAGE_ERROR);
		expect(result.errorField).toBe('encrypted');
		expect(result.data).toBeUndefined();
	}, 30_000);

	it('should refuse it quickly, before the text is unpacked in full', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const bomb = await compressedTo(publicKey, 'A'.repeat(MAX_UNPACKED_MESSAGE_BYTES * 8));

		const start = performance.now();
		const result = await decryptMessage(bomb, privateKey, TEST_PASSPHRASE);
		expect(result.error).toBe(OVERSIZED_MESSAGE_ERROR);
		expect(performance.now() - start).toBeLessThan(5000);
	}, 60_000);

	it('should still open a compressed message of ordinary size', async () => {
		const { publicKey, privateKey } = await createTestKeyPair();
		const text = 'A line of an ordinary message.\n'.repeat(30_000);
		const compressed = await compressedTo(publicKey, text);
		expect(compressed.length).toBeLessThan(text.length / 10);

		const result = await decryptMessage(compressed, privateKey, TEST_PASSPHRASE);
		expect(result.success).toBe(true);
		expect(result.data).toBe(text);
	}, 30_000);
});
