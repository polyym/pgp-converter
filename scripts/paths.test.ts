import { describe, it, expect } from 'vitest';
import { isInside } from './paths.ts';

describe('isInside', () => {
	it('should accept the folder itself and paths at any depth below it', () => {
		expect(isInside('build/headers.caddy', 'build')).toBe(true);
		expect(isInside('build/_app/x.js', 'build')).toBe(true);
		expect(isInside('build', 'build')).toBe(true);
		expect(isInside('./build/', 'build')).toBe(true);
	});

	it('should reject paths outside the folder', () => {
		expect(isInside('headers.caddy', 'build')).toBe(false);
		expect(isInside('build/../headers.caddy', 'build')).toBe(false);
		expect(isInside('buildings/x', 'build')).toBe(false);
	});

	it('should not mistake a name starting with .. for the parent directory', () => {
		expect(isInside('build/..x/y', 'build')).toBe(true);
	});

	it.runIf(process.platform === 'win32')('should reject a path on another drive', () => {
		expect(isInside('D:/build/x', 'C:/build')).toBe(false);
	});
});
