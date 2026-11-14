import { describe, it, expect, beforeAll } from 'vitest';
import { deflateSync } from 'node:zlib';
import {
	generateKey,
	reformatKey,
	revokeKey,
	readPrivateKey,
	readKey,
	sign,
	createMessage,
	createCleartextMessage,
	armor,
	enums
} from 'openpgp';
import {
	signMessage,
	verifyMessage,
	SIGNING_PASSPHRASE_REQUIRED_ERROR,
	PRIVATE_KEY_AS_SENDER_ERROR,
	ENCRYPTED_NOT_SIGNED_ERROR,
	DETACHED_SIGNATURE_ERROR,
	WEAK_SIGNING_KEY_DETAIL,
	FUTURE_SIGNATURE_DETAIL,
	REISSUED_KEY_DETAIL
} from './signatures.ts';
import { OVERSIZED_MESSAGE_ERROR, WEAK_SIGNING_KEY_ERROR } from './errors.ts';
import { MAX_UNPACKED_MESSAGE_BYTES } from './constants.ts';
import { encryptMessage } from './encryption.ts';
import { decryptMessage } from './decryption.ts';
import {
	inspectKeys,
	PUBLIC_KEY_AS_SIGNER_PROBLEM,
	PUBLIC_KEY_AS_READER_PROBLEM,
	PRIVATE_KEY_AS_SENDER_PROBLEM,
	WEAK_KEY_PROBLEM,
	WEAK_VERIFYING_KEY_PROBLEM
} from './keys.ts';
import { must } from './testing.ts';

const PASSPHRASE = 'testpassphrase';

async function createKeyPair(name: string, passphrase: string | null = PASSPHRASE) {
	return generateKey({
		type: 'ecc',
		curve: 'curve25519Legacy',
		userIDs: [{ name, email: `${name.toLowerCase()}@example.com` }],
		passphrase: passphrase ?? undefined,
		format: 'armored'
	});
}

type KeyPair = Awaited<ReturnType<typeof createKeyPair>>;
let alice: KeyPair;
let bob: KeyPair;
let mallory: KeyPair;

beforeAll(async () => {
	[alice, bob, mallory] = await Promise.all([
		createKeyPair('Alice'),
		createKeyPair('Bob'),
		createKeyPair('Mallory')
	]);
}, 30_000);

describe('signMessage', () => {
	it('should produce a readable message with a signature underneath', async () => {
		const result = await signMessage('Meet at noon.', alice.privateKey, PASSPHRASE);
		expect(result.success).toBe(true);
		expect(result.data).toContain('-----BEGIN PGP SIGNED MESSAGE-----');
		expect(result.data).toContain('Meet at noon.');
		expect(result.data).toContain('-----END PGP SIGNATURE-----');
		expect(result.signer?.userIDs[0]).toContain('Alice');
	}, 15_000);

	it('should use one kind of line ending throughout the signed message', async () => {
		const result = await signMessage('one\ntwo\r\nthree', alice.privateKey, PASSPHRASE);
		expect(result.data).not.toContain('\r');
		const checked = await verifyMessage(must(result.data), alice.publicKey);
		expect(must(checked.signatures)[0].status).toBe('valid');
	}, 15_000);

	it('should ask for the passphrase when a protected key is used without one', async () => {
		const result = await signMessage('Hello', alice.privateKey, '');
		expect(result.success).toBe(false);
		expect(result.error).toBe(SIGNING_PASSPHRASE_REQUIRED_ERROR);
	}, 15_000);

	it('should say when the passphrase is wrong', async () => {
		const result = await signMessage('Hello', alice.privateKey, 'wrongpassphrase');
		expect(result.success).toBe(false);
		expect(result.error).toContain('Incorrect passphrase');
	}, 15_000);

	it('should sign with a key that has no passphrase', async () => {
		const open = await createKeyPair('Open', null);
		const result = await signMessage('Hello', open.privateKey, '');
		expect(result.success).toBe(true);
	}, 15_000);

	it('should say when a public key is pasted instead of a private key', async () => {
		const result = await signMessage('Hello', alice.publicKey, PASSPHRASE);
		expect(result.success).toBe(false);
		expect(result.error).toContain('private key');
		expect(result.error).not.toContain('recipient');
	}, 15_000);

	it('should find the private key in the "both keys" download from the generate page', async () => {
		const result = await signMessage(
			'Hello',
			`${alice.publicKey}\n${alice.privateKey}`,
			PASSPHRASE
		);
		expect(result.success).toBe(true);
	}, 15_000);

	it('should explain that an expired key can no longer sign', async () => {
		const expired = await generateKey({
			type: 'ecc',
			curve: 'curve25519Legacy',
			userIDs: [{ name: 'Expired' }],
			keyExpirationTime: 86_400,
			date: new Date(Date.now() - 10 * 86_400e3),
			format: 'armored'
		});
		const result = await signMessage('Hello', expired.privateKey, '');
		expect(result.success).toBe(false);
		expect(result.error).toContain('expired');
		expect(result.error).not.toContain('Error signing message');
	}, 15_000);
});

