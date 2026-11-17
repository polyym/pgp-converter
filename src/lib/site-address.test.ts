import { describe, it, expect } from 'vitest';
import { isTestAddress } from './site-address.ts';

describe('isTestAddress', () => {
	it('should say no at the released site', () => {
		expect(isTestAddress('pgp-converter.com')).toBe(false);
	});

	it('should say no however the released site is spelt', () => {
		expect(isTestAddress('PGP-Converter.com')).toBe(false);
		expect(isTestAddress('pgp-converter.com.')).toBe(false);
	});

	it('should say yes at the staging address', () => {
		expect(isTestAddress('dev--pgp-converter.netlify.app')).toBe(true);
	});

	it("should say yes at the preview of a pull request and at the host's own address", () => {
		expect(isTestAddress('6916f0a1b2c3d4e5f6a7b8c9--pgp-converter.netlify.app')).toBe(true);
		expect(isTestAddress('pgp-converter.netlify.app')).toBe(true);
	});

	it('should say yes at a name that only contains the released one', () => {
		expect(isTestAddress('pgp-converter.com.example.org')).toBe(true);
		expect(isTestAddress('staging.pgp-converter.com')).toBe(true);
	});

	it("should say yes on a developer's own machine", () => {
		expect(isTestAddress('localhost')).toBe(true);
		expect(isTestAddress('127.0.0.1')).toBe(true);
		expect(isTestAddress('[::1]')).toBe(true);
		expect(isTestAddress('192.168.1.20')).toBe(true);
	});

	it('should say no where there is no host at all', () => {
		expect(isTestAddress('')).toBe(false);
	});
});
