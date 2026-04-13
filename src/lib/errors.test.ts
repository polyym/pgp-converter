import { describe, it, expect } from 'vitest';
import { getUserFriendlyError } from './errors';

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
		expect(encryptMsg).toBe('Something went wrong. Please check your inputs and try again.');
	});

	it('should return generic fallback for unknown errors', () => {
		const msg = getUserFriendlyError('some unknown error xyz', 'encrypt');
		expect(msg).toBe('Something went wrong. Please check your inputs and try again.');
	});
});
