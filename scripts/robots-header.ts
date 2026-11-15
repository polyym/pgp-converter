// What a site says in its X-Robots-Tag header to stay out of search results.
// The staging copy says it. The released site must not.
const LEAVE_OUT = /\b(?:noindex|none)\b/i;

/**
 * Says whether an X-Robots-Tag header asks search engines not to list the site.
 * @param header - The header as the site sent it, or null if it sent none
 * @returns True if it carries noindex, or none, which includes it
 */
export function asksNotToBeListed(header: string | null): boolean {
	return LEAVE_OUT.test(header ?? '');
}
