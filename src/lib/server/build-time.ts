import { MS_PER_SECOND } from '../constants.ts';

/**
 * Says when this build was made, for the dates written into the sitemap and
 * security.txt. The build server gives the time of the commit
 * (SOURCE_DATE_EPOCH, in seconds), which keeps the same commit building the
 * same files. A build that was not given one uses the clock.
 * @returns The time, in milliseconds since the start of 1970
 */
export function getBuildTime(): number {
	const epochSeconds = Number(process.env.SOURCE_DATE_EPOCH);
	if (Number.isFinite(epochSeconds) && epochSeconds > 0) {
		return epochSeconds * MS_PER_SECOND;
	}
	return Date.now();
}
