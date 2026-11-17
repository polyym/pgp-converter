import { describe, it, expect } from 'vitest';
import { asksNotToBeListed } from './robots-header.ts';

describe('asksNotToBeListed', () => {
	it('should say yes to the header the staging copy is given', () => {
		expect(asksNotToBeListed('noindex')).toBe(true);
	});

	it('should say yes whatever the case, and among other words', () => {
		expect(asksNotToBeListed('NoIndex, nofollow')).toBe(true);
		expect(asksNotToBeListed('googlebot: noindex')).toBe(true);
	});

	it('should say yes to none, which includes noindex', () => {
		expect(asksNotToBeListed('none')).toBe(true);
	});

	it('should say no to a header that only limits what is shown', () => {
		expect(asksNotToBeListed('nofollow, noarchive')).toBe(false);
		expect(asksNotToBeListed('max-snippet: 50')).toBe(false);
	});

	it('should say no when the header is not sent at all', () => {
		expect(asksNotToBeListed(null)).toBe(false);
	});
});
