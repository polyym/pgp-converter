import { describe, it, expect } from 'vitest';
import { ratePassphrase } from './passphrase.ts';

describe('ratePassphrase', () => {
	it('should call a short passphrase weak', () => {
		expect(ratePassphrase('hunter22').strength).toBe('weak');
		expect(ratePassphrase('hunter22').bars).toBe(1);
	});

	it('should call a medium-length passphrase fair', () => {
		expect(ratePassphrase('purple-monkey').strength).toBe('fair');
		expect(ratePassphrase('purple-monkey').bars).toBe(2);
	});

	it('should call four unrelated words strong', () => {
		expect(ratePassphrase('correct horse battery staple').strength).toBe('strong');
		expect(ratePassphrase('correct horse battery staple').bars).toBe(3);
	});

	it('should call a long passphrase without spaces strong', () => {
		expect(ratePassphrase('Tr0ub4dor&3-and-then-some').strength).toBe('strong');
	});

	it('should not be fooled by one character repeated', () => {
		expect(ratePassphrase('aaaaaaaaaaaaaaaaaaaaaaaa').strength).toBe('weak');
	});

	it('should hold digits alone to a higher bar', () => {
		expect(ratePassphrase('836492017345').strength).toBe('weak');
		expect(ratePassphrase('83649201734598216').strength).toBe('fair');
		expect(ratePassphrase('8364920173459821600472').strength).toBe('fair');
	});

	it('should give advice for every rating', () => {
		for (const passphrase of ['short', 'purple-monkey', 'correct horse battery staple']) {
			expect(ratePassphrase(passphrase).advice.length).toBeGreaterThan(10);
		}
	});
});
