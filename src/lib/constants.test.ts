import { describe, it, expect } from 'vitest';
import {
	LOADING_DELAY_MS,
	SUCCESS_TOAST_MS,
	ERROR_TOAST_MS,
	COPY_FEEDBACK_MS,
	COPY_ERROR_MS,
	MIN_PASSPHRASE_LENGTH,
	EMAIL_REGEX
} from './constants';

describe('timing constants', () => {
	it('should all be positive numbers', () => {
		expect(LOADING_DELAY_MS).toBeGreaterThan(0);
		expect(SUCCESS_TOAST_MS).toBeGreaterThan(0);
		expect(ERROR_TOAST_MS).toBeGreaterThan(0);
		expect(COPY_FEEDBACK_MS).toBeGreaterThan(0);
		expect(COPY_ERROR_MS).toBeGreaterThan(0);
	});

	it('should have error toast longer than success toast', () => {
		expect(ERROR_TOAST_MS).toBeGreaterThan(SUCCESS_TOAST_MS);
	});
});

describe('MIN_PASSPHRASE_LENGTH', () => {
	it('should be 8', () => {
		expect(MIN_PASSPHRASE_LENGTH).toBe(8);
	});
});

describe('EMAIL_REGEX', () => {
	it('should match valid emails', () => {
		expect(EMAIL_REGEX.test('user@example.com')).toBe(true);
		expect(EMAIL_REGEX.test('a@b.co')).toBe(true);
		expect(EMAIL_REGEX.test('test.name+tag@domain.org')).toBe(true);
		expect(EMAIL_REGEX.test('user123@sub.domain.com')).toBe(true);
	});

	it('should reject invalid emails', () => {
		expect(EMAIL_REGEX.test('')).toBe(false);
		expect(EMAIL_REGEX.test('@')).toBe(false);
		expect(EMAIL_REGEX.test('user@')).toBe(false);
		expect(EMAIL_REGEX.test('@domain.com')).toBe(false);
		expect(EMAIL_REGEX.test('user domain.com')).toBe(false);
		expect(EMAIL_REGEX.test('plaintext')).toBe(false);
	});
});
