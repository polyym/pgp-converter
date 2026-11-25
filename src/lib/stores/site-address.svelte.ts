import { siteCopy, type SiteCopy } from '#lib/site-address.ts';

let copy = $state<SiteCopy>('released');

/** What the pages read to know which kind of copy of the app this is */
export const siteAddress = {
	/**
	 * True on a test copy: the staging address, the preview of a pull request or
	 * the development server. False until the browser has said where it is, so
	 * the pages are built, and first drawn, as the released site shows them.
	 */
	get isTest() {
		return copy === 'test';
	},
	/** True on a copy that someone runs at an address of their own */
	get isSelfHosted() {
		return copy === 'self-hosted';
	}
};

/**
 * Notes where the app was opened. For the browser only: the pages are built
 * ahead of time, before anyone knows which address will serve them. The
 * layout calls it for every page. A page that needs the answer as it starts
 * calls it too, because a page starts before its layout does.
 * @returns The kind of copy the app is
 */
export function readSiteAddress(): SiteCopy {
	copy = siteCopy(window.location.hostname, import.meta.env.DEV);
	return copy;
}
