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
import {
	copyKey,
	daysAgo,
	everyOrder,
	makeDatedKey,
	makeKeyWithoutFlags,
	must,
	revokedCopyOf,
	secretPacketOf,
	signAt,
	withKeyFlags,
	type ArmoredKeyPair
} from './testing.ts';

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

/** Prefixes every line with '> ', as an email client quotes a reply */
function quote(text: string): string {
	return text
		.split('\n')
		.map((line) => `> ${line}`)
		.join('\n');
}

/** Verifies `signed` against the keys in `box` and returns the check on its first signature */
async function verdictOn(signed: string, box: string) {
	return must(must((await verifyMessage(signed, box)).signatures).at(0));
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
	it('should produce a cleartext signed message', async () => {
		const result = await signMessage('Meet at noon.', alice.privateKey, PASSPHRASE);
		expect(result.success).toBe(true);
		expect(result.data).toContain('-----BEGIN PGP SIGNED MESSAGE-----');
		expect(result.data).toContain('Meet at noon.');
		expect(result.data).toContain('-----END PGP SIGNATURE-----');
		expect(result.signer?.userIDs[0]).toContain('Alice');
	}, 15_000);

	it('should use LF line endings throughout', async () => {
		const result = await signMessage('one\ntwo\r\nthree', alice.privateKey, PASSPHRASE);
		expect(result.data).not.toContain('\r');
		const checked = await verifyMessage(must(result.data), alice.publicKey);
		expect(must(checked.signatures)[0].status).toBe('valid');
	}, 15_000);

	it('should ask for the passphrase of a protected key', async () => {
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

	it('should explain that signing needs a private key', async () => {
		const result = await signMessage('Hello', alice.publicKey, PASSPHRASE);
		expect(result.success).toBe(false);
		expect(result.error).toContain('private key');
		expect(result.error).not.toContain('recipient');
	}, 15_000);

	it('should find the private key pasted after its public key', async () => {
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

	it('should report unknown-key for a signer that was not supplied', async () => {
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

	it('should keep indentation and dash-escaped lines as signed', async () => {
		const text = 'List:\n  - indented item\n- dash at the start\n> quoted line';
		const signed = await signMessage(text, alice.privateKey, PASSPHRASE);
		const result = await verifyMessage(must(signed.data), alice.publicKey);
		expect(must(result.signatures)[0].status).toBe('valid');
		expect(result.data).toBe(text);
	}, 15_000);

	it('should accept CRLF line endings', async () => {
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

	it('should verify a signed PGP MESSAGE block', async () => {
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

	it('should not blame the clock for a key reformatted after signing', async () => {
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
		// Reformatted a day ago: reformatKey replaces every self-signature with a newer one
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

	it('should refuse a private key as the sender key', async () => {
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

	it('should refuse a detached signature', async () => {
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

	it("should blame the sender's public key when it is unreadable", async () => {
		const signed = await signMessage('Hello', alice.privateKey, PASSPHRASE);
		const result = await verifyMessage(must(signed.data), must(signed.data));
		expect(result.success).toBe(false);
		expect(result.error).not.toContain('recipient');
		expect(result.error).toContain('public key');
	}, 15_000);
});

describe('signing while encrypting', () => {
	it('should verify the sender after decryption', async () => {
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

	it('should report unknown-key when no sender key is given', async () => {
		const encrypted = await encryptMessage('Signed secret', bob.publicKey, {
			armoredPrivateKey: alice.privateKey,
			passphrase: PASSPHRASE
		});
		const result = await decryptMessage(must(encrypted.data), bob.privateKey, PASSPHRASE);
		expect(result.isSigned).toBe(true);
		expect(must(result.signatures)[0].status).toBe('unknown-key');
	}, 15_000);

	it('should report unknown-key for a signer other than the sender', async () => {
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

	it('should ask for the signing key passphrase', async () => {
		const result = await encryptMessage('Hello', bob.publicKey, {
			armoredPrivateKey: alice.privateKey,
			passphrase: ''
		});
		expect(result.success).toBe(false);
		expect(result.error).toBe(SIGNING_PASSPHRASE_REQUIRED_ERROR);
	}, 15_000);

	it('should say when the signing key is a public key', async () => {
		const result = await encryptMessage('Hello', bob.publicKey, {
			armoredPrivateKey: alice.publicKey,
			passphrase: ''
		});
		expect(result.success).toBe(false);
		expect(result.error).toContain('private key');
		expect(result.error).not.toContain('recipient');
	}, 15_000);

	it('should refuse a private key as the sender key when decrypting', async () => {
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

	it("should blame the sender's key, not the private key, when it is unreadable", async () => {
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

	it('should pick the private key pasted after its public key, for decrypting', async () => {
		const infos = await inspectKeys(`${alice.publicKey}\n${alice.privateKey}`, 'decrypt');
		expect(infos).toHaveLength(1);
		expect(infos[0].isPrivate).toBe(true);
	}, 15_000);

	it('should pick the private key pasted after its public key, for signing', async () => {
		const infos = await inspectKeys(`${alice.publicKey}\n${alice.privateKey}`, 'sign');
		expect(infos).toHaveLength(1);
		expect(infos[0].isPrivate).toBe(true);
	}, 15_000);

	it('should accept a public key for verifying and flag a private one', async () => {
		const [sender] = await inspectKeys(alice.publicKey, 'verify');
		expect(sender.problem).toBeUndefined();

		const [wrong] = await inspectKeys(alice.privateKey, 'verify');
		expect(wrong.problem).toBe(PRIVATE_KEY_AS_SENDER_PROBLEM);
	}, 15_000);

	it('should flag a revoked key for verifying', async () => {
		const pair = await createKeyPair('Revoked', null);
		const revoked = await revokeKey({
			key: (await readKey({ armoredKey: pair.privateKey })) as never,
			format: 'armored'
		});
		const [info] = await inspectKeys(revoked.publicKey, 'verify');
		expect(info.problem).toContain('revoked');
	}, 15_000);
});

// OpenPGP.js rejects DSA and ElGamal keys, and RSA keys below config.minRSABits
// (2047 by default). It generates a 1024-bit RSA key only when given a lower limit.
describe('a weak key', () => {
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

	it('should mark a good signature untrusted, not invalid', async () => {
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

	it('should flag the key when it is inspected', async () => {
		const [forChecking] = await inspectKeys(weak.publicKey, 'verify');
		expect(forChecking.algorithm).toBe('RSA 1024');
		expect(forChecking.problem).toBe(WEAK_VERIFYING_KEY_PROBLEM);

		const [forEncrypting] = await inspectKeys(weak.publicKey, 'encrypt');
		expect(forEncrypting.problem).toBe(WEAK_KEY_PROBLEM);

		const [forSigning] = await inspectKeys(weak.privateKey, 'sign');
		expect(forSigning.problem).toBe(WEAK_KEY_PROBLEM);
	}, 15_000);

	it('should refuse to sign with it and say why', async () => {
		const result = await signMessage('Hello', weak.privateKey, '');
		expect(result.success).toBe(false);
		expect(result.error).toBe(WEAK_SIGNING_KEY_ERROR);
		expect(result.errorField).toBe('privateKey');
	}, 15_000);
});

// Packet type IDs (RFC 9580 section 5)
const COMPRESSED_DATA_PACKET = 8;
const LITERAL_DATA_PACKET = 11;

/**
 * Wraps `contents` in an OpenPGP-format packet header: 0xC0 | type, then a
 * five-octet length (0xFF and a 32-bit big-endian length). RFC 9580 section 4.2.
 */
function packetOf(type: number, contents: Buffer): Buffer {
	const header = Buffer.alloc(6);
	header.writeUInt8(0xc0 + type, 0);
	header.writeUInt8(0xff, 1);
	header.writeUInt32BE(contents.length, 2);
	return Buffer.concat([header, contents]);
}

/**
 * Builds an unsigned armoured message by hand: a literal data packet,
 * zlib-compressed inside a compressed data packet.
 */
function compressedMessageOf(messageText: string): string {
	// Literal data header: format 'u' (UTF-8 text), empty file name, zero date
	const preamble = Buffer.from([0x75, 0, 0, 0, 0, 0]);
	const literal = packetOf(
		LITERAL_DATA_PACKET,
		Buffer.concat([preamble, Buffer.from(messageText)])
	);
	const zlib = Buffer.from([enums.compression.zlib]);
	const compressed = packetOf(COMPRESSED_DATA_PACKET, Buffer.concat([zlib, deflateSync(literal)]));
	return armor(enums.armor.message, compressed);
}

describe('verifyMessage, on a decompression bomb', () => {
	it('should refuse it with the oversized message error', async () => {
		const bomb = compressedMessageOf('A'.repeat(MAX_UNPACKED_MESSAGE_BYTES + 1_000_000));
		// A few dozen kilobytes compressed
		expect(bomb.length).toBeLessThan(100_000);

		const result = await verifyMessage(bomb, alice.publicKey);
		expect(result.success).toBe(false);
		expect(result.error).toBe(OVERSIZED_MESSAGE_ERROR);
		expect(result.errorField).toBe('signedMessage');
	}, 30_000);

	it('should read an ordinary compressed message as unsigned', async () => {
		const result = await verifyMessage(compressedMessageOf('Hello there.'), alice.publicKey);
		expect(result.success).toBe(true);
		expect(result.data).toBe('Hello there.');
		expect(result.signatures).toHaveLength(0);
	}, 15_000);
});

describe('verifyMessage, with text besides the message', () => {
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

	it('should set hasOtherText and return only the signed text', async () => {
		const pasted = `Pay Mallory 1000 first.\n\n${signed}\nP.S. And again.`;
		const result = await verifyMessage(pasted, alice.publicKey);
		expect(must(result.signatures)[0].status).toBe('valid');
		expect(result.data).toBe('Pay Alice 10.');
		expect(result.hasOtherText).toBe(true);
	}, 15_000);

	it('should not set hasOtherText for a message pasted alone', async () => {
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

	it('should check the text as pasted when it parses', async () => {
		// Once normaliseArmor strips the '> ', the quoted line would read as BEGIN PGP SIGNATURE
		const text = ['You wrote:', '> -----BEGIN PGP SIGNATURE-----', 'and I agree.'].join('\n');
		const quoting = must((await signMessage(text, alice.privateKey, PASSPHRASE)).data);
		const result = await verifyMessage(quoting, alice.publicKey);
		expect(must(result.signatures)[0].status).toBe('valid');
		expect(result.hasOtherText).toBe(false);
	}, 15_000);

	it('should flag an attribution line above a quoted message', async () => {
		const result = await verifyMessage(`On Monday Alice wrote:\n${quote(signed)}`, alice.publicKey);
		expect(must(result.signatures)[0].status).toBe('valid');
		expect(result.hasOtherText).toBe(true);
	}, 15_000);

	it('should flag words after the data in a rebuilt block', async () => {
		const lines = inlineSigned.split('\n');
		const data = lines
			.slice(2, -1)
			.filter((line) => !line.startsWith('='))
			.join('\n')
			.replace(/=+$/, '');
		// With no blank line after BEGIN, normaliseArmor rebuilds the block and puts each
		// word on its own line. OpenPGP.js reads nothing after the "=" padding.
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

	it('should flag a sentence crafted as a packet OpenPGP.js skips', async () => {
		// "sEND" decodes to 0xB0 0x43 0x43: an old-format trust packet (tag 12), which
		// OpenPGP.js skips, with a 67-byte body, so these 92 Base64 characters are exactly
		// one packet. It must start on a 4-character boundary, so re-sign with a longer
		// text until the data has no "=" padding.
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

	it('should flag paragraphs under a bare armour header name', async () => {
		const lines = inlineSigned.split('\n');
		const pasted = [lines[0], 'Comment:', '', 'Pay Mallory 1000.', '', ...lines.slice(2)].join(
			'\n'
		);
		const result = await verifyMessage(pasted, alice.publicKey);
		expect(must(result.signatures)[0].status).toBe('valid');
		expect(result.data).toBe('Pay Alice 10.');
		expect(result.hasOtherText).toBe(true);
	}, 15_000);

	// Each case adds text where OpenPGP.js silently ignores it. The signature must
	// still verify, or the case would not be testing hasOtherText.
	it('should flag text wherever OpenPGP.js ignores it', async () => {
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
			// OpenPGP.js treats U+2028 as a line break when it looks for armour lines, so it
			// ends the signed text at -----X----- and reads the real signature below. It
			// never reaches the later block.
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

describe('a key with no key flags', () => {
	let old: ArmoredKeyPair;

	beforeAll(async () => {
		old = await makeKeyWithoutFlags('Old Key');
	}, 15_000);

	it('should be unusable in OpenPGP.js without allowMissingKeyFlags', async () => {
		// Shows that the key really has no flags, which the tests below depend on
		const key = await readKey({ armoredKey: old.publicKey });
		await expect(key.getSigningKey()).rejects.toThrow(/None of the key flags is set/);
		await expect(key.getEncryptionKey()).rejects.toThrow(/None of the key flags is set/);
	}, 15_000);

	it('should sign and verify', async () => {
		const signed = await signMessage('Hello', old.privateKey, '');
		expect(signed.success).toBe(true);
		const checked = await verifyMessage(must(signed.data), old.publicKey);
		expect(must(checked.signatures)[0].status).toBe('valid');
	}, 15_000);

	it('should verify its signature in a PGP MESSAGE block', async () => {
		const signed: unknown = await sign({
			message: await createMessage({ text: 'Hello' }),
			signingKeys: await readPrivateKey({ armoredKey: old.privateKey }),
			config: KEY_USE_SETTINGS
		});
		const checked = await verifyMessage(String(signed), old.publicKey);
		expect(checked.data).toBe('Hello');
		expect(must(checked.signatures)[0].status).toBe('valid');
	}, 15_000);

	it('should sign and encrypt, then decrypt and verify', async () => {
		const encrypted = await encryptMessage('Hello', old.publicKey, {
			armoredPrivateKey: old.privateKey,
			passphrase: ''
		});
		expect(encrypted.success).toBe(true);
		const decrypted = await decryptMessage(must(encrypted.data), old.privateKey, '', old.publicKey);
		expect(decrypted.data).toBe('Hello');
		expect(must(decrypted.signatures)[0].status).toBe('valid');
	}, 15_000);

	it('should unlock with its passphrase despite a gnu-dummy primary key', async () => {
		const encrypted = await encryptMessage('Hello', old.publicKey);
		const key = await readPrivateKey({ armoredKey: old.privateKey });
		const primary = key.keyPacket;
		if (!(primary instanceof SecretKeyPacket)) {
			throw new TypeError('Expected a secret key packet');
		}
		// As gpg --export-secret-subkeys exports it, with a gnu-dummy stub in place of
		// the primary secret key
		primary.makeDummy();
		const locked = await encryptKey({ privateKey: key, passphrase: PASSPHRASE });

		const result = await decryptMessage(must(encrypted.data), locked.armor(), PASSPHRASE);
		expect(result.data).toBe('Hello');
	}, 15_000);

	it('should be inspected with no problem for any purpose', async () => {
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

describe('a key with key flags', () => {
	it('should not be encrypted to when flagged for signing only', async () => {
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

	it('should neither sign nor verify when its flags exclude signing', async () => {
		const made = await createKeyPair('Carol', null);
		const signed = must((await signMessage('Hello', made.privateKey, '')).data);
		// The same key re-signed so that its primary key is flagged to certify only
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

	it('should mark a signature from an unbound subkey invalid', async () => {
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
		// Alice's key with Mallory's signing subkey appended; its binding signature is Mallory's
		const forged = await readKey({ armoredKey: alice.publicKey });
		forged.subkeys.push(...intruder.publicKey.subkeys);

		const checked = await verifyMessage(signed, forged.armor());
		expect(checked.data).toBe('Pay Mallory 1000.');
		expect(must(checked.signatures)[0].status).toBe('invalid');
	}, 15_000);
});

describe("verifyMessage, with several copies of the signer's key", () => {
	const REASON = enums.reasonForRevocation;

	it('should not trust a key that any copy revokes', async () => {
		const key = await makeDatedKey('Signer');
		const signed = await signAt('Hello', key);

		const copies = [key.toPublic().armor(), await revokedCopyOf(key)];
		for (const order of everyOrder(copies)) {
			const check = await verdictOn(signed, order.join('\n'));
			expect(check.status).toBe('untrusted');
			expect(check.detail).toContain('revoked');
			expect(check.signer?.problem).toContain('revoked');
		}
	}, 15_000);

	it('should apply a later revocation after an earlier one', async () => {
		const key = await makeDatedKey('Signer');
		const signedBeforeEither = await signAt('Hello', key, daysAgo(20));
		// The owner revokes the key as retired, then later as compromised
		const retired = await revokedCopyOf(key, REASON.keyRetired, daysAgo(10));
		const compromised = await revokedCopyOf(key, REASON.keyCompromised, daysAgo(5));
		// A 'retired' revocation is soft and leaves earlier signatures valid; a
		// 'compromised' one is hard and invalidates signatures of any date.
		expect((await verdictOn(signedBeforeEither, retired)).status).toBe('valid');

		for (const order of everyOrder([retired, compromised])) {
			expect((await verdictOn(signedBeforeEither, order.join('\n'))).status).toBe('untrusted');
		}
	}, 15_000);

	it('should not trust a subkey that any copy revokes', async () => {
		const key = await makeDatedKey('Signer', { subkeys: [{}, { sign: true }] });
		const signed = await signAt('Hello', key);
		const signingID = (await key.getSigningKey()).getKeyID();
		const updated = await copyKey(key);
		const index = updated.subkeys.findIndex((subkey) => subkey.getKeyID().equals(signingID));
		updated.subkeys[index] = await must(updated.subkeys.at(index)).revoke(secretPacketOf(updated), {
			flag: REASON.keyCompromised
		});

		const copies = [key.toPublic().armor(), updated.toPublic().armor()];
		for (const order of everyOrder(copies)) {
			expect((await verdictOn(signed, order.join('\n'))).status).toBe('untrusted');
		}
	}, 15_000);

	it('should verify once a copy from before the reformat is added', async () => {
		// One key signs with its primary key, the other with a signing subkey
		for (const subkeys of [[{}], [{}, { sign: true }]]) {
			const key = await makeDatedKey('Reissued', { subkeys });
			const signed = await signAt('Signed twenty days ago', key, daysAgo(20));
			// Later the owner reformats the key, which replaces every self-signature
			const reissued = await reformatKey({
				privateKey: key,
				userIDs: [{ name: 'Reissued' }],
				date: daysAgo(5),
				format: 'armored'
			});
			expect((await verdictOn(signed, reissued.publicKey)).detail).toBe(REISSUED_KEY_DETAIL);

			const copies = [reissued.publicKey, key.toPublic().armor()];
			for (const order of everyOrder(copies)) {
				expect((await verdictOn(signed, order.join('\n'))).status).toBe('valid');
			}
		}
	}, 15_000);

	it('should give the same verdicts for three copies in any order', async () => {
		const key = await makeDatedKey('Signer');
		const signedEarly = await signAt('Signed twenty days ago', key, daysAgo(20));
		const signedLate = await signAt('Signed two days ago', key, daysAgo(2));
		const reissued = await reformatKey({
			privateKey: key,
			userIDs: [{ name: 'Signer' }],
			date: daysAgo(10),
			format: 'armored'
		});
		const retired = await revokedCopyOf(key, REASON.keyRetired, daysAgo(5));

		const copies = [key.toPublic().armor(), reissued.publicKey, retired];
		for (const order of everyOrder(copies)) {
			const box = order.join('\n');
			expect((await verdictOn(signedEarly, box)).status).toBe('valid');
			expect((await verdictOn(signedLate, box)).status).toBe('untrusted');
			expect((await encryptMessage('Hello', box)).success).toBe(false);
		}
	}, 15_000);
});
