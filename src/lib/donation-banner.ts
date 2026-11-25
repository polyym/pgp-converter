import { DONATION_COOLDOWN_MS, DONATION_STORAGE_KEY } from './constants.ts';

/**
 * Returns false only while a dismissal stored in localStorage is less than
 * DONATION_COOLDOWN_MS old. No dismissal, an unreadable value or unavailable
 * storage all return true.
 */
export function isDonationBannerAllowed(): boolean {
	try {
		const dismissed = localStorage.getItem(DONATION_STORAGE_KEY);
		if (!dismissed) {
			return true;
		}
		const dismissedAt = Number(dismissed);
		// A value that is not a timestamp must not hide the banner for ever
		if (!Number.isFinite(dismissedAt)) {
			return true;
		}
		return Date.now() - dismissedAt >= DONATION_COOLDOWN_MS;
	} catch {
		// localStorage throws where storage is blocked, as in some private modes
		return true;
	}
}

/**
 * Stores the current time in localStorage as the dismissal time. Does nothing if
 * storage is unavailable.
 */
export function dismissDonationBanner(): void {
	try {
		localStorage.setItem(DONATION_STORAGE_KEY, String(Date.now()));
	} catch {
		// Without storage the dismissal is forgotten, so the banner may show again sooner
	}
}
