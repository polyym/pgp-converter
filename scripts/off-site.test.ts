import { describe, it, expect } from 'vitest';
import { leavesSite } from './off-site.ts';

const ORIGIN = 'http://localhost:8080';

describe('leavesSite', () => {
	it('should not flag a same-origin redirect', () => {
		expect(leavesSite('/about', ORIGIN)).toBe(false);
		expect(leavesSite('/encrypt?x=1', ORIGIN)).toBe(false);
		expect(leavesSite('http://localhost:8080/about', ORIGIN)).toBe(false);
	});

	it('should flag a redirect to another origin', () => {
		expect(leavesSite('https://evil.example/', ORIGIN)).toBe(true);
		expect(leavesSite('//evil.example/', ORIGIN)).toBe(true);
		expect(leavesSite('http://localhost:8081/', ORIGIN)).toBe(true);
	});

	it('should read a backslash as a slash, as browsers do', () => {
		expect(leavesSite('/\\evil.example', ORIGIN)).toBe(true);
		expect(leavesSite('/\\/evil.example', ORIGIN)).toBe(true);
		expect(leavesSite('/\\\\evil.example', ORIGIN)).toBe(true);
	});

	it('should strip tabs and newlines, as browsers do', () => {
		expect(leavesSite('/\t/evil.example', ORIGIN)).toBe(true);
		expect(leavesSite('/\n/evil.example', ORIGIN)).toBe(true);
	});

	it('should not flag a missing Location header', () => {
		expect(leavesSite(null, ORIGIN)).toBe(false);
	});
});
