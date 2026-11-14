// Writes the Content-Security-Policy header into build/_headers, for every
// file Netlify serves. `npm run build` runs it after each build.
//
// SvelteKit starts each page with a short inline script. Instead of allowing
// every inline script ('unsafe-inline'), this names the ones the build
// produced by the hash of their text. If it names the wrong hashes no page
// can start, which scripts/verify-deploy.ts checks on the live site.
//
// Usage: node scripts/write-csp.ts [build-dir]

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { inlineScripts, policyHeader, scriptHash } from './csp.ts';
import { listFiles } from './list-files.ts';

// What the script ends with when the build is not there to work on
const EXIT_NOTHING_TO_DO = 2;
const EXIT_WRONG = 1;
// SvelteKit writes its own copy of the policy into each page it renders
const OWN_POLICY = /<meta http-equiv="content-security-policy" content="([^"]*)"/i;

const [buildDir = 'build'] = process.argv.slice(2);
const headersFile = join(buildDir, '_headers');

await main();

async function main(): Promise<void> {
	if (!existsSync(buildDir)) {
		stop(`No ${buildDir} directory; build the site first.`, EXIT_NOTHING_TO_DO);
	}
	// The SvelteKit adapter copies a _headers file from the project root into the
	// build. Two sources for one header would give browsers two policies.
	if (existsSync(headersFile)) {
		stop(`${headersFile} already exists. Put headers in netlify.toml; this script owns that file.`);
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
		`Content policy written to ${headersFile}: ${String(hashes.size)} inline scripts in ${String(pages.length)} pages allowed by hash, and no others.`
	);
}

/** Works out the policy's name for each inline script in one page of the build */
async function pageScriptHashes(page: string): Promise<string[]> {
	const html = await readFile(join(buildDir, page), 'utf-8');
	// Browsers enforce the page's own copy of the policy as well as the header,
	// so a script that copy does not name would be blocked whatever the header
	// says. Agreeing with it also shows that the hashing here is right.
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
