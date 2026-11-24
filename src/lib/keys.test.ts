import { describe, it, expect } from 'vitest';
import {
	PublicSubkeyPacket,
	UserAttributePacket,
	armor,
	enums,
	generateKey,
	readKey,
	reformatKey,
	revokeKey
} from 'openpgp';
import { MS_PER_DAY, MS_PER_SECOND } from './constants.ts';
import { combineKeyPair } from './key-files.ts';
import {
	formatFingerprint,
	readPublicKeys,
	describeKey,
	inspectKeys,
	addToKeys,
	KEY_CHECK_CONFIG,
	PRIVATE_KEY_PROBLEM
} from './keys.ts';
import {
	KEY_AGE_DAYS,
	armorPackets,
	copyKey,
	daysAgo,
	everyOrder,
	makeDatedKey,
	markUserIDs,
	must,
	padRevocation,
	revokedCopyOf,
	secretPacketOf
} from './testing.ts';
import { appendBlock } from './text-entry.ts';

const REASON = enums.reasonForRevocation;
const SECONDS_PER_DAY = MS_PER_DAY / MS_PER_SECOND;

async function createKeyPair(name: string) {
	return generateKey({
		type: 'ecc',
		curve: 'curve25519Legacy',
		userIDs: [{ name, email: `${name.toLowerCase()}@example.com` }],
		format: 'armored'
	});
}

/** The lines of an armoured block, without the blank ones */
function linesOf(block: string): string[] {
	return block
		.trim()
		.split(/\r?\n/)
		.filter((line) => line !== '');
}

/** What the page would say is wrong with the one key in a box */
async function problemIn(box: string): Promise<string | undefined> {
	const [info] = await inspectKeys(box, 'encrypt');
	return info.problem;
}

/** What adding a text to a box of keys would bring */
async function judge(held: string, addition: string) {
	const { outcome } = await addToKeys(held, addition);
	return outcome;
}

describe('formatFingerprint', () => {
	it('should upper-case the fingerprint and group it in fours', () => {
		expect(formatFingerprint('ab7f62dcb19b0f5c50183cec10259cbad28180e1')).toBe(
			'AB7F 62DC B19B 0F5C 5018 3CEC 1025 9CBA D281 80E1'
		);
	});
});

describe('readPublicKeys', () => {
	it('should read several keys pasted one after another', async () => {
		const alice = await createKeyPair('Alice');
		const bob = await createKeyPair('Bob');

		const keys = await readPublicKeys(`${alice.publicKey}\n${bob.publicKey}`);
		expect(keys).toHaveLength(2);
		expect(keys[0].getUserIDs()[0]).toContain('Alice');
		expect(keys[1].getUserIDs()[0]).toContain('Bob');
	});

	it('should return a key that was pasted twice only once', async () => {
		const alice = await createKeyPair('Alice');
		const keys = await readPublicKeys(`${alice.publicKey}\n${alice.publicKey}`);
		expect(keys).toHaveLength(1);
	});

	it('should read a key that was indented or quoted in an email', async () => {
		const alice = await createKeyPair('Alice');
		const indented = alice.publicKey
			.split('\n')
			.map((line) => ' '.repeat(4) + line)
			.join('\n');
		const quoted = alice.publicKey
			.split('\n')
			.map((line) => '> ' + line)
			.join('\n');

		expect(await readPublicKeys(indented)).toHaveLength(1);
		expect(await readPublicKeys(quoted)).toHaveLength(1);
	});

	it('should throw for text that is not a key', async () => {
		await expect(readPublicKeys('not a key')).rejects.toThrow();
	});
});

describe('readPublicKeys, when line breaks were lost', () => {
	it('should read a key copied from a page that showed it as one long line', async () => {
		const alice = await createKeyPair('Alice');
		const keys = await readPublicKeys(linesOf(alice.publicKey).join(' '));
		expect(keys).toHaveLength(1);
		expect(keys[0].getUserIDs()[0]).toContain('Alice');
	});

	it('should read a key pasted through a box that takes a single line', async () => {
		const alice = await createKeyPair('Alice');
		const keys = await readPublicKeys(linesOf(alice.publicKey).join(''));
		expect(keys).toHaveLength(1);
	});

	it('should read a key that lost only the empty line after its first line', async () => {
		const alice = await createKeyPair('Alice');
		const keys = await readPublicKeys(linesOf(alice.publicKey).join('\n'));
		expect(keys).toHaveLength(1);
	});

	it('should read two such keys, and describe them for the page', async () => {
		const alice = await createKeyPair('Alice');
		const bob = await createKeyPair('Bob');
		const oneLine = `${linesOf(alice.publicKey).join(' ')} ${linesOf(bob.publicKey).join(' ')}`;
		expect(await readPublicKeys(oneLine)).toHaveLength(2);
		expect((await inspectKeys(oneLine, 'encrypt')).map((key) => key.userIDs[0])).toEqual([
			'Alice <alice@example.com>',
			'Bob <bob@example.com>'
		]);
	});
});

