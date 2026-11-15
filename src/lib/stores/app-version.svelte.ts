import { releaseCandidate, version } from '../../../package.json';
import { candidateVersion } from '#lib/version.ts';
import { siteAddress } from './site-address.svelte.ts';

/**
 * The version as the pages show it, which depends on where the app was opened:
 * as released at the released site, and as a release candidate everywhere else
 */
export const appVersion = {
	/** The version alone, as package.json has it: "4.1.0" */
	release: version,
	/** The number of the release candidate this code is */
	candidate: releaseCandidate,
	/** True everywhere but the released site */
	get isCandidate() {
		return siteAddress.isTest;
	},
	/** What to show: "4.1.0" at the released site, "4.1.0-rc.3" everywhere else */
	get shown() {
		return siteAddress.isTest ? candidateVersion(version, releaseCandidate) : version;
	},
	/** The same in words, for a label or a tooltip */
	get inWords() {
		return siteAddress.isTest
			? `Version ${candidateVersion(version, releaseCandidate)}, a dev build`
			: `Version ${version}`;
	}
};
