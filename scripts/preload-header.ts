// What the browsers' HSTS preload list requires of a site's HTTPS-only header.
// The domain was submitted to that list, and is taken off it if the header
// stops meeting any of this.
const MIN_AGE_SECONDS = 31_536_000;
const REQUIRED_WORDS: readonly string[] = ['includeSubDomains', 'preload'];
const MAX_AGE = /max-age=(\d+)/i;

/**
 * Says what a Strict-Transport-Security header lacks of what the preload list
 * requires: a max-age of at least a year, includeSubDomains and preload.
 * @param header - The header as the site sent it, or null if it sent none
 * @returns Each missing part, in words; empty if nothing is missing
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
