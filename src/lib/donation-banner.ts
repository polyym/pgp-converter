import { DONATION_COOLDOWN_MS, DONATION_STORAGE_KEY } from './constants';

/**
 * Checks whether the donation banner is allowed to appear.
 * Returns true if the banner has never been dismissed, or if
 * the cooldown period has elapsed since the last dismissal.
 */
export function isDonationBannerAllowed(): boolean {
	try {
		const dismissed = localStorage.getItem(DONATION_STORAGE_KEY);
		if (!dismissed) return true;
		const dismissedAt = Number(dismissed);
		// A value that is not a timestamp must not hide the banner for ever
		if (!Number.isFinite(dismissedAt)) return true;
		return Date.now() - dismissedAt >= DONATION_COOLDOWN_MS;
	} catch {
		// localStorage unavailable (e.g. private browsing); allow banner
		return true;
	}
}

/** Records the current timestamp as the dismissal time in localStorage */
export function dismissDonationBanner(): void {
	try {
		localStorage.setItem(DONATION_STORAGE_KEY, String(Date.now()));
	} catch {
		// localStorage unavailable; fail silently
	}
}