describe('verifyMessage', () => {
	it('should confirm a signature made by the supplied key', async () => {
		const signed = await signMessage('Meet at noon.', alice.privateKey, PASSPHRASE);
		const result = await verifyMessage(must(signed.data), alice.publicKey);

		expect(result.success).toBe(true);
		expect(result.data).toBe('Meet at noon.');
		expect(result.signatures).toHaveLength(1);
		expect(must(result.signatures)[0].status).toBe('valid');
		expect(must(result.signatures)[0].signer?.userIDs[0]).toContain('Alice');
		expect(must(result.signatures)[0].signedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/);
	}, 15_000);

	it('should reject a message that was changed after signing', async () => {
		const signed = await signMessage('Pay Bob 10 pounds.', alice.privateKey, PASSPHRASE);
		const result = await verifyMessage(
			must(signed.data).replace('10 pounds', '1000 pounds'),
			alice.publicKey
		);

		expect(result.success).toBe(true);
		expect(must(result.signatures)[0].status).toBe('invalid');
		// The signature still names the key it claims to come from
		expect(must(result.signatures)[0].signer?.userIDs[0]).toContain('Alice');
	}, 15_000);

	it('should say when the signature was made by a key that was not supplied', async () => {
		const signed = await signMessage('Hello', alice.privateKey, PASSPHRASE);
		const result = await verifyMessage(must(signed.data), mallory.publicKey);

		expect(must(result.signatures)[0].status).toBe('unknown-key');
		expect(must(result.signatures)[0].signer).toBeUndefined();
		expect(must(result.signatures)[0].keyID).toMatch(/^[0-9A-F]{16}$/);
	}, 15_000);

	it('should find the right key among several', async () => {
		const signed = await signMessage('Hello', alice.privateKey, PASSPHRASE);
		const result = await verifyMessage(
			must(signed.data),
			`${mallory.publicKey}\n${alice.publicKey}`
		);
		expect(must(result.signatures)[0].status).toBe('valid');
		expect(must(result.signatures)[0].signer?.userIDs[0]).toContain('Alice');
	}, 15_000);

	it('should keep indentation and leading dashes exactly as they were signed', async () => {
		const text = 'List:\n  - indented item\n- dash at the start\n> quoted line';
		const signed = await signMessage(text, alice.privateKey, PASSPHRASE);
		const result = await verifyMessage(must(signed.data), alice.publicKey);
		expect(must(result.signatures)[0].status).toBe('valid');
		expect(result.data).toBe(text);
	}, 15_000);

	it('should accept Windows line endings', async () => {
		const signed = await signMessage('one\ntwo', alice.privateKey, PASSPHRASE);
		const result = await verifyMessage(must(signed.data).replaceAll('\n', '\r\n'), alice.publicKey);
		expect(must(result.signatures)[0].status).toBe('valid');
	}, 15_000);

	it('should accept a signed message that was quoted in an email', async () => {
		const signed = await signMessage('one\ntwo', alice.privateKey, PASSPHRASE);
		const quoted = must(signed.data)
			.split('\n')
			.map((line) => `> ${line}`)
			.join('\n');
		const result = await verifyMessage(quoted, alice.publicKey);
		expect(result.success).toBe(true);
		expect(must(result.signatures)[0].status).toBe('valid');
	}, 15_000);

	it('should verify a signed message that is not in cleartext form', async () => {
		const privateKey = await readPrivateKey({
			armoredKey: (await createKeyPair('Opaque', null)).privateKey
		});
		const opaque: unknown = await sign({
			message: await createMessage({ text: 'Opaque text' }),
			signingKeys: privateKey
		});
		const result = await verifyMessage(String(opaque), privateKey.toPublic().armor());
		expect(result.data).toBe('Opaque text');
		expect(must(result.signatures)[0].status).toBe('valid');
	}, 15_000);

	it('should not trust a signature from a revoked key', async () => {
		const pair = await createKeyPair('Revoked', null);
		const signed = await signMessage('Hello', pair.privateKey, '');
		const revoked = await revokeKey({
			key: await readPrivateKey({ armoredKey: pair.privateKey }),
			format: 'armored'
		});
		const result = await verifyMessage(must(signed.data), revoked.publicKey);
		expect(must(result.signatures)[0].status).toBe('untrusted');
		expect(must(result.signatures)[0].detail).toContain('revoked');
	}, 15_000);

	it('should not trust a signature dated in the future', async () => {
		const pair = await createKeyPair('Future', null);
		const signed = await sign({
			message: await createCleartextMessage({ text: 'Hello' }),
			signingKeys: await readPrivateKey({ armoredKey: pair.privateKey }),
			date: new Date(Date.now() + 86_400e3)
		});
		const result = await verifyMessage(signed, pair.publicKey);
		expect(must(result.signatures)[0].status).toBe('untrusted');
		expect(must(result.signatures)[0].detail).toBe(FUTURE_SIGNATURE_DETAIL);
	}, 15_000);

	it('should not blame the clock when the key was re-issued after the message was signed', async () => {
		const day = 86_400e3;
		const { privateKey } = await generateKey({
			type: 'ecc',
			curve: 'curve25519Legacy',
			userIDs: [{ name: 'Reissued' }],
			format: 'object',
			date: new Date(Date.now() - 3 * day)
		});
		const signed = await sign({
			message: await createCleartextMessage({ text: 'Signed two days ago' }),
			signingKeys: privateKey,
			date: new Date(Date.now() - 2 * day)
		});
		// Yesterday the owner changed the key with a tool that keeps only the newest record of it
		const reissued = await reformatKey({
			privateKey,
			userIDs: [{ name: 'Reissued' }],
			format: 'armored',
			date: new Date(Date.now() - day)
		});

		const againstOldCopy = await verifyMessage(signed, privateKey.toPublic().armor());
		expect(must(againstOldCopy.signatures)[0].status).toBe('valid');

		const againstNewCopy = await verifyMessage(signed, reissued.publicKey);
		expect(must(againstNewCopy.signatures)[0].status).toBe('untrusted');
		expect(must(againstNewCopy.signatures)[0].detail).toBe(REISSUED_KEY_DETAIL);
		expect(must(againstNewCopy.signatures)[0].detail).not.toContain('clock');
	}, 15_000);

	it('should accept a signature made before its key expired', async () => {
		const created = new Date(Date.now() - 10 * 86_400e3);
		const expired = await generateKey({
			type: 'ecc',
			curve: 'curve25519Legacy',
			userIDs: [{ name: 'Expired' }],
			keyExpirationTime: 86_400,
			date: created,
			format: 'armored'
		});
		const signed = await sign({
			message: await createCleartextMessage({ text: 'Hello' }),
			signingKeys: await readPrivateKey({ armoredKey: expired.privateKey }),
			date: new Date(created.getTime() + 1000)
		});
		const result = await verifyMessage(signed, expired.publicKey);
		expect(must(result.signatures)[0].status).toBe('valid');
		// The key's details still warn that it has expired since
		expect(must(result.signatures)[0].signer?.problem).toContain('expired');
	}, 15_000);

	it('should refuse a private key instead of quietly using it', async () => {
		const signed = await signMessage('Hello', alice.privateKey, PASSPHRASE);
		const result = await verifyMessage(must(signed.data), alice.privateKey);
		expect(result.success).toBe(false);
		expect(result.error).toBe(PRIVATE_KEY_AS_SENDER_ERROR);
	}, 15_000);

	it('should say when the text is not a signed message', async () => {
		const result = await verifyMessage('just some text', alice.publicKey);
		expect(result.success).toBe(false);
		expect(result.error).toContain('signed PGP message');
	}, 15_000);

	it('should point to the Decrypt page for an encrypted message', async () => {
		const encrypted = await encryptMessage('Secret', bob.publicKey);
		const result = await verifyMessage(must(encrypted.data), alice.publicKey);
		expect(result.success).toBe(false);
		expect(result.error).toBe(ENCRYPTED_NOT_SIGNED_ERROR);
	}, 15_000);

	it('should say when a signature has no text with it', async () => {
		const key = await readPrivateKey({
			armoredKey: (await createKeyPair('Detached', null)).privateKey
		});
		const detached: unknown = await sign({
			message: await createMessage({ text: 'a file' }),
			signingKeys: key,
			detached: true
		});

		const result = await verifyMessage(String(detached), alice.publicKey);
		expect(result.success).toBe(false);
		expect(result.error).toBe(DETACHED_SIGNATURE_ERROR);
		expect(result.errorField).toBe('signedMessage');
	}, 15_000);

	it("should name the sender's key, not the recipient's, when the key is unreadable", async () => {
		const signed = await signMessage('Hello', alice.privateKey, PASSPHRASE);
		const result = await verifyMessage(must(signed.data), must(signed.data));
		expect(result.success).toBe(false);
		expect(result.error).not.toContain('recipient');
		expect(result.error).toContain('public key');
	}, 15_000);
});

