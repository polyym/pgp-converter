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
	it('should name the signer and say to check the fingerprint', () => {
		const verdict = describeSignature(VALID, { wereKeysSupplied: true });
		expect(verdict.tone).toBe('good');
		expect(verdict.title).toBe('Signed by Ada Lovelace <ada@example.com>');
		expect(verdict.body).toContain('only if the fingerprint below is really theirs');
		expect(verdict.check).toBe(VALID);
	});

	it('should warn against relying on an invalid signature', () => {
		const verdict = describeSignature(INVALID, { wereKeysSupplied: true });
		expect(verdict.tone).toBe('bad');
		expect(verdict.title).toBe('Signature does not match');
		expect(verdict.body).toContain('Do not rely on it');
	});

	it('should show the detail of an untrusted signature', () => {
		const verdict = describeSignature(UNTRUSTED, { wereKeysSupplied: true });
		expect(verdict.tone).toBe('caution');
		expect(verdict.body).toBe('The key was revoked.');
	});

	it('should fall back to a general warning without a detail', () => {
		const verdict = describeSignature(
			{ ...UNTRUSTED, detail: undefined },
			{ wereKeysSupplied: true }
		);
		expect(verdict.body).toBe('This signature cannot be relied on.');
	});

	it('should report a different key when keys were supplied', () => {
		const verdict = describeSignature(UNKNOWN, { wereKeysSupplied: true });
		expect(verdict.tone).toBe('caution');
		expect(verdict.title).toBe('Signed by a different key');
		expect(verdict.body).toContain('0123 4567 89AB CDEF');
		expect(verdict.check).toBeUndefined();
	});

	it('should append howToCheck when no key was supplied', () => {
		const verdict = describeSignature(UNKNOWN, {
			wereKeysSupplied: false,
			howToCheck: 'Add the sender’s public key to check it.'
		});
		expect(verdict.title).toBe('Signed, but not checked');
		expect(verdict.body).toBe(
			'This message carries a signature from key ID 0123 4567 89AB CDEF. Add the sender’s public key to check it.'
		);
	});

	it('should leave no trailing space without howToCheck', () => {
		const verdict = describeSignature(UNKNOWN, { wereKeysSupplied: false });
		expect(verdict.body).toBe('This message carries a signature from key ID 0123 4567 89AB CDEF.');
	});

	it('should describe a key with no user ID', () => {
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

	it('should add a caution when there is other text', () => {
		const verdicts = describeSignatures([VALID], {
			wereKeysSupplied: true,
			hasOtherText: true
		});
		expect(verdicts.map((verdict) => verdict.tone)).toEqual(['good', 'caution']);
		expect(verdicts[1].title).toBe('The box holds more than the message');
		expect(verdicts[1].body).toContain('Only the text in the result belongs to the message');
	});

	it('should add the same caution after an invalid signature', () => {
		const verdicts = describeSignatures([INVALID], {
			wereKeysSupplied: true,
			hasOtherText: true
		});
		expect(verdicts.map((verdict) => verdict.tone)).toEqual(['bad', 'caution']);
	});

	it('should omit the caution for an unsigned message', () => {
		const verdicts = describeSignatures([], { wereKeysSupplied: true, hasOtherText: true });
		expect(verdicts.map((verdict) => verdict.title)).toEqual(['Not signed']);
	});
});

describe('summariseSignatures', () => {
	it('should be good only when every signature is valid', () => {
		expect(summariseSignatures([VALID, VALID])).toEqual({
			tone: 'good',
			message: 'Signature valid'
		});
	});

	it('should stay good but mention other text', () => {
		expect(summariseSignatures([VALID], true)).toEqual({
			tone: 'good',
			message: 'Signature valid, but the box holds other text'
		});
	});

	it('should ignore other text unless the summary is good', () => {
		expect(summariseSignatures([INVALID], true)).toEqual(summariseSignatures([INVALID]));
		expect(summariseSignatures([UNKNOWN], true)).toEqual(summariseSignatures([UNKNOWN]));
	});

	it('should be bad when any signature is invalid', () => {
		expect(summariseSignatures([VALID, INVALID]).tone).toBe('bad');
		expect(summariseSignatures([VALID, INVALID]).message).toBe('Signature does not match');
	});

	it('should not confirm unknown-key or untrusted signatures', () => {
		expect(summariseSignatures([VALID, UNKNOWN]).tone).toBe('caution');
		expect(summariseSignatures([UNTRUSTED]).message).toBe('Signature not confirmed');
	});

	it('should not confirm an unsigned message', () => {
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

	it('should return an empty string for an empty ID', () => {
		expect(formatKeyId('')).toBe('');
	});
});
