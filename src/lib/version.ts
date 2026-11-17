/**
 * Names a build that has not been released. package.json holds the version
 * being worked towards and, beside it, the number of the release candidate.
 * Everywhere but the released site the two are shown together: "4.1.0-rc.3".
 * @param version - The version as package.json has it
 * @param candidate - The candidate's number as package.json has it
 * @returns The version to show away from the released site
 */
export function candidateVersion(version: string, candidate: number): string {
	return `${version}-rc.${String(candidate)}`;
}