describe('signing while encrypting', () => {
	it('should sign the message and let the recipient confirm the sender', async () => {
		const encrypted = await encryptMessage('Signed secret', bob.publicKey, {
			armoredPrivateKey: alice.privateKey,
			passphrase: PASSPHRASE
		});
		expect(encrypted.success).toBe(true);
		expect(encrypted.signer?.userIDs[0]).toContain('Alice');

		const result = await decryptMessage(
			must(encrypted.data),
			bob.privateKey,
			PASSPHRASE,
			alice.publicKey
		);
		expect(result.success).toBe(true);
		expect(result.data).toBe('Signed secret');
		expect(result.signatures).toHaveLength(1);
		expect(must(result.signatures)[0].status).toBe('valid');
		expect(must(result.signatures)[0].signer?.userIDs[0]).toContain('Alice');
	}, 15_000);

	it('should report a signature it was given no key for as unchecked, not as valid', async () => {
		const encrypted = await encryptMessage('Signed secret', bob.publicKey, {
			armoredPrivateKey: alice.privateKey,
			passphrase: PASSPHRASE
		});
		const result = await decryptMessage(must(encrypted.data), bob.privateKey, PASSPHRASE);
		expect(result.isSigned).toBe(true);
		expect(must(result.signatures)[0].status).toBe('unknown-key');
	}, 15_000);

	it('should not accept a signature from someone other than the claimed sender', async () => {
		const encrypted = await encryptMessage('From Alice, honest', bob.publicKey, {
			armoredPrivateKey: mallory.privateKey,
			passphrase: PASSPHRASE
		});
		const result = await decryptMessage(
			must(encrypted.data),
			bob.privateKey,
			PASSPHRASE,
			alice.publicKey
		);
		expect(result.success).toBe(true);
		expect(must(result.signatures)[0].status).toBe('unknown-key');
	}, 15_000);

	it('should report an unsigned message as carrying no signatures', async () => {
		const encrypted = await encryptMessage('Unsigned', bob.publicKey);
		expect(encrypted.signer).toBeUndefined();
		const result = await decryptMessage(
			must(encrypted.data),
			bob.privateKey,
			PASSPHRASE,
			alice.publicKey
		);
		expect(result.isSigned).toBe(false);
		expect(result.signatures).toEqual([]);
	}, 15_000);

	it('should ask for the signing passphrase, not blame the recipient key', async () => {
		const result = await encryptMessage('Hello', bob.publicKey, {
			armoredPrivateKey: alice.privateKey,
			passphrase: ''
		});
		expect(result.success).toBe(false);
		expect(result.error).toBe(SIGNING_PASSPHRASE_REQUIRED_ERROR);
	}, 15_000);

	it('should say when the signing key box holds a public key', async () => {
		const result = await encryptMessage('Hello', bob.publicKey, {
			armoredPrivateKey: alice.publicKey,
			passphrase: ''
		});
		expect(result.success).toBe(false);
		expect(result.error).toContain('private key');
		expect(result.error).not.toContain('recipient');
	}, 15_000);

	it("should refuse a private key in the sender's key box when decrypting", async () => {
		const encrypted = await encryptMessage('Hello', bob.publicKey);
		const result = await decryptMessage(
			must(encrypted.data),
			bob.privateKey,
			PASSPHRASE,
			alice.privateKey
		);
		expect(result.success).toBe(false);
		expect(result.error).toBe(PRIVATE_KEY_AS_SENDER_ERROR);
	}, 15_000);

	it("should still decrypt when the sender's key box holds something unreadable, and say which box is wrong", async () => {
		const encrypted = await encryptMessage('Hello', bob.publicKey);
		const result = await decryptMessage(
			must(encrypted.data),
			bob.privateKey,
			PASSPHRASE,
			'not a key'
		);
		expect(result.success).toBe(false);
		expect(result.error).toContain('public key');
		expect(result.error).not.toContain('private key appears');
	}, 15_000);
});

