import { releaseCandidate, version } from '../../../package.json';
import { candidateVersion } from '#lib/version.ts';
import { siteAddress } from './site-address.svelte.ts';

/**
 * The app version for display: a release candidate on a test copy, and the
 * plain release everywhere else, self-hosted copies included. Reads siteAddress,
 * so it shows the release until readSiteAddress has run.
 */
export const appVersion = {
	/** The version alone, as package.json has it: "4.1.0" */
	release: version,
	/** The release candidate number from package.json */
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
