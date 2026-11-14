import { describe, it, expect } from 'vitest';
import type { KeyInfo } from './keys.ts';
import type { SignatureCheck } from './signatures.ts';
import {
	describeSignature,
	describeSignatures,
	formatKeyId,
	summariseSignatures
} from './verdicts.ts';

const ADA: KeyInfo = {
	userIDs: ['Ada Lovelace <ada@example.com>'],
	fingerprint: 'AAAA BBBB CCCC DDDD EEEE FFFF 0000 1111 2222 3333',
	algorithm: 'Curve25519',
	created: '2026-01-01',
	isPrivate: false
};
const KEY_ID = '0123456789ABCDEF';
const VALID: SignatureCheck = { status: 'valid', keyID: KEY_ID, signer: ADA };
const INVALID: SignatureCheck = { status: 'invalid', keyID: KEY_ID, signer: ADA };
const UNTRUSTED: SignatureCheck = {
	status: 'untrusted',
	keyID: KEY_ID,
	signer: ADA,
	detail: 'The key was revoked.'
};
const UNKNOWN: SignatureCheck = { status: 'unknown-key', keyID: KEY_ID };

describe('describeSignature', () => {
	it('should name the signer of a valid signature and say what that proves', () => {
		const verdict = describeSignature(VALID, { wereKeysSupplied: true });
		expect(verdict.tone).toBe('good');
		expect(verdict.title).toBe('Signed by Ada Lovelace <ada@example.com>');
		expect(verdict.body).toContain('only if the fingerprint below is really theirs');
		expect(verdict.check).toBe(VALID);
	});

	it('should warn against relying on a signature that does not match', () => {
		const verdict = describeSignature(INVALID, { wereKeysSupplied: true });
		expect(verdict.tone).toBe('bad');
		expect(verdict.title).toBe('Signature does not match');
		expect(verdict.body).toContain('Do not rely on it');
	});

	it('should give the reason a matching signature is not trusted', () => {
		const verdict = describeSignature(UNTRUSTED, { wereKeysSupplied: true });
		expect(verdict.tone).toBe('caution');
		expect(verdict.body).toBe('The key was revoked.');
	});

	it('should fall back to a general warning when no reason was given', () => {
		const verdict = describeSignature(
			{ ...UNTRUSTED, detail: undefined },
			{ wereKeysSupplied: true }
		);
		expect(verdict.body).toBe('This signature cannot be relied on.');
	});

	it('should say the signature is from a different key when keys were supplied', () => {
		const verdict = describeSignature(UNKNOWN, { wereKeysSupplied: true });
		expect(verdict.tone).toBe('caution');
		expect(verdict.title).toBe('Signed by a different key');
		expect(verdict.body).toContain('0123 4567 89AB CDEF');
		expect(verdict.check).toBeUndefined();
	});

	it('should say how to get the signature checked when no key was supplied', () => {
		const verdict = describeSignature(UNKNOWN, {
			wereKeysSupplied: false,
			howToCheck: 'Add the sender’s public key to check it.'
		});
		expect(verdict.title).toBe('Signed, but not checked');
		expect(verdict.body).toBe(
			'This message carries a signature from key ID 0123 4567 89AB CDEF. Add the sender’s public key to check it.'
		);
	});

	it('should leave no trailing space when there is no advice to give', () => {
		const verdict = describeSignature(UNKNOWN, { wereKeysSupplied: false });
		expect(verdict.body).toBe('This message carries a signature from key ID 0123 4567 89AB CDEF.');
	});

	it('should describe a key that carries no name', () => {
		const nameless: SignatureCheck = { ...VALID, signer: { ...ADA, userIDs: [] } };
		expect(describeSignature(nameless, { wereKeysSupplied: true }).title).toBe(
			'Signed by a key with no name'
		);
	});
});

describe('describeSignatures', () => {
	it('should say a message with no signature is not signed', () => {
		const verdicts = describeSignatures([], { wereKeysSupplied: false });
		expect(verdicts).toHaveLength(1);
		expect(verdicts[0].tone).toBe('neutral');
		expect(verdicts[0].title).toBe('Not signed');
	});

	it('should give one verdict for each signature, in order', () => {
		const verdicts = describeSignatures([VALID, INVALID], { wereKeysSupplied: true });
		expect(verdicts.map((verdict) => verdict.tone)).toEqual(['good', 'bad']);
	});
});

describe('summariseSignatures', () => {
	it('should be good only when every signature is valid', () => {
		expect(summariseSignatures([VALID, VALID])).toEqual({
			tone: 'good',
			message: 'Signature valid'
		});
	});

	it('should let one signature that does not match outweigh the valid ones', () => {
		expect(summariseSignatures([VALID, INVALID]).tone).toBe('bad');
		expect(summariseSignatures([VALID, INVALID]).message).toBe('Signature does not match');
	});

	it('should not confirm a message when a signature could not be checked', () => {
		expect(summariseSignatures([VALID, UNKNOWN]).tone).toBe('caution');
		expect(summariseSignatures([UNTRUSTED]).message).toBe('Signature not confirmed');
	});

	it('should not confirm a message that carries no signature', () => {
		expect(summariseSignatures([]).tone).toBe('caution');
	});
});

describe('formatKeyId', () => {
	it('should group the characters in fours', () => {
		expect(formatKeyId('0123456789ABCDEF')).toBe('0123 4567 89AB CDEF');
	});

	it('should keep a shorter last group', () => {
		expect(formatKeyId('012345')).toBe('0123 45');
	});

	it('should return nothing for an empty ID', () => {
		expect(formatKeyId('')).toBe('');
	});
});
