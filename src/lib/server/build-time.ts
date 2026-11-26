import { MS_PER_SECOND } from '../constants.ts';

/**
 * Returns the build time in Unix epoch milliseconds, for the dates in the sitemap
 * and security.txt. CI sets SOURCE_DATE_EPOCH (in seconds) to the commit time, so
 * every build of one commit produces the same files. When it is unset or not a
 * positive number, the current time is used.
 */
export function getBuildTime(): number {
	const epochSeconds = Number(process.env.SOURCE_DATE_EPOCH);
	if (Number.isFinite(epochSeconds) && epochSeconds > 0) {
		return epochSeconds * MS_PER_SECOND;
	}
	return Date.now();
}
