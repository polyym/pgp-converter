import { isTestAddress } from '#lib/site-address.ts';

let isTest = $state(false);

/** What the pages read to know whether this is the released site */
export const siteAddress = {
	/**
	 * True when the app was opened anywhere but the released site. False until
	 * the browser has said where it is, so the pages are built, and first drawn,
	 * as the released site shows them.
	 */
	get isTest() {
		return isTest;
	}
};

/**
 * Notes where the app was opened. Call once, in the browser: the pages are
 * built ahead of time, before anyone knows which address will serve them.
 */
export function readSiteAddress(): void {
	isTest = isTestAddress(window.location.hostname);
}
