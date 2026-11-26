import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { missingForPreload } from './preload-header.ts';

describe('missingForPreload', () => {
	it('should find nothing missing in the header the site sends', () => {
		expect(missingForPreload('max-age=63072000; includeSubDomains; preload')).toEqual([]);
	});

	it('should accept exactly one year, and any order and letter case', () => {
		expect(missingForPreload('PRELOAD; includesubdomains; Max-Age=31536000')).toEqual([]);
	});

	it('should name a max-age under a year', () => {
		expect(missingForPreload('max-age=31535999; includeSubDomains; preload')).toEqual([
			'a max-age of at least a year'
		]);
	});

	it('should name each missing directive', () => {
		expect(missingForPreload('max-age=63072000; preload')).toEqual(['includeSubDomains']);
		expect(missingForPreload('max-age=63072000; includeSubDomains')).toEqual(['preload']);
	});

	it('should name everything when the header is not sent at all', () => {
		expect(missingForPreload(null)).toEqual([
			'a max-age of at least a year',
			'includeSubDomains',
			'preload'
		]);
	});

	it('should find nothing missing in the header netlify.toml sets', () => {
		const settings = readFileSync('netlify.toml', 'utf-8');
		const header = /Strict-Transport-Security = "([^"]+)"/.exec(settings)?.[1] ?? null;
		expect(header).not.toBeNull();
		expect(missingForPreload(header)).toEqual([]);
	});
});
