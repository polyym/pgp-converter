import { describe, it, expect } from 'vitest';
import { leavesSite } from './off-site.ts';

const ORIGIN = 'http://localhost:8080';

describe('leavesSite', () => {
	it('should let a redirect stay on the site', () => {
		expect(leavesSite('/about', ORIGIN)).toBe(false);
		expect(leavesSite('/encrypt?x=1', ORIGIN)).toBe(false);
		expect(leavesSite('http://localhost:8080/about', ORIGIN)).toBe(false);
	});

	it('should see that a redirect to another site leaves it', () => {
		expect(leavesSite('https://evil.example/', ORIGIN)).toBe(true);
		expect(leavesSite('//evil.example/', ORIGIN)).toBe(true);
		expect(leavesSite('http://localhost:8081/', ORIGIN)).toBe(true);
	});

	it('should read a backslash as a slash, as browsers do', () => {
		expect(leavesSite('/\\evil.example', ORIGIN)).toBe(true);
		expect(leavesSite('/\\/evil.example', ORIGIN)).toBe(true);
		expect(leavesSite('/\\\\evil.example', ORIGIN)).toBe(true);
	});

	it('should drop tabs and line breaks, as browsers do', () => {
		expect(leavesSite('/\t/evil.example', ORIGIN)).toBe(true);
		expect(leavesSite('/\n/evil.example', ORIGIN)).toBe(true);
	});

	it('should find nothing to follow where there is no address', () => {
		expect(leavesSite(null, ORIGIN)).toBe(false);
	});
});