describe('inspectKeys', () => {
	it('should accept a private key for signing and flag a public one', async () => {
		const [own] = await inspectKeys(alice.privateKey, 'sign');
		expect(own.problem).toBeUndefined();
		expect(own.userIDs[0]).toContain('Alice');

		const [wrong] = await inspectKeys(alice.publicKey, 'sign');
		expect(wrong.problem).toBe(PUBLIC_KEY_AS_SIGNER_PROBLEM);
	}, 15_000);

	it('should accept a private key for decrypting and flag a public one', async () => {
		const [own] = await inspectKeys(alice.privateKey, 'decrypt');
		expect(own.problem).toBeUndefined();
		expect(own.isPrivate).toBe(true);

		const [wrong] = await inspectKeys(alice.publicKey, 'decrypt');
		expect(wrong.problem).toBe(PUBLIC_KEY_AS_READER_PROBLEM);
	}, 15_000);

	it('should read the private key out of the "both keys" file for decrypting', async () => {
		const infos = await inspectKeys(`${alice.publicKey}\n${alice.privateKey}`, 'decrypt');
		expect(infos).toHaveLength(1);
		expect(infos[0].isPrivate).toBe(true);
	}, 15_000);

	it('should read the private key out of the "both keys" file for signing', async () => {
		const infos = await inspectKeys(`${alice.publicKey}\n${alice.privateKey}`, 'sign');
		expect(infos).toHaveLength(1);
		expect(infos[0].isPrivate).toBe(true);
	}, 15_000);

	it('should accept a public key for checking and flag a private one', async () => {
		const [sender] = await inspectKeys(alice.publicKey, 'verify');
		expect(sender.problem).toBeUndefined();

		const [wrong] = await inspectKeys(alice.privateKey, 'verify');
		expect(wrong.problem).toBe(PRIVATE_KEY_AS_SENDER_PROBLEM);
	}, 15_000);

	it('should flag a revoked key offered for checking', async () => {
		const pair = await createKeyPair('Revoked', null);
		const revoked = await revokeKey({
			key: (await readKey({ armoredKey: pair.privateKey })) as never,
			format: 'armored'
		});
		const [info] = await inspectKeys(revoked.publicKey, 'verify');
		expect(info.problem).toContain('revoked');
	}, 15_000);
});

