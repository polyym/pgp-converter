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
 * Notes where the app was opened. For the browser only: the pages are built
 * ahead of time, before anyone knows which address will serve them. The
 * layout calls it for every page. A page that needs the answer as it starts
 * calls it too, because a page starts before its layout does.
 * @returns True when the app was opened anywhere but the released site
 */
export function readSiteAddress(): boolean {
	isTest = isTestAddress(window.location.hostname);
	return isTest;
}
