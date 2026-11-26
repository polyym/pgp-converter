import { siteCopy, type SiteCopy } from '#lib/site-address.ts';

let copy = $state<SiteCopy>('released');

/** Which kind of copy is serving the app (see SiteCopy), as set by readSiteAddress */
export const siteAddress = {
	/**
	 * True on a test copy: staging, a pull request preview or the development
	 * server. False until readSiteAddress runs, so the prerendered HTML and the
	 * first render after hydration match the released site.
	 */
	get isTest() {
		return copy === 'test';
	},
	/** True on a self-hosted copy: any other address, such as the Docker image on localhost */
	get isSelfHosted() {
		return copy === 'self-hosted';
	}
};

/**
 * Works out the kind of copy from location.hostname and the dev server flag,
 * stores it in siteAddress and returns it. Browser only, because pages are
 * prerendered before the serving host is known. The root layout calls it on
 * mount, but a page's onMount runs before its layout's, so a page that needs
 * the answer on mount calls it itself.
 */
export function readSiteAddress(): SiteCopy {
	copy = siteCopy(window.location.hostname, import.meta.env.DEV);
	return copy;
}
