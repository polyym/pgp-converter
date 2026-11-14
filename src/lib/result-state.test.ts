import { describe, it, expect } from 'vitest';
import { isOutOfDate } from './result-state.ts';

describe('isOutOfDate', () => {
	it('should be false while there is no result', () => {
		expect(isOutOfDate(undefined, ['message', 'key'])).toBe(false);
	});

	it('should be false while the inputs are what the result was made from', () => {
		expect(isOutOfDate(['message', 'key'], ['message', 'key'])).toBe(false);
	});

	it('should be true as soon as the message is edited', () => {
		expect(isOutOfDate(['Version one, with a detail', 'key'], ['Version two', 'key'])).toBe(true);
	});

	it('should be true when the recipient is swapped for another', () => {
		expect(isOutOfDate(['message', "Alice's key"], ['message', "Bob's key"])).toBe(true);
	});

	it('should be true when an input is emptied', () => {
		expect(isOutOfDate(['message', 'key'], ['', 'key'])).toBe(true);
	});

	it('should count a change of nothing but spacing, which changes what is encrypted', () => {
		expect(isOutOfDate(['message', 'key'], ['message ', 'key'])).toBe(true);
	});

	it('should be false again once the inputs are put back as they were', () => {
		const madeFrom = ['message', 'key'];
		expect(isOutOfDate(madeFrom, [...madeFrom])).toBe(false);
	});

	it('should be true when the two lists do not line up', () => {
		expect(isOutOfDate(['message'], ['message', 'key'])).toBe(true);
	});
});
