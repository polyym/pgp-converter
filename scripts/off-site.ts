// Recognises a redirect that would take a visitor to another site. Browsers
// read a Location header as they read any web address: a backslash counts as
// a slash, and tabs and line breaks are dropped. So "/\evil.example" leads to
// another host even though it starts with a slash.
//
// It reads addresses by the WHATWG URL standard, which browsers and Node both
// follow, so the tests can try any header without a server.

/**
 * Says whether following a redirect would leave the site that sent it.
 * @param location - The Location header as the server sent it, or null if it sent none
 * @param origin - The site that sent it, for example "http://localhost:8080"
 * @returns True if a browser would go to another site
 */
export function leavesSite(location: string | null, origin: string): boolean {
	if (location === null || !URL.canParse(location, origin)) {
		return false;
	}
	return new URL(location, origin).origin !== new URL(origin).origin;
}
