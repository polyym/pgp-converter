/**
 * Returns the version a test copy shows, such as "4.1.0-rc.3", from package.json's
 * `version` (the release being prepared) and `releaseCandidate` fields.
 */
export function candidateVersion(version: string, candidate: number): string {
	return `${version}-rc.${String(candidate)}`;
}
