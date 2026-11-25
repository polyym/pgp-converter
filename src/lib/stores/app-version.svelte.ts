import { releaseCandidate, version } from '../../../package.json';
import { candidateVersion } from '#lib/version.ts';
import { siteAddress } from './site-address.svelte.ts';

/**
 * The version as the pages show it, which depends on where the app was opened:
 * as a release candidate on a test copy, and as released everywhere else,
 * self-hosted copies included
 */
export const appVersion = {
	/** The version alone, as package.json has it: "4.1.0" */
	release: version,
	/** The number of the release candidate this code is */
	candidate: releaseCandidate,
	/** True on a test copy: the staging address, a preview or the development server */
	get isCandidate() {
		return siteAddress.isTest;
	},
	/** What to show: "4.1.0-rc.3" on a test copy, "4.1.0" everywhere else */
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
