import { SITE_URL } from './constants.ts';

const RELEASED_HOST = new URL(SITE_URL).hostname;
const TRAILING_DOT = /\.$/;

/**
 * Says whether the app has been opened anywhere but the released site: the
 * staging copy, the preview of a pull request, a developer's own machine, or
 * any other copy. There it says that it is not the released site, and shows
 * its version as a candidate.
 * @param hostname - The host the page was opened at, as location.hostname gives it
 * @returns True everywhere but at the released site's address
 */
export function isTestAddress(hostname: string): boolean {
	const host = hostname.toLowerCase().replace(TRAILING_DOT, '');
	return host !== '' && host !== RELEASED_HOST;
}
