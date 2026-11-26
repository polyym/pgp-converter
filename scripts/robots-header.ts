// noindex, or none (noindex plus nofollow), anywhere in the value, including
// after a crawler name as in "googlebot: noindex"
const NOINDEX = /\b(?:noindex|none)\b/i;

/**
 * Returns true if an X-Robots-Tag value asks search engines not to index the
 * site: it contains noindex or none, in any case. Returns false for null (no
 * header).
 */
export function asksNotToBeListed(header: string | null): boolean {
	return NOINDEX.test(header ?? '');
}
