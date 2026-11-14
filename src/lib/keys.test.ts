import { describe, it, expect } from 'vitest';
import { generateKey, revokeKey } from 'openpgp';
import {
	formatFingerprint,
	readPublicKeys,
	describeKey,
	inspectKeys,
	PRIVATE_KEY_PROBLEM
} from './keys.ts';

async function createKeyPair(name: string) {
	return generateKey({
		type: 'ecc',
		curve: 'curve25519Legacy',
		userIDs: [{ name, email: `${name.toLowerCase()}@example.com` }],
		format: 'armored'
	});
}

/** The lines of an armoured block, without the blank ones */
function linesOf(armor: string): string[] {
	return armor
		.trim()
		.split(/\r?\n/)
		.filter((line) => line !== '');
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
