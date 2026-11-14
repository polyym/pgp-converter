// Tells security researchers where to report a problem (RFC 9116).
//
// The folder is written "[x+2e]well-known" for ".well-known", because
// TypeScript passes over a folder whose name starts with a dot.

import { MS_PER_DAY, REPOSITORY_URL, SITE_URL } from '#lib/constants.ts';
import { getBuildTime } from '#lib/server/build-time.ts';

export const prerender = true;

// The file must say when it stops being current, less than a year ahead.
// Counted from the build, so every deploy renews it.
const VALID_FOR_DAYS = 364;

/**
 * Writes security.txt.
 * @returns The file, as plain text
 */
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
