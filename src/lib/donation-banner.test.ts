import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isDonationBannerAllowed, dismissDonationBanner } from './donation-banner.ts';
import { DONATION_COOLDOWN_MS, DONATION_STORAGE_KEY } from './constants.ts';

const NOW = new Date('2026-11-09T12:00:00Z');

function stubStorage(initial: Record<string, string> = {}) {
	const values = new Map(Object.entries(initial));
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => void values.set(key, value)
	});
	return values;
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('donation banner cooldown', () => {
	it('should stay away for a day once dismissed', () => {
		expect(DONATION_COOLDOWN_MS).toBe(24 * 60 * 60 * 1000);
	});

	it('should allow the banner when it has never been dismissed', () => {
		stubStorage();
		expect(isDonationBannerAllowed()).toBe(true);
	});

	it('should hide the banner after it is dismissed, until the cooldown has passed', () => {
		const values = stubStorage();
		dismissDonationBanner();
		expect(values.get(DONATION_STORAGE_KEY)).toBe(String(NOW.getTime()));
		expect(isDonationBannerAllowed()).toBe(false);

		vi.setSystemTime(NOW.getTime() + DONATION_COOLDOWN_MS - 1);
		expect(isDonationBannerAllowed()).toBe(false);

		vi.setSystemTime(NOW.getTime() + DONATION_COOLDOWN_MS);
		expect(isDonationBannerAllowed()).toBe(true);
	});

	it('should allow the banner when the stored value is not a timestamp', () => {
		stubStorage({ [DONATION_STORAGE_KEY]: 'not-a-number' });
		expect(isDonationBannerAllowed()).toBe(true);
	});

	it('should allow the banner when storage is unavailable', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('blocked');
			},
			setItem: () => {
				throw new Error('blocked');
			}
		});
		expect(isDonationBannerAllowed()).toBe(true);
		expect(() => {
			dismissDonationBanner();
		}).not.toThrow();
	});
});
