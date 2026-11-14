import { describe, it, expect } from 'vitest';
import {
	getUserFriendlyError,
	PASSWORD_ONLY_MESSAGE_ERROR,
	NOT_ENCRYPTED_MESSAGE_ERROR,
	OVERSIZED_MESSAGE_ERROR,
	WEAK_RECIPIENT_KEY_ERROR,
	WEAK_SIGNING_KEY_ERROR
} from './errors.ts';

const GENERIC = 'Something went wrong. Please check your inputs and try again.';

describe('getUserFriendlyError', () => {
	it('should return friendly message for misformed armored text', () => {
		const msg = getUserFriendlyError('Misformed armored text', 'encrypt');
		expect(msg).toContain('invalid or corrupted');
	});

	it('should return friendly message for incorrect passphrase', () => {
		const msg = getUserFriendlyError('Incorrect key passphrase', 'decrypt');
		expect(msg).toContain('Incorrect passphrase');
	});

	it('should return friendly message for session key decryption failure', () => {
		const msg = getUserFriendlyError('Session key decryption failed', 'decrypt');
		expect(msg).toContain('not encrypted with the private key');
	});

	it('should return friendly message for invalid public key', () => {
		const msg = getUserFriendlyError('not a valid OpenPGP public key', 'encrypt');
		expect(msg).toContain('valid PGP public key');
	});

	it('should return friendly message for invalid private key', () => {
		const msg = getUserFriendlyError('not a valid OpenPGP private key', 'decrypt');
		expect(msg).toContain('valid PGP private key');
	});

	it('should return friendly message for invalid curve in keygen', () => {
		const msg = getUserFriendlyError('invalid curve', 'keygen');
		expect(msg).toContain('not supported');
	});

	it('should respect context filtering', () => {
		// "Incorrect key passphrase" is only mapped for 'decrypt' context
		const decryptMsg = getUserFriendlyError('Incorrect key passphrase', 'decrypt');
		expect(decryptMsg).toContain('Incorrect passphrase');

		const encryptMsg = getUserFriendlyError('Incorrect key passphrase', 'encrypt');
		expect(encryptMsg).toBe(GENERIC);
	});

	it('should return generic fallback for unknown errors', () => {
		const msg = getUserFriendlyError('some unknown error xyz', 'encrypt');
		expect(msg).toBe(GENERIC);
	});

	it('should name the input that a malformed block came from', () => {
		const raw = 'Misformed armored text';
		expect(getUserFriendlyError(raw, 'encrypt', 'public-key')).toContain('The public key appears');
		expect(getUserFriendlyError(raw, 'decrypt', 'private-key')).toContain(
			'The private key appears'
		);
		expect(getUserFriendlyError(raw, 'decrypt', 'message')).toContain(
			'The encrypted message appears'
		);
	});

	it('should say when something other than a message is in the message box', () => {
		const msg = getUserFriendlyError('Armored text not of type message', 'decrypt', 'message');
		expect(msg).toContain("doesn't appear to be a PGP message");
	});

	it('should say when a message is pasted where a public key belongs', () => {
		const msg = getUserFriendlyError('Armored text not of type key', 'encrypt', 'public-key');
		expect(msg).toContain('valid PGP public key');
	});

	it('should recognise a message encrypted to a different key', () => {
		const msg = getUserFriendlyError(
			'Error decrypting message: No decryption key packets found',
			'decrypt',
			'operation'
		);
		expect(msg).toContain('not encrypted with the private key');
	});

	it('should recognise an altered or truncated message', () => {
		const altered = getUserFriendlyError(
			'Error decrypting message: Modification detected.',
			'decrypt',
			'operation'
		);
		const truncated = getUserFriendlyError(
			'Parsing SymEncryptedIntegrityProtectedDataPacket failed: Unexpected end of packet',
			'decrypt',
			'message'
		);
		expect(altered).toContain('incomplete or has been altered');
		expect(truncated).toContain('incomplete or has been altered');
	});

	it('should explain expired, revoked and unusable recipient keys', () => {
		expect(
			getUserFriendlyError(
				'Error encrypting message: Primary key is expired',
				'encrypt',
				'operation'
			)
		).toContain('expired');
		expect(
			getUserFriendlyError(
				'Error encrypting message: Primary key is revoked',
				'encrypt',
				'operation'
			)
		).toContain('revoked');
		expect(
			getUserFriendlyError(
				'Error encrypting message: Could not find valid encryption key packet in key e6fc9c2b2cdb6277',
				'encrypt',
				'operation'
			)
		).toContain('cannot be used for encryption');
	});

	it('should not blame the passphrase for an unrelated key error', () => {
		const msg = getUserFriendlyError(
			'Error decrypting private key: Key packet is already decrypted.',
			'decrypt',
			'passphrase'
		);
		expect(msg).not.toContain('Incorrect passphrase');
		expect(msg).toContain('Could not unlock');
	});

	it('should fall back to the input being read when the error is unknown', () => {
		expect(getUserFriendlyError('something new', 'encrypt', 'public-key')).toContain(
			'The public key appears'
		);
		expect(getUserFriendlyError('something new', 'decrypt', 'operation')).toBe(GENERIC);
	});

	it('should say when a message is protected with a password instead of a key', () => {
		const raw = 'Error decrypting message: No public key encrypted session key packet found.';
		expect(getUserFriendlyError(raw, 'decrypt', 'operation')).toBe(PASSWORD_ONLY_MESSAGE_ERROR);
	});

	it('should say when a message is not encrypted at all', () => {
		expect(
			getUserFriendlyError(
				'Error decrypting message: No encrypted data found',
				'decrypt',
				'operation'
			)
		).toBe(NOT_ENCRYPTED_MESSAGE_ERROR);
	});

	it('should explain that an old kind of key is no longer accepted, for the box it was pasted into', () => {
		const rsa =
			'Error encrypting message: Could not verify primary key: RSA keys shorter than 2047 bits are considered too weak.';
		const dsa = 'Could not verify primary key: dsa keys are considered too weak.';
		expect(getUserFriendlyError(rsa, 'encrypt', 'operation')).toBe(WEAK_RECIPIENT_KEY_ERROR);
		expect(getUserFriendlyError(dsa, 'encrypt', 'operation')).toBe(WEAK_RECIPIENT_KEY_ERROR);
		expect(getUserFriendlyError(rsa, 'sign', 'operation')).toBe(WEAK_SIGNING_KEY_ERROR);
		expect(getUserFriendlyError(dsa, 'sign', 'private-key')).toBe(WEAK_SIGNING_KEY_ERROR);
	});
});

describe('getUserFriendlyError, for a message that unpacks to too much', () => {
	const RAW =
		'Error decrypting message: Parsing CompressedDataPacket failed: Maximum decompressed message size exceeded';

	it('should say so whatever step of decrypting reports it', () => {
		expect(getUserFriendlyError(RAW, 'decrypt', 'operation')).toBe(OVERSIZED_MESSAGE_ERROR);
		expect(getUserFriendlyError(RAW, 'decrypt', 'message')).toBe(OVERSIZED_MESSAGE_ERROR);
	});

	it('should say so on the Verify page too, where any other fault in the message gets one answer', () => {
		expect(getUserFriendlyError(RAW, 'verify', 'message')).toBe(OVERSIZED_MESSAGE_ERROR);
	});

	it('should name the limit', () => {
		expect(OVERSIZED_MESSAGE_ERROR).toContain('16 MB');
	});
});
