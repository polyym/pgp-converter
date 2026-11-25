import { HOST_PROJECT_ADDRESS, SITE_URL } from './constants.ts';

const RELEASED_HOST = new URL(SITE_URL).hostname;
// Netlify serves deploys at <name>--<project>.netlify.app
const DEPLOY_SEPARATOR = '--';
const TRAILING_DOT = /\.$/;

/**
 * The kinds of copy the app can be:
 * - `released`: the released site
 * - `test`: a branch deploy such as staging, a pull request's deploy preview, or
 *   the dev server. It says that it is not the released site, shows its version
 *   as a release candidate and has fake wallet addresses.
 * - `self-hosted`: a copy at any other address. It looks like the released site
 *   but has no wallet proxy.
 */
export type SiteCopy = 'released' | 'test' | 'self-hosted';

/**
 * Classifies the running copy by its hostname, compared case-insensitively and
 * without a trailing dot. It is decided at runtime rather than by a build
 * setting, so every copy of one commit serves identical build output.
 * @param isDevServer - True when the page comes from the dev server (`npm run dev`)
 */
export function siteCopy(hostname: string, isDevServer: boolean): SiteCopy {
	const host = hostname.toLowerCase().replace(TRAILING_DOT, '');
	if (isDevServer || isHostProjectAddress(host)) {
		return 'test';
	}
	return host === RELEASED_HOST ? 'released' : 'self-hosted';
}

/** True for the project's Netlify hostname and the deploys served under it */
function isHostProjectAddress(host: string): boolean {
	return host === HOST_PROJECT_ADDRESS || host.endsWith(DEPLOY_SEPARATOR + HOST_PROJECT_ADDRESS);
}