// Keys of a kind the library no longer accepts: DSA, ElGamal, and RSA under 2048 bits.
// It will only make one when told the limit is lower.
describe('an old kind of key', () => {
	const allowWeak = { minRSABits: 1024 };
	let weak: { publicKey: string; privateKey: string };

	beforeAll(async () => {
		weak = await generateKey({
			type: 'rsa',
			rsaBits: 1024,
			userIDs: [{ name: 'Old Timer', email: 'old@example.com' }],
			format: 'armored',
			config: allowWeak
		});
	}, 30_000);

	it('should not call an honest signature altered because its key is of an old kind', async () => {
		const signed = await sign({
			message: await createCleartextMessage({ text: 'Signed years ago.' }),
			signingKeys: await readPrivateKey({ armoredKey: weak.privateKey }),
			config: allowWeak
		});

		const result = await verifyMessage(signed, weak.publicKey);
		expect(result.success).toBe(true);
		expect(result.data).toBe('Signed years ago.');
		expect(result.signatures).toHaveLength(1);
		// "invalid" would say the message was changed or forged, which nothing here shows
		expect(must(result.signatures)[0].status).toBe('untrusted');
		expect(must(result.signatures)[0].detail).toBe(WEAK_SIGNING_KEY_DETAIL);
	}, 15_000);

	it('should warn about the key before anything is checked against it', async () => {
		const [forChecking] = await inspectKeys(weak.publicKey, 'verify');
		expect(forChecking.algorithm).toBe('RSA 1024');
		expect(forChecking.problem).toBe(WEAK_VERIFYING_KEY_PROBLEM);

		const [forEncrypting] = await inspectKeys(weak.publicKey, 'encrypt');
		expect(forEncrypting.problem).toBe(WEAK_KEY_PROBLEM);

		const [forSigning] = await inspectKeys(weak.privateKey, 'sign');
		expect(forSigning.problem).toBe(WEAK_KEY_PROBLEM);
	}, 15_000);

	it('should explain why it will not sign with one', async () => {
		const result = await signMessage('Hello', weak.privateKey, '');
		expect(result.success).toBe(false);
		expect(result.error).toBe(WEAK_SIGNING_KEY_ERROR);
		expect(result.errorField).toBe('privateKey');
	}, 15_000);
});

