import { HOST_PROJECT_ADDRESS, SITE_URL } from './constants.ts';

const RELEASED_HOST = new URL(SITE_URL).hostname;
// What the host puts between the name of one deploy and the project's address
const DEPLOY_SEPARATOR = '--';
const TRAILING_DOT = /\.$/;

/**
 * The kinds of copy the app can be:
 * - `released`: the released site
 * - `test`: the staging copy, the preview of a pull request, or the
 *   development server. It says that it is not the released site, shows its
 *   version as a candidate and has fake wallet addresses.
 * - `self-hosted`: a copy that someone runs at an address of their own. It
 *   looks like the released site, but has no wallet service to ask.
 */
export type SiteCopy = 'released' | 'test' | 'self-hosted';

/**
 * Says which kind of copy the app is. Only the address and the development
 * server decide, never a setting in the build, so that every copy of one
 * commit is made of the same files.
 * @param hostname - The host the page was opened at, as location.hostname gives it
 * @param isDevServer - True when the page comes from the development server (`npm run dev`)
 * @returns The kind of copy
 */
export function siteCopy(hostname: string, isDevServer: boolean): SiteCopy {
	const host = hostname.toLowerCase().replace(TRAILING_DOT, '');
	if (isDevServer || isHostProjectAddress(host)) {
		return 'test';
	}
	return host === RELEASED_HOST ? 'released' : 'self-hosted';
}

/** The project's own address at the host, or a deploy served at a name in front of it */
function isHostProjectAddress(host: string): boolean {
	return host === HOST_PROJECT_ADDRESS || host.endsWith(DEPLOY_SEPARATOR + HOST_PROJECT_ADDRESS);
}
