// security.txt, RFC 9116. "[x+2e]well-known" is SvelteKit's escape for
// ".well-known": TypeScript's include globs skip folders that start with a dot.
// Keep the path in sync with SECURITY_TXT_PATH in vite.config.ts.

import { MS_PER_DAY, REPOSITORY_URL, SITE_URL } from '#lib/constants.ts';
import { getBuildTime } from '#lib/server/build-time.ts';

export const prerender = true;

// Expires is required, and RFC 9116 section 2.5.5 recommends less than a year
// ahead. It counts from the build time, so each release renews it.
const VALID_FOR_DAYS = 364;

/** Returns security.txt as plain text, with Expires set VALID_FOR_DAYS after the build time. */
export function GET(): Response {
	const expires = new Date(getBuildTime() + VALID_FOR_DAYS * MS_PER_DAY).toISOString();
	const lines = [
		`Contact: ${REPOSITORY_URL}/security/advisories/new`,
		`Expires: ${expires}`,
		'Preferred-Languages: en',
		`Canonical: ${SITE_URL}/.well-known/security.txt`,
		`Policy: ${REPOSITORY_URL}/blob/main/SECURITY.md`
	];
	return new Response(`${lines.join('\n')}\n`, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' }
	});
}
