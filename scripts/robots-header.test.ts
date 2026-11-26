import { describe, it, expect } from 'vitest';
import { asksNotToBeListed } from './robots-header.ts';

describe('asksNotToBeListed', () => {
	it('should match noindex, as the staging copy sends it', () => {
		expect(asksNotToBeListed('noindex')).toBe(true);
	});

	it('should match in any case, among other directives and after a crawler name', () => {
		expect(asksNotToBeListed('NoIndex, nofollow')).toBe(true);
		expect(asksNotToBeListed('googlebot: noindex')).toBe(true);
	});

	it('should treat none as noindex', () => {
		expect(asksNotToBeListed('none')).toBe(true);
	});

	it('should ignore directives other than noindex and none', () => {
		expect(asksNotToBeListed('nofollow, noarchive')).toBe(false);
		expect(asksNotToBeListed('max-snippet: 50')).toBe(false);
	});

	it('should return false when there is no header', () => {
		expect(asksNotToBeListed(null)).toBe(false);
	});
});
