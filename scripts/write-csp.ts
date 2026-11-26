// Writes the Content-Security-Policy for /* into build/_headers, allowing the
// inline start-up script SvelteKit puts in each page by its SHA-256 hash
// instead of with 'unsafe-inline'. `npm run build` runs it after vite build.
// A wrong hash stops every page from starting, which scripts/verify-deploy.ts
// checks for on the live site.
//
// Usage: node scripts/write-csp.ts [build-dir]

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { inlineScripts, policyHeader, scriptHash } from './csp.ts';
import { listFiles } from './list-files.ts';

const EXIT_NOTHING_TO_DO = 2;
const EXIT_WRONG = 1;
// SvelteKit's CSP meta tag in each prerendered page; captures its content
const OWN_POLICY = /<meta http-equiv="content-security-policy" content="([^"]*)"/i;

const [buildDir = 'build'] = process.argv.slice(2);
const headersFile = join(buildDir, '_headers');

await main();

async function main(): Promise<void> {
	if (!existsSync(buildDir)) {
		stop(`No ${buildDir} directory; build the site first.`, EXIT_NOTHING_TO_DO);
	}
	// A _headers file already in the build came from elsewhere, for example
	// static/. Overwriting it would silently drop its rules, so headers other
	// than the CSP belong in netlify.toml.
	if (existsSync(headersFile)) {
		stop(
			`${headersFile} already exists, and this script would overwrite it. Put those headers in netlify.toml.`
		);
	}

	const built = await listFiles(buildDir);
	const pages = built.filter((path) => path.endsWith('.html'));
	if (pages.length === 0) {
		stop(`No pages found in ${buildDir}; build the site first.`, EXIT_NOTHING_TO_DO);
	}

	const hashes = new Set<string>();
	for (const page of pages) {
		const pageHashes = await pageScriptHashes(page);
		for (const hash of pageHashes) {
			hashes.add(hash);
		}
	}
	if (hashes.size === 0) {
		stop(
			'No inline scripts were found in any page. SvelteKit starts every page with one, so the build is not what this script expects.'
		);
	}

	await writeFile(
		headersFile,
		`# Written by scripts/write-csp.ts after the build; do not edit. The policy is
# in scripts/csp.ts, and the other headers are in netlify.toml.
/*
  Content-Security-Policy: ${policyHeader(hashes)}
`
	);
	console.log(
		`CSP written to ${headersFile}: ${String(hashes.size)} inline scripts in ${String(pages.length)} pages allowed by hash, and no others.`
	);
}

/**
 * Returns the CSP hash source of each inline script in one built page. Exits
 * if SvelteKit's CSP meta tag for the page does not list one of them.
 */
async function pageScriptHashes(page: string): Promise<string[]> {
	const html = await readFile(join(buildDir, page), 'utf-8');
	// Browsers enforce the CSP meta tag as well as the header, so a script the
	// meta tag does not list is blocked whatever the header says. Agreeing with
	// SvelteKit's hashes also shows that scriptHash is right.
	const own = OWN_POLICY.exec(html)?.[1];
	const hashes: string[] = [];
	for (const script of inlineScripts(html)) {
		const hash = await scriptHash(script);
		if (own !== undefined && !own.includes(hash)) {
			stop(
				`${page} has an inline script that SvelteKit's own policy for the page does not name (${hash}).` +
					'\nThe browser would block it. If it was added to src/app.html, give it nonce="%sveltekit.nonce%".'
			);
		}
		hashes.push(hash);
	}
	return hashes;
}

/** Says what is wrong and ends the script */
function stop(message: string, exitCode = EXIT_WRONG): never {
	console.error(message);
	process.exit(exitCode);
}
