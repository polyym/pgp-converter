import { describe, it, expect, beforeAll } from 'vitest';
import { deflateSync } from 'node:zlib';
import {
	generateKey,
	reformatKey,
	revokeKey,
	readPrivateKey,
	readKey,
	decryptKey,
	encryptKey,
	sign,
	createMessage,
	createCleartextMessage,
	armor,
	enums,
	SecretKeyPacket
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
	REISSUED_KEY_DETAIL,
	UNFIT_SIGNING_KEY_DETAIL
} from './signatures.ts';
import { OVERSIZED_MESSAGE_ERROR, WEAK_SIGNING_KEY_ERROR } from './errors.ts';
import { KEY_USE_SETTINGS, MAX_UNPACKED_MESSAGE_BYTES } from './constants.ts';
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
import { makeKeyWithoutFlags, must, withKeyFlags, type ArmoredKeyPair } from './testing.ts';

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

/** The text as an email program quotes it */
function quote(text: string): string {
	return text
		.split('\n')
		.map((line) => `> ${line}`)
		.join('\n');
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

describe('verifyMessage, when the box holds more than the message', () => {
	const LINE_SEPARATOR = String.fromCodePoint(0x20_28);
	const ADDED = 'Pay Mallory 1000.';
	let signed: string;
	let inlineSigned: string;

	beforeAll(async () => {
		signed = must((await signMessage('Pay Alice 10.', alice.privateKey, PASSPHRASE)).data).trim();
		const armored: unknown = await sign({
			message: await createMessage({ text: 'Pay Alice 10.' }),
			signingKeys: await decryptKey({
				privateKey: await readPrivateKey({ armoredKey: alice.privateKey }),
				passphrase: PASSPHRASE
			})
		});
		inlineSigned = String(armored).replaceAll('\r\n', '\n').trim();
	}, 15_000);

	it('should say so, and hand back only the text that was signed', async () => {
		const pasted = `Pay Mallory 1000 first.\n\n${signed}\nP.S. And again.`;
		const result = await verifyMessage(pasted, alice.publicKey);
		expect(must(result.signatures)[0].status).toBe('valid');
		expect(result.data).toBe('Pay Alice 10.');
		expect(result.hasOtherText).toBe(true);
	}, 15_000);

	it('should not say so for a message that stands alone, however it was pasted', async () => {
		const pastings = {
			'with empty lines around it': `\n${signed}\n\n`,
			'with Windows line endings': signed.replaceAll('\n', '\r\n'),
			'with spaces at the end of each line': signed.replaceAll('\n', '  \n'),
			'quoted by an email program': quote(signed),
			indented: signed.replaceAll(/^/gm, ' '.repeat(4)),
			'in a PGP MESSAGE block': inlineSigned,
			'in a block whose line breaks became spaces': inlineSigned.replaceAll('\n', ' '),
			'in a block whose line breaks were lost': inlineSigned.replaceAll('\n', '')
		};
		await Promise.all(
			Object.entries(pastings).map(async ([name, pasted]) => {
				const result = await verifyMessage(pasted, alice.publicKey);
				expect(must(result.signatures)[0].status, name).toBe('valid');
				expect(result.hasOtherText, name).toBe(false);
			})
		);
	}, 30_000);

	it('should judge the message as pasted when that is how the library read it', async () => {
		// Cleaned up, the quoted line would read as the start of the signature
		const text = ['You wrote:', '> -----BEGIN PGP SIGNATURE-----', 'and I agree.'].join('\n');
		const quoting = must((await signMessage(text, alice.privateKey, PASSPHRASE)).data);
		const result = await verifyMessage(quoting, alice.publicKey);
		expect(must(result.signatures)[0].status).toBe('valid');
		expect(result.hasOtherText).toBe(false);
	}, 15_000);

	it('should say so for a message quoted in an email under a line of its own', async () => {
		const result = await verifyMessage(`On Monday Alice wrote:\n${quote(signed)}`, alice.publicKey);
		expect(must(result.signatures)[0].status).toBe('valid');
		expect(result.hasOtherText).toBe(true);
	}, 15_000);

	it('should say so for words after the data of a block that the app had to lay out again', async () => {
		const lines = inlineSigned.split('\n');
		const data = lines
			.slice(2, -1)
			.filter((line) => !line.startsWith('='))
			.join('\n')
			.replace(/=+$/, '');
		// No empty line under the first line, so the block is laid out again and every
		// word becomes a line. The library reads nothing after the one "=".
		const pasted = [
			lines[0],
			`${data}=`,
			'Please send 4500 EUR to the new account',
			lines.at(-1)
		].join('\n');
		const result = await verifyMessage(pasted, alice.publicKey);
		expect(must(result.signatures)[0].status).toBe('valid');
		expect(result.data).toBe('Pay Alice 10.');
		expect(result.hasOtherText).toBe(true);
	}, 15_000);

	it('should say so for a sentence built to be a packet that the library skips', async () => {
		// "sEND" opens a packet of a kind the library passes over, 67 bytes long: these
		// 92 characters. It can only follow data that needs no padding, so sign until it does.
		const sentence =
			'sEND 4500 EUR to the new account DE00 1234 5678 9012 before Friday or the deal is off and tell nobody thanks Alice';
		expect(sentence.replaceAll(' ', '')).toHaveLength(92);
		const key = await decryptKey({
			privateKey: await readPrivateKey({ armoredKey: alice.privateKey }),
			passphrase: PASSPHRASE
		});
		let lines: string[] = [];
		for (
			let extra = 0;
			extra < 40 && (lines.length === 0 || lines.join('').includes('='));
			extra++
		) {
			const text = `Pay Alice 10.${'!'.repeat(extra)}`;
			const armored: unknown = await sign({
				message: await createMessage({ text }),
				signingKeys: key
			});
			lines = String(armored)
				.replaceAll('\r\n', '\n')
				.trim()
				.split('\n')
				.filter((line) => line !== '' && !line.startsWith('='));
		}
		const pasted = [...lines.slice(0, -1), sentence, lines.at(-1)].join('\n');

		const result = await verifyMessage(pasted, alice.publicKey);
		expect(must(result.signatures)[0].status).toBe('valid');
		expect(result.hasOtherText).toBe(true);
	}, 30_000);

	it('should say so for paragraphs under a header name that stands alone', async () => {
		const lines = inlineSigned.split('\n');
		const pasted = [lines[0], 'Comment:', '', 'Pay Mallory 1000.', '', ...lines.slice(2)].join(
			'\n'
		);
		const result = await verifyMessage(pasted, alice.publicKey);
		expect(must(result.signatures)[0].status).toBe('valid');
		expect(result.data).toBe('Pay Alice 10.');
		expect(result.hasOtherText).toBe(true);
	}, 15_000);

	// Each of these adds text in a place that OpenPGP.js passes over without a
	// word. The signature has to come out valid, or the case would show nothing.
	it('should say so wherever the library passes text over', async () => {
		const lines = signed.split('\n');
		const last = lines.length - 1;
		const signatureStart = lines.indexOf('-----BEGIN PGP SIGNATURE-----');
		const pastings = {
			'two lines of dashes for the last line': [...lines.slice(0, last), '-----', '-----', ADDED],
			'dashes around the text for the last line': [
				...lines.slice(0, last),
				'-----',
				ADDED,
				'-----'
			],
			'text after a line separator': lines.with(last, `${lines[last]}${LINE_SEPARATOR}${ADDED}`),
			'text before a line separator': lines.with(0, `${ADDED}${LINE_SEPARATOR}${lines[0]}`),
			'a signature that opens under another name': lines.with(signatureStart, `-----${ADDED}-----`),
			'a header line of no known kind': lines.toSpliced(signatureStart + 1, 0, `Note: ${ADDED}`),
			'text between the checksum and the last line': lines.toSpliced(last, 0, ADDED),
			'a second message': [...lines, ...lines],
			// The library ends the signed text at the first of these lines and reads the
			// true signature under it. The block further down is never looked at.
			'a line of dashes after a line separator, with a block of no worth below': [
				...lines.slice(0, signatureStart),
				`${ADDED}${LINE_SEPARATOR}-----X-----`,
				...lines.slice(signatureStart + 1, last),
				'-----BEGIN PGP SIGNATURE-----',
				'',
				'abcd',
				lines[last]
			]
		};
		await Promise.all(
			Object.entries(pastings).map(async ([name, pasted]) => {
				const result = await verifyMessage(pasted.join('\n'), alice.publicKey);
				expect(must(result.signatures)[0].status, name).toBe('valid');
				expect(result.data, name).toBe('Pay Alice 10.');
				expect(result.hasOtherText, name).toBe(true);
			})
		);
	}, 30_000);
});

describe('a key that does not say what it may be used for', () => {
	let old: ArmoredKeyPair;

	beforeAll(async () => {
		old = await makeKeyWithoutFlags('Old Key');
	}, 15_000);

	it('should be refused for everything by the library left to itself', async () => {
		// Shows that the key really has no flags, which the tests below depend on
		const key = await readKey({ armoredKey: old.publicKey });
		await expect(key.getSigningKey()).rejects.toThrow(/None of the key flags is set/);
		await expect(key.getEncryptionKey()).rejects.toThrow(/None of the key flags is set/);
	}, 15_000);

	it('should sign, and have its signature confirmed', async () => {
		const signed = await signMessage('Hello', old.privateKey, '');
		expect(signed.success).toBe(true);
		const checked = await verifyMessage(must(signed.data), old.publicKey);
		expect(must(checked.signatures)[0].status).toBe('valid');
	}, 15_000);

	it('should have its signature inside a PGP MESSAGE block confirmed', async () => {
		const signed: unknown = await sign({
			message: await createMessage({ text: 'Hello' }),
			signingKeys: await readPrivateKey({ armoredKey: old.privateKey }),
			config: KEY_USE_SETTINGS
		});
		const checked = await verifyMessage(String(signed), old.publicKey);
		expect(checked.data).toBe('Hello');
		expect(must(checked.signatures)[0].status).toBe('valid');
	}, 15_000);

	it('should encrypt and sign in one step, and decrypt with the signature confirmed', async () => {
		const encrypted = await encryptMessage('Hello', old.publicKey, {
			armoredPrivateKey: old.privateKey,
			passphrase: ''
		});
		expect(encrypted.success).toBe(true);
		const decrypted = await decryptMessage(must(encrypted.data), old.privateKey, '', old.publicKey);
		expect(decrypted.data).toBe('Hello');
		expect(must(decrypted.signatures)[0].status).toBe('valid');
	}, 15_000);

	it('should unlock with its passphrase when its main part is kept elsewhere', async () => {
		const encrypted = await encryptMessage('Hello', old.publicKey);
		const key = await readPrivateKey({ armoredKey: old.privateKey });
		const primary = key.keyPacket;
		if (!(primary instanceof SecretKeyPacket)) {
			throw new TypeError('Expected a secret key packet');
		}
		// As GnuPG exports a key whose main part stays on another device
		primary.makeDummy();
		const locked = await encryptKey({ privateKey: key, passphrase: PASSPHRASE });

		const result = await decryptMessage(must(encrypted.data), locked.armor(), PASSPHRASE);
		expect(result.data).toBe('Hello');
	}, 15_000);

	it('should be shown with no warning, whatever it is pasted for', async () => {
		const [toSign, toCheck, toEncrypt] = await Promise.all([
			inspectKeys(old.privateKey, 'sign'),
			inspectKeys(old.publicKey, 'verify'),
			inspectKeys(old.publicKey, 'encrypt')
		]);
		expect(toSign[0].problem).toBeUndefined();
		expect(toCheck[0].problem).toBeUndefined();
		expect(toEncrypt[0].problem).toBeUndefined();
	}, 15_000);
});

describe('a key that does say what it may be used for', () => {
	it('should not be encrypted to when it was made for signing', async () => {
		// RSA, whose algorithm could encrypt: only the flags stand in the way
		const signingOnly = await generateKey({
			type: 'rsa',
			rsaBits: 2048,
			userIDs: [{ name: 'Signing Only' }],
			subkeys: [{ sign: true }],
			format: 'armored'
		});
		const result = await encryptMessage('Hello', signingOnly.publicKey);
		expect(result.success).toBe(false);
		expect((await inspectKeys(signingOnly.publicKey, 'encrypt'))[0].problem).toBe(
			'This key cannot be used for encryption.'
		);
	}, 60_000);

	it('should not sign, or have a signature confirmed, when it says it is not for signing', async () => {
		const made = await createKeyPair('Carol', null);
		const signed = must((await signMessage('Hello', made.privateKey, '')).data);
		// The same key, saying now that its main part only certifies
		const certifyOnly = await withKeyFlags(made.privateKey, {
			primary: enums.keyFlags.certifyKeys,
			subkey: enums.keyFlags.encryptCommunication | enums.keyFlags.encryptStorage
		});

		const checked = await verifyMessage(signed, certifyOnly.publicKey);
		expect(must(checked.signatures)[0].status).toBe('untrusted');
		expect(must(checked.signatures)[0].detail).toBe(UNFIT_SIGNING_KEY_DETAIL);

		const refused = await signMessage('Hello', certifyOnly.privateKey, '');
		expect(refused.success).toBe(false);
		expect(refused.errorField).toBe('privateKey');
	}, 15_000);

	it('should call a signature from a subkey that its owner never bound one that does not match', async () => {
		const intruder = await generateKey({
			type: 'ecc',
			curve: 'curve25519Legacy',
			userIDs: [{ name: 'Mallory' }],
			subkeys: [{ sign: true }],
			format: 'object'
		});
		const signed = must(
			(await signMessage('Pay Mallory 1000.', intruder.privateKey.armor(), '')).data
		);
		// Alice's true key, with Mallory's signing subkey added to it by someone else
		const forged = await readKey({ armoredKey: alice.publicKey });
		forged.subkeys.push(...intruder.publicKey.subkeys);

		const checked = await verifyMessage(signed, forged.armor());
		expect(checked.data).toBe('Pay Mallory 1000.');
		expect(must(checked.signatures)[0].status).toBe('invalid');
	}, 15_000);
});
