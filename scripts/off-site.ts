// Browsers parse a Location header with the WHATWG URL parser, which reads a
// backslash as a slash and strips tabs and newlines, so "/\evil.example" is a
// protocol-relative URL to another host. Node's URL class follows the same
// standard, so it gives the browser's answer.

/**
 * Returns true if a browser following `location` from `origin` would end up
 * on a different origin. Returns false for null (no Location header) and for
 * a value that does not parse as a URL.
 */
export function leavesSite(location: string | null, origin: string): boolean {
	if (location === null || !URL.canParse(location, origin)) {
		return false;
	}
	return new URL(location, origin).origin !== new URL(origin).origin;
}
