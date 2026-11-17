import { describe, it, expect } from 'vitest';
import { releaseCandidate, version } from '../../package.json';
import lock from '../../package-lock.json';
import { candidateVersion } from './version.ts';

describe('candidateVersion', () => {
	it('should put the candidate after the version', () => {
		expect(candidateVersion('4.1.0', 3)).toBe('4.1.0-rc.3');
	});

	it('should keep a number of two digits', () => {
		expect(candidateVersion('4.1.0', 12)).toBe('4.1.0-rc.12');
	});
});

describe('the version of this project', () => {
	it('should be three numbers, with the candidate kept apart from it', () => {
		expect(version).toMatch(/^\d+\.\d+\.\d+$/);
	});

	it('should have a candidate number beside it: a whole number from 1 up', () => {
		expect(Number.isSafeInteger(releaseCandidate)).toBe(true);
		expect(releaseCandidate).toBeGreaterThanOrEqual(1);
	});

	it('should be the same in package-lock.json', () => {
		expect(lock.version).toBe(version);
		expect(lock.packages[''].version).toBe(version);
	});
});