// The packet types of the OpenPGP format that the message below is made of
const COMPRESSED_DATA_PACKET = 8;
const LITERAL_DATA_PACKET = 11;

/** One packet in the format's newer framing: its type, a five-byte length, then its contents */
function packetOf(type: number, contents: Buffer): Buffer {
	const header = Buffer.alloc(6);
	header.writeUInt8(0xc0 + type, 0);
	header.writeUInt8(0xff, 1);
	header.writeUInt32BE(contents.length, 2);
	return Buffer.concat([header, contents]);
}

/**
 * A compressed message written out by hand, as anyone could write one: text in
 * a literal packet, deflated inside a compressed packet. Nothing is signed.
 */
function compressedMessageOf(messageText: string): string {
	// "u" for UTF-8 text, no file name, no date
	const preamble = Buffer.from([0x75, 0, 0, 0, 0, 0]);
	const literal = packetOf(
		LITERAL_DATA_PACKET,
		Buffer.concat([preamble, Buffer.from(messageText)])
	);
	const zlib = Buffer.from([enums.compression.zlib]);
	const compressed = packetOf(COMPRESSED_DATA_PACKET, Buffer.concat([zlib, deflateSync(literal)]));
	return armor(enums.armor.message, compressed);
}

describe('verifyMessage, on a message that unpacks to far more than it weighs', () => {
	it('should refuse it, and name the message as the cause', async () => {
		const bomb = compressedMessageOf('A'.repeat(MAX_UNPACKED_MESSAGE_BYTES + 1_000_000));
		// A few dozen kilobytes as sent
		expect(bomb.length).toBeLessThan(100_000);

		const result = await verifyMessage(bomb, alice.publicKey);
		expect(result.success).toBe(false);
		expect(result.error).toBe(OVERSIZED_MESSAGE_ERROR);
		expect(result.errorField).toBe('signedMessage');
	}, 30_000);

	it('should read a compressed message of ordinary size, and find it unsigned', async () => {
		const result = await verifyMessage(compressedMessageOf('Hello there.'), alice.publicKey);
		expect(result.success).toBe(true);
		expect(result.data).toBe('Hello there.');
		expect(result.signatures).toHaveLength(0);
	}, 15_000);
});
