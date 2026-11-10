// Confirms that the live site is serving, byte for byte, the files in the local
// build directory: the build that was just signed. Run by the Deploy workflow
// after a production deploy, so a mismatch between what was attested and what
// visitors receive fails the workflow instead of going unnoticed.
//
// Usage: node scripts/verify-deploy.mjs <site-origin> [build-dir]
//   e.g. node scripts/verify-deploy.mjs https://pgp-converter.com build

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const [origin, buildDir = 'build'] = process.argv.slice(2);
if (!origin) {
	console.error('Usage: node scripts/verify-deploy.mjs <site-origin> [build-dir]');
	process.exit(2);
}

// Netlify reads these as configuration and does not serve them
const NOT_SERVED = new Set(['_headers', '_redirects']);
// The wallet proxy is a function, not a file, so it is checked for presence only
const FUNCTION_PATH = '/api/wallets/pgp-converter';
// A new deploy can take a moment to reach every CDN node
const ATTEMPTS = 6;
const RETRY_DELAY_MS = 10_000;
// No single request may hang the workflow
const FILE_TIMEOUT_MS = 30_000;
// The proxy itself waits up to 25 seconds for a sleeping upstream
const FUNCTION_TIMEOUT_MS = 60_000;

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

/** Lists every file under dir as a forward-slash path relative to it */
async function listFiles(dir, prefix = '') {
	const files = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const path = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) files.push(...(await listFiles(join(dir, entry.name), path)));
		else if (!NOT_SERVED.has(path)) files.push(path);
	}
	return files.sort();
}

/** Returns the files whose live copy differs from the local one, with the reason */
async function findMismatches(files) {
	const mismatches = [];
	for (const file of files) {
		const expected = sha256(await readFile(join(buildDir, file)));
		let actual;
		try {
			const res = await fetch(new URL(`/${file}`, origin), {
				cache: 'no-store',
				signal: AbortSignal.timeout(FILE_TIMEOUT_MS)
			});
			actual = res.ok ? sha256(Buffer.from(await res.arrayBuffer())) : `HTTP ${res.status}`;
		} catch (e) {
			actual = `request failed (${e instanceof Error ? e.message : e})`;
		}
		if (actual !== expected) mismatches.push({ file, actual });
	}
	return mismatches;
}

/**
 * Checks that the wallet proxy function was deployed. Only a 404 proves it is
 * missing: the request then fell through to the site's "not found" page. Any
 * other answer came from the function, even an error while its upstream is
 * asleep or down, so those are reported without failing the deploy.
 */
async function checkFunction() {
	try {
		const res = await fetch(new URL(FUNCTION_PATH, origin), {
			cache: 'no-store',
			signal: AbortSignal.timeout(FUNCTION_TIMEOUT_MS)
		});
		if (res.status === 404) {
			return { missing: `${FUNCTION_PATH} answered HTTP 404: the wallet proxy function was not deployed.` };
		}
		if (res.ok) return { note: 'Wallet proxy function is deployed.' };
		return { note: `Wallet proxy function is deployed, but answered HTTP ${res.status}; its upstream may be asleep or down.` };
	} catch (e) {
		const reason = e instanceof Error ? e.message : e;
		return { note: `Could not confirm the wallet proxy function (${reason}); check the donate page by hand.` };
	}
}

const files = await listFiles(buildDir);
if (files.length === 0) {
	console.error(`No files found in ${buildDir}; build the site first.`);
	process.exit(2);
}

let mismatches = [];
for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
	mismatches = await findMismatches(files);
	if (mismatches.length === 0) break;
	if (attempt < ATTEMPTS) {
		console.log(`Attempt ${attempt}: ${mismatches.length} of ${files.length} files differ; retrying in ${RETRY_DELAY_MS / 1000}s`);
		await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
	}
}

if (mismatches.length > 0) {
	console.error(`\n${mismatches.length} of ${files.length} files on ${origin} do not match the signed build:`);
	for (const { file, actual } of mismatches) console.error(`  ${file}  (${actual.length === 64 ? 'different content' : actual})`);
	console.error(
		'\nThe live site is not serving the build that was attested. Likely causes: another deploy' +
			'\nreplaced this one (for example a build by Netlify itself, if a repository has been linked' +
			'\nto the project), or the deploy step rebuilt the project instead of uploading build/ as it was.'
	);
	process.exit(1);
}
console.log(`All ${files.length} files on ${origin} match the signed build.`);

/**
 * Checks that an unknown address gets the app's own "not found" page. That page
 * is rendered by a second function, so Netlify's generic page here means the
 * function is missing. The site still works without it, so this only warns.
 */
async function checkErrorPage() {
	try {
		const res = await fetch(new URL(`/deploy-check-${Date.now()}`, origin), {
			cache: 'no-store',
			signal: AbortSignal.timeout(FILE_TIMEOUT_MS)
		});
		const body = await res.text();
		if (res.status === 404 && body.includes('PGP Converter')) return null;
		return `An unknown address answered HTTP ${res.status} without the app's own "not found" page; the page-rendering function may not have been deployed.`;
	} catch (e) {
		return `Could not check the "not found" page (${e instanceof Error ? e.message : e}).`;
	}
}

/** Prints a warning; on GitHub Actions it also appears in the run summary */
function warn(message) {
	console.log(process.env.GITHUB_ACTIONS ? `::warning::${message}` : `Warning: ${message}`);
}

const proxy = await checkFunction();
if (proxy.missing) {
	console.error(proxy.missing);
	process.exit(1);
}
if (proxy.note.startsWith('Wallet proxy function is deployed.')) console.log(proxy.note);
else warn(proxy.note);

const errorPageProblem = await checkErrorPage();
if (errorPageProblem) warn(errorPageProblem);
else console.log('The app\'s own "not found" page is served.');
