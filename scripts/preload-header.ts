// The HSTS preload list's requirements for Strict-Transport-Security
// (https://hstspreload.org). pgp-converter.com was submitted to the list, and
// is removed from it if the header stops meeting any of them.
const MIN_AGE_SECONDS = 31_536_000;
const REQUIRED_WORDS: readonly string[] = ['includeSubDomains', 'preload'];
const MAX_AGE = /max-age=(\d+)/i;

/**
 * Returns what a Strict-Transport-Security value lacks for the preload list:
 * a max-age of at least a year, includeSubDomains and preload, each described
 * in words. Case and order are ignored. Null (no header) lacks all three, and
 * an empty array means the header qualifies.
 */
export function missingForPreload(header: string | null): string[] {
	const value = header ?? '';
	const maxAge = Number(MAX_AGE.exec(value)?.[1] ?? 0);
	const missingWords = REQUIRED_WORDS.filter(
		(word) => !value.toLowerCase().includes(word.toLowerCase())
	);
	return maxAge < MIN_AGE_SECONDS
		? ['a max-age of at least a year', ...missingWords]
		: missingWords;
}