describe('describeKey', () => {
	it('should report the identity, fingerprint and algorithm of a usable key', async () => {
		const alice = await createKeyPair('Alice');
		const [key] = await readPublicKeys(alice.publicKey);
		const info = await describeKey(key);

		expect(info.userIDs).toEqual(['Alice <alice@example.com>']);
		expect(info.fingerprint).toMatch(/^([0-9A-F]{4} ){9}[0-9A-F]{4}$/);
		expect(info.algorithm).toBe('Curve25519');
		expect(info.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(info.isPrivate).toBe(false);
		expect(info.problem).toBeUndefined();
	});

	it('should flag a private key', async () => {
		const alice = await createKeyPair('Alice');
		const [key] = await readPublicKeys(alice.privateKey);
		const info = await describeKey(key);

		expect(info.isPrivate).toBe(true);
		expect(info.problem).toBe(PRIVATE_KEY_PROBLEM);
	});

	it('should flag an expired key', async () => {
		const expired = await generateKey({
			type: 'ecc',
			curve: 'curve25519Legacy',
			userIDs: [{ name: 'Old', email: 'old@example.com' }],
			keyExpirationTime: 1,
			date: new Date(Date.now() - 86_400_000),
			format: 'armored'
		});
		const [key] = await readPublicKeys(expired.publicKey);

		expect((await describeKey(key)).problem).toContain('expired');
	});

	it('should flag a revoked key', async () => {
		const pair = await generateKey({
			type: 'ecc',
			curve: 'curve25519Legacy',
			userIDs: [{ name: 'Gone', email: 'gone@example.com' }],
			format: 'object'
		});
		const revoked = await revokeKey({ key: pair.privateKey, format: 'armored' });
		const [key] = await readPublicKeys(revoked.publicKey);

		expect((await describeKey(key)).problem).toContain('revoked');
	});
});

describe('inspectKeys', () => {
	it('should describe every key in the text', async () => {
		const alice = await createKeyPair('Alice');
		const bob = await createKeyPair('Bob');
		const infos = await inspectKeys(`${alice.publicKey}\n${bob.publicKey}`, 'encrypt');

		expect(infos.map((info) => info.userIDs[0])).toEqual([
			'Alice <alice@example.com>',
			'Bob <bob@example.com>'
		]);
	});

	it('should return an empty list instead of throwing for unreadable text', async () => {
		expect(
			await inspectKeys('-----BEGIN PGP PUBLIC KEY BLOCK-----\nhalf a key', 'encrypt')
		).toEqual([]);
	});
});

describe('readPublicKeys, when the box holds several copies of one key', () => {
	it('should apply a revocation whichever copy holds it', async () => {
		const alice = await makeDatedKey('Alice');
		const copies = [alice.toPublic().armor(), await revokedCopyOf(alice)];

		for (const order of everyOrder(copies)) {
			const box = order.join('\n');
			expect(await readPublicKeys(box)).toHaveLength(1);
			expect(await problemIn(box)).toContain('revoked');
		}
	}, 15_000);

	it('should apply a revocation when both copies share one armoured block', async () => {
		const alice = await makeDatedKey('Alice');
		const revoked = await revokeKey({ key: alice, format: 'object' });
		// What a file of keys holds when the newer copy was appended to the older one
		const oneBlock = armor(
			enums.armor.publicKey,
			new Uint8Array([...alice.toPublic().write(), ...revoked.publicKey.write()])
		);

		expect(await readPublicKeys(oneBlock)).toHaveLength(1);
		expect(await problemIn(oneBlock)).toContain('revoked');
	}, 15_000);

	it('should keep the other keys, and the order the keys were first pasted in', async () => {
		const alice = await makeDatedKey('Alice');
		const bob = await makeDatedKey('Bob');
		const box = [alice.toPublic().armor(), bob.toPublic().armor(), await revokedCopyOf(alice)].join(
			'\n'
		);

		const infos = await inspectKeys(box, 'encrypt');
		expect(infos.map((info) => info.userIDs[0])).toEqual(['Alice', 'Bob']);
		expect(infos[0].problem).toContain('revoked');
		expect(infos[1].problem).toBeUndefined();
	}, 15_000);

	it('should read a key the same however many copies of it there are', async () => {
		const revoked = await revokedCopyOf(await makeDatedKey('Alice'));
		const asRead = await readKey({ armoredKey: revoked });

		const [once] = await readPublicKeys(revoked);
		const [twice] = await readPublicKeys(`${revoked}\n${revoked}`);
		expect(twice.armor()).toBe(once.armor());
		// A key that came once, and lists each of its parts once, is the key the library reads
		expect(once.armor()).toBe(asRead.armor());
		// One copy that holds a signature twice is read as two copies are
		const [keyPacket, revocation, ...rest] = asRead.toPacketList();
		const [doubled] = await readPublicKeys(
			armorPackets([keyPacket, revocation, revocation, ...rest])
		);
		expect(doubled.armor()).toBe(once.armor());
	}, 15_000);

	it('should keep a revocation when another copy holds it in a form that fails its check', async () => {
		const alice = await makeDatedKey('Alice');
		const revoked = await revokedCopyOf(alice);
		// Anyone can write the number in a signature with a zero in front. The library
		// reads the two forms as the same signature, and the changed one fails its check.
		const padded = await padRevocation(revoked);
		expect(await (await readKey({ armoredKey: padded })).isRevoked()).toBe(false);

		for (const order of everyOrder([alice.toPublic().armor(), revoked, padded])) {
			expect(await problemIn(order.join('\n'))).toContain('revoked');
		}
	}, 15_000);

	it('should keep a revocation on its own subkey when the copy before it carries it behind another', async () => {
		const alice = await makeDatedKey('Alice', { subkeys: [{ sign: true }, {}] });
		const signing = must(alice.subkeys.at(0));
		const signingID = signing.getKeyID();
		const revoked = await signing.revoke(secretPacketOf(alice), { flag: REASON.keyCompromised });
		// Anyone can move a signature to another part of a key, where it says nothing.
		// Here the revocation stands last, behind the other subkey.
		const moved = armorPackets([
			...alice.toPublic().toPacketList(),
			must(revoked.revocationSignatures.at(0))
		]);
		const [alone] = await readPublicKeys(moved);
		await expect(
			alone.getSigningKey(signingID, undefined, undefined, KEY_CHECK_CONFIG)
		).resolves.toBeDefined();
		alice.subkeys[0] = revoked;

		for (const order of everyOrder([moved, alice.toPublic().armor()])) {
			const [key] = await readPublicKeys(order.join('\n'));
			await expect(
				key.getSigningKey(signingID, undefined, undefined, KEY_CHECK_CONFIG)
			).rejects.toThrow(/revoked/i);
		}
	}, 15_000);

	it('should keep a subkey that holds the bytes of the key itself', async () => {
		const alice = (await makeDatedKey('Alice')).toPublic();
		const twin = new PublicSubkeyPacket();
		await twin.read(alice.keyPacket.write());
		const armored = armorPackets([...alice.toPacketList(), twin]);

		const [key] = await readPublicKeys(armored);
		expect(key.subkeys).toHaveLength(2);
		expect(key.armor()).toBe((await readKey({ armoredKey: armored })).armor());
	}, 15_000);

	it('should keep a user ID when the copy before it holds the same bytes as a user attribute', async () => {
		// A user attribute is a run of pieces, each behind its length. A name reads
		// as one piece when its first letter stands for the length of the rest.
		const name = `A${'a'.repeat(must('A'.codePointAt(0)))}`;
		const alice = (await makeDatedKey(name)).toPublic();
		const attribute = new UserAttributePacket();
		attribute.read(must(alice.users.at(0)?.userID).write());
		// Anyone can make this copy: the key with the name filed as a user attribute
		const renamed = armorPackets([alice.keyPacket, attribute]);

		for (const order of everyOrder([renamed, alice.armor()])) {
			expect(await problemIn(order.join('\n'))).toBeUndefined();
		}
	}, 15_000);

	it('should not read a key that holds a revoked user ID a second time behind byte order marks', async () => {
		const alice = await makeDatedKey('Alice');
		const old = alice.toPublic().armor();
		alice.users[0] = await must(alice.users.at(0)).revoke(secretPacketOf(alice), {
			flag: REASON.userIDInvalid
		});
		const revoked = alice.toPublic().armor();
		expect(await problemIn(revoked)).toContain('revoked');
		// Anyone can make this copy. The library drops one mark each time it reads
		// a user ID: read once the name is not Alice's, read again it is, and no
		// revocation stands with it.
		const marked = await markUserIDs(old, 2);

		for (const order of everyOrder([old, revoked, marked])) {
			await expect(readPublicKeys(order.join('\n'))).rejects.toThrow();
		}
		expect(await addToKeys(revoked, marked)).toEqual({ outcome: 'unreadable', box: revoked });
	}, 15_000);

	it('should apply what each copy says when no copy says it all', async () => {
		const alice = await makeDatedKey('Alice', { subkeys: [{}, { sign: true }] });
		const encryptionID = (await alice.getEncryptionKey()).getKeyID();
		const signingID = (await alice.getSigningKey()).getKeyID();
		// Two copies, each with a different subkey revoked. Neither is the more cautious of the two.
		const copies = await Promise.all(
			[encryptionID, signingID].map(async (id) => {
				const copy = await copyKey(alice);
				const index = copy.subkeys.findIndex((subkey) => subkey.getKeyID().equals(id));
				copy.subkeys[index] = await must(copy.subkeys.at(index)).revoke(secretPacketOf(copy), {
					flag: REASON.keyCompromised
				});
				return copy.toPublic().armor();
			})
		);

		for (const order of everyOrder(copies)) {
			const [key] = await readPublicKeys(order.join('\n'));
			await expect(
				key.getEncryptionKey(undefined, undefined, undefined, KEY_CHECK_CONFIG)
			).rejects.toThrow(/revoked/i);
			await expect(
				key.getSigningKey(signingID, undefined, undefined, KEY_CHECK_CONFIG)
			).rejects.toThrow(/revoked/i);
		}
	}, 15_000);

	it('should let the newest record of the expiry date decide, as it does inside one copy', async () => {
		const shortened = await makeDatedKey('Shortened');
		// Ten days ago the owner set the key to expire, and two days ago it did
		const expired = await reformatKey({
			privateKey: shortened,
			userIDs: [{ name: 'Shortened' }],
			keyExpirationTime: (KEY_AGE_DAYS - 2) * SECONDS_PER_DAY,
			date: daysAgo(10),
			format: 'armored'
		});
		const shortenedCopies = [shortened.toPublic().armor(), expired.publicKey];
		expect(await problemIn(shortenedCopies[0])).toBeUndefined();
		for (const order of everyOrder(shortenedCopies)) {
			expect(await problemIn(order.join('\n'))).toContain('expired');
		}

		const extended = await makeDatedKey('Extended', { keyExpirationTime: 10 * SECONDS_PER_DAY });
		// The key expired twenty days ago; five days ago its owner gave it more time
		const renewed = await reformatKey({
			privateKey: extended,
			userIDs: [{ name: 'Extended' }],
			date: daysAgo(5),
			format: 'armored'
		});
		const extendedCopies = [extended.toPublic().armor(), renewed.publicKey];
		expect(await problemIn(extendedCopies[0])).toContain('expired');
		for (const order of everyOrder(extendedCopies)) {
			expect(await problemIn(order.join('\n'))).toBeUndefined();
		}
	}, 15_000);

	it('should keep a revocation when the copy before it carries one that does not count', async () => {
		const alice = await makeDatedKey('Alice');
		const mallory = await makeDatedKey('Mallory');
		const notAlices = must(
			(await revokeKey({ key: mallory, format: 'object' })).publicKey.revocationSignatures.at(0)
		);
		const [aliceKeyPacket, ...rest] = alice.toPublic().toPacketList();
		// Anyone can put a revocation made by another key into a copy. It revokes nothing.
		const planted = armorPackets([aliceKeyPacket, notAlices, ...rest]);
		expect(await problemIn(planted)).toBeUndefined();

		const copies = [planted, await revokedCopyOf(alice)];
		for (const order of everyOrder(copies)) {
			expect(await problemIn(order.join('\n'))).toContain('revoked');
		}
	}, 15_000);

	it('should not let a copy made without the private key change what a good key does', async () => {
		const privateKey = await makeDatedKey('Alice');
		const alice = privateKey.toPublic();
		const later = await privateKey.addSubkey({ date: daysAgo(5) });
		const subkeyID = must(alice.subkeys.at(0)).getKeyID();
		// A copy whose subkey carries, in place of its own signature, a newer one
		// that the owner made for another subkey
		const ownBinding = must(must(alice.subkeys.at(0)).bindingSignatures.at(0));
		const newerBinding = must(must(later.subkeys.at(1)).bindingSignatures.at(0));
		const swapped = armorPackets([
			...alice.toPacketList().filter((packet) => packet !== ownBinding),
			newerBinding
		]);
		// Of no use by itself
		expect(await problemIn(swapped)).toBeDefined();

		for (const order of everyOrder([alice.armor(), swapped])) {
			const [key] = await readPublicKeys(order.join('\n'));
			const chosen = await key.getEncryptionKey(undefined, undefined, undefined, KEY_CHECK_CONFIG);
			expect(chosen.getKeyID().equals(subkeyID)).toBe(true);
		}
	}, 15_000);

	it('should stay a private key when a public copy stands beside it', async () => {
		const pair = await createKeyPair('Alice');
		const boxes = [
			`${pair.publicKey}\n${pair.privateKey}`,
			`${pair.privateKey}\n${pair.publicKey}`,
			// The file the Generate page saves, which puts the public key first
			combineKeyPair(pair.publicKey, pair.privateKey)
		];

		for (const box of boxes) {
			const keys = await readPublicKeys(box);
			expect(keys).toHaveLength(1);
			expect((await describeKey(keys[0])).problem).toBe(PRIVATE_KEY_PROBLEM);
		}
	}, 15_000);
});

describe('addToKeys', () => {
	it('should put in the box only text that brings something', async () => {
		const alice = await makeDatedKey('Alice');
		const bob = (await makeDatedKey('Bob')).toPublic().armor();
		const held = alice.toPublic().armor();
		const revoked = await revokedCopyOf(alice);
		const noKey =
			'-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nnot a key\n-----END PGP PUBLIC KEY BLOCK-----';

		expect((await addToKeys(held, bob)).box).toBe(appendBlock(held, bob));
		// A revoked copy of a listed key adds no key to the list, and goes in all the same
		expect((await addToKeys(held, revoked)).box).toBe(appendBlock(held, revoked));
		expect((await addToKeys(held, held)).box).toBe(held);
		expect(await addToKeys(held, noKey)).toEqual({ outcome: 'unreadable', box: held });
	}, 15_000);

	it('should say that a key the box does not hold is a new key', async () => {
		const alice = await makeDatedKey('Alice');
		const bob = (await makeDatedKey('Bob')).toPublic().armor();
		const held = alice.toPublic().armor();

		expect(await judge(held, bob)).toBe('new-key');
		expect(await judge(held, `${await revokedCopyOf(alice)}\n${bob}`)).toBe('new-key');
	}, 15_000);

	it('should say that a revoked copy of a listed key brings new details', async () => {
		const alice = await makeDatedKey('Alice');
		const bob = (await makeDatedKey('Bob')).toPublic().armor();
		const held = alice.toPublic().armor();
		const revoked = await revokedCopyOf(alice);

		expect(await judge(held, revoked)).toBe('new-details');
		expect(await judge(appendBlock(held, bob), revoked)).toBe('new-details');
		expect(await judge(appendBlock(bob, held), revoked)).toBe('new-details');
		// Once it is in the box, the same copy brings nothing more
		expect(await judge(appendBlock(held, revoked), revoked)).toBe('nothing-new');
	}, 15_000);

	it('should find nothing new in a copy that says no more than the box does', async () => {
		const alice = await makeDatedKey('Alice');
		const held = alice.toPublic().armor();
		const revoked = await revokedCopyOf(alice);

		expect(await judge(held, held)).toBe('nothing-new');
		// The older copy, added after the revoked one
		expect(await judge(revoked, held)).toBe('nothing-new');
		expect(await judge(held, 'Here is my key.')).toBe('nothing-new');
	}, 15_000);

	it('should find nothing new in what the box holds, arranged another way', async () => {
		const alice = await makeDatedKey('Alice');
		const reissued = await reformatKey({
			privateKey: alice,
			userIDs: [{ name: 'Alice' }],
			date: daysAgo(5),
			format: 'object'
		});
		const [keyPacket, userID, certification, subkey, binding] = alice.toPublic().toPacketList();
		const laterCertification = must(reissued.publicKey.users.at(0)?.selfCertifications.at(0));
		const laterBinding = must(reissued.publicKey.subkeys.at(0)?.bindingSignatures.at(0));
		// One copy with every record of the key, as a program that keeps keys gives out
		const whole = armorPackets([
			keyPacket,
			userID,
			laterCertification,
			certification,
			subkey,
			laterBinding,
			binding
		]);

		const held = appendBlock(alice.toPublic().armor(), reissued.publicKey.armor());
		expect(await judge(held, whole)).toBe('nothing-new');
	}, 15_000);

	it('should say so when the text cannot be read', async () => {
		const alice = await createKeyPair('Alice');
		const bob = await createKeyPair('Bob');
		const lines = bob.publicKey.trim().split('\n');
		const damaged = [...lines.slice(0, 2), `AAAA${lines[2].slice(4)}`, ...lines.slice(3)].join(
			'\n'
		);

		expect(await judge(alice.publicKey, damaged)).toBe('unreadable');
		// A new key does not make up for a block beside it that cannot be read
		expect(await judge(alice.publicKey, `${bob.publicKey}\n${damaged}`)).toBe('unreadable');
		// A revocation certificate is a key block with no key in it
		expect(await judge(alice.publicKey, alice.revocationCertificate)).toBe('unreadable');
	}, 15_000);

	it('should see a change that the summary of a key does not show', async () => {
		const carol = await makeDatedKey('Carol', { subkeys: [{}, {}] });
		const updated = await copyKey(carol);
		// One of two encryption subkeys is revoked; the key still encrypts with the other
		updated.subkeys[0] = await must(updated.subkeys.at(0)).revoke(secretPacketOf(updated), {
			flag: REASON.keyCompromised
		});
		const held = carol.toPublic().armor();
		const addition = updated.toPublic().armor();

		const [before] = await readPublicKeys(held);
		const [after] = await readPublicKeys(addition);
		expect(await describeKey(after)).toEqual(await describeKey(before));
		expect(await judge(held, addition)).toBe('new-details');
	}, 15_000);

	it('should say that an older copy with an older record brings new details', async () => {
		const alice = await makeDatedKey('Alice');
		// The owner changed the key with a tool that kept only the newest record of it
		const reissued = await reformatKey({
			privateKey: alice,
			userIDs: [{ name: 'Alice' }],
			date: daysAgo(5),
			format: 'armored'
		});

		expect(await judge(reissued.publicKey, alice.toPublic().armor())).toBe('new-details');
	}, 15_000);

	it('should keep the private copy of a listed public key out of the box', async () => {
		const pair = await createKeyPair('Alice');

		expect(await addToKeys(pair.publicKey, pair.privateKey)).toEqual({
			outcome: 'private-key',
			box: pair.publicKey
		});
		// Let in, it would turn the listed key into a private one and stop the page
		const infos = await inspectKeys(appendBlock(pair.publicKey, pair.privateKey), 'encrypt');
		expect(infos.map((info) => info.problem)).toEqual([PRIVATE_KEY_PROBLEM]);
	}, 15_000);

	it('should keep out a private key that comes with a new key, in either order', async () => {
		const alice = await createKeyPair('Alice');
		const bob = await createKeyPair('Bob');
		const keep = { outcome: 'private-key', box: alice.publicKey };

		expect(await addToKeys(alice.publicKey, `${bob.publicKey}\n${alice.privateKey}`)).toEqual(keep);
		expect(await addToKeys(alice.publicKey, `${alice.privateKey}\n${bob.publicKey}`)).toEqual(keep);
		// Someone else's private key, too
		expect(await addToKeys(alice.publicKey, bob.privateKey)).toEqual(keep);
	}, 15_000);

	it('should keep out a private key that has lost its first or last line', async () => {
		const alice = await createKeyPair('Alice');
		const bob = await createKeyPair('Bob');
		const lines = alice.privateKey.trim().split('\n');
		const keep = { outcome: 'private-key', box: alice.publicKey };

		for (const damaged of [lines.slice(0, -1), lines.slice(1)]) {
			const addition = `${bob.publicKey}\n${damaged.join('\n')}`;
			expect(await addToKeys(alice.publicKey, addition)).toEqual(keep);
		}
	}, 15_000);
});
