import { describe, it, expect } from 'vitest';
import { isInside } from './paths.ts';

describe('isInside', () => {
	it('should place a file in the folder, at any depth, and the folder itself', () => {
		expect(isInside('build/headers.caddy', 'build')).toBe(true);
		expect(isInside('build/_app/x.js', 'build')).toBe(true);
		expect(isInside('build', 'build')).toBe(true);
		expect(isInside('./build/', 'build')).toBe(true);
	});

	it('should place a file outside the folder', () => {
		expect(isInside('headers.caddy', 'build')).toBe(false);
		expect(isInside('build/../headers.caddy', 'build')).toBe(false);
		expect(isInside('buildings/x', 'build')).toBe(false);
	});

	it('should not mistake a name that starts with two dots for a way up', () => {
		expect(isInside('build/..x/y', 'build')).toBe(true);
	});

	it.runIf(process.platform === 'win32')('should place a file on another drive outside', () => {
		expect(isInside('D:/build/x', 'C:/build')).toBe(false);
	});
});
