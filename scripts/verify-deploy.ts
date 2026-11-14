// Confirms that the live site serves, byte for byte, the files in the local
// build directory: the build that was just signed. Pages are checked as the
// file (/encrypt.html) and at the address visitors ask for (/encrypt), and
// each must arrive with a content policy that lets it start and allows no
// other inline script. An address that does not exist must get the build's
// 404.html. The Deploy workflow runs this after a production deploy.
//
// Usage: node scripts/verify-deploy.ts <site-origin> [build-dir]
//   e.g. node scripts/verify-deploy.ts https://pgp-converter.com build

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { inlineScripts, policyProblem, scriptHash } from './csp.ts';
import { listFiles } from './list-files.ts';

/** An address on the live site, and the local file it must match */
interface Target {
	file: string;
	address: string;
}

/** An address that did not answer as it should, and what it answered instead */
interface Mismatch {
	address: string;
	/** The hash of what was served, or a description of what went wrong */
	actual: string;
}

/** What asking for the wallet proxy showed */
interface FunctionCheck {
	/** Set when the function cannot be reached, which fails the run */
	missing?: string;
	/** Anything else worth saying about it */
	note?: string;
}

// Netlify reads these as configuration and does not serve them
const NOT_SERVED: ReadonlySet<string> = new Set(['_headers', '_redirects']);
// The page for an address that does not exist. It is compared as a file like
// the rest, and then at an address made up for the purpose, which is how it
// is really served; it has no address of its own to check.
const NOT_FOUND_PAGE = '404.html';
// The wallet proxy is a function, not a file, so it is checked for presence only.
// This is its default address; src/lib/donations.ts asks for the same one.
const FUNCTION_PATH = '/.netlify/functions/wallet-proxy';
const FUNCTION_DEPLOYED = 'Wallet proxy function is deployed.';
// A new deploy can take a moment to reach every CDN node
const ATTEMPTS = 6;
const RETRY_DELAY_MS = 10_000;
const MS_PER_SECOND = 1000;
// No single request may hang the workflow
const FILE_TIMEOUT_MS = 30_000;
// The proxy itself waits up to 25 seconds for a sleeping upstream
const FUNCTION_TIMEOUT_MS = 60_000;
const HTML_ENDING = '.html';
const HTTP_NOT_FOUND = 404;
// A SHA-256 hash in hexadecimal; anything else in a mismatch is a description
const HASH_LENGTH = 64;
const POLICY_PREFIX = 'content policy';
const FORWARDS_ELSEWHERE = /<meta http-equiv="refresh"/i;
const EXIT_USAGE = 2;

const [origin = '', buildDir = 'build'] = process.argv.slice(2);

await main();

async function main(): Promise<void> {
	if (!origin) {
		console.error('Usage: node scripts/verify-deploy.ts <site-origin> [build-dir]');
		process.exit(EXIT_USAGE);
	}
	const built = await listFiles(buildDir);
	const files = built.filter((path) => !NOT_SERVED.has(path));
	if (files.length === 0) {
		console.error(`No files found in ${buildDir}; build the site first.`);
		process.exit(EXIT_USAGE);
	}

	const targets = await listTargets(files);
	const mismatches = await findMismatchesWithRetries(targets);
	if (mismatches.length > 0) {
		reportMismatches(mismatches, targets.length);
		process.exit(1);
	}
	const pageCount = targets.length - files.length;
	console.log(
		`All ${String(files.length)} files on ${origin} match the build in ${buildDir}/, as do the ${String(pageCount)} page addresses that serve them.` +
			'\nEvery page arrives with a content policy that names its own start-up script and allows no other inline script.'
	);

	const proxy = await checkFunction();
	if (proxy.missing) {
		console.error(proxy.missing);
		process.exit(1);
	}
	if (proxy.note === FUNCTION_DEPLOYED) {
		console.log(proxy.note);
	} else if (proxy.note) {
		warn(proxy.note);
	}

	const errorPageProblem = await checkErrorPage();
	if (errorPageProblem) {
		warn(errorPageProblem);
	} else {
		console.log(
			"An address that does not exist is answered with the build's own 404 page, under the same policy."
		);
	}
}

/**
 * The address a page is visited at: /encrypt for encrypt.html, / for index.html.
 * @returns The address, or undefined for a file that is not a page
 */
function pageAddress(file: string): string | undefined {
	if (!file.endsWith(HTML_ENDING)) {
		return undefined;
	}
	const path = file.slice(0, -HTML_ENDING.length);
	if (path === 'index') {
		return '/';
	}
	return `/${path.endsWith('/index') ? path.slice(0, -'index'.length) : path}`;
}

/**
 * Says whether a page only forwards to another one. The host redirects such an
 * address itself (see [[redirects]] in netlify.toml), so the address does not
 * answer with this file and is not compared with it. The file is still checked.
 */
async function isForwardingPage(file: string): Promise<boolean> {
	return FORWARDS_ELSEWHERE.test(await readFile(join(buildDir, file), 'utf-8'));
}

/** Every address to check, with the local file it must match */
async function listTargets(files: readonly string[]): Promise<Target[]> {
	const targets: Target[] = files.map((file) => ({ file, address: `/${file}` }));
	for (const file of files) {
		const address = pageAddress(file);
		if (address && file !== NOT_FOUND_PAGE && !(await isForwardingPage(file))) {
			targets.push({ file, address });
		}
	}
	return targets;
}

/** The addresses whose live content differs from the local file, with the reason */
async function findMismatches(targets: readonly Target[]): Promise<Mismatch[]> {
	const mismatches: Mismatch[] = [];
	for (const { file, address } of targets) {
		const local = await readFile(join(buildDir, file));
		const expected = sha256(local);
		let actual: string;
		let policy: string | null = null;
		try {
			const res = await fetch(new URL(address, origin), {
				cache: 'no-store',
				signal: AbortSignal.timeout(FILE_TIMEOUT_MS)
			});
			actual = res.ok ? sha256(Buffer.from(await res.arrayBuffer())) : `HTTP ${String(res.status)}`;
			policy = res.headers.get('content-security-policy');
		} catch (e: unknown) {
			actual = `request failed (${describeError(e)})`;
		}
		if (actual !== expected) {
			mismatches.push({ address, actual });
		} else if (file.endsWith(HTML_ENDING)) {
			// The right page with the wrong policy is a page that cannot start
			const problem = policyProblem(policy, await pageHashes(local));
			if (problem) {
				mismatches.push({ address, actual: `${POLICY_PREFIX}: ${problem}` });
			}
		}
	}
	return mismatches;
}

/** Looks again a few times before giving up: a deploy spreads across the host's servers in stages */
async function findMismatchesWithRetries(targets: readonly Target[]): Promise<Mismatch[]> {
	let mismatches: Mismatch[] = [];
	for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
		mismatches = await findMismatches(targets);
		if (mismatches.length === 0 || attempt === ATTEMPTS) {
			break;
		}
		console.log(
			`Attempt ${String(attempt)}: ${String(mismatches.length)} of ${String(targets.length)} addresses are not right yet; retrying in ${String(RETRY_DELAY_MS / MS_PER_SECOND)}s`
		);
		await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
	}
	return mismatches;
}

/** Lists what does not match, and says what most likely explains it */
function reportMismatches(mismatches: readonly Mismatch[], targetCount: number): void {
	// The workflow compares the site with the build it has just signed. Anyone
	// else is comparing it with a build of their own (see "Reproducing a Build"
	// in the README), and the likely reasons for a difference are not the same.
	const isWorkflow = Boolean(process.env.GITHUB_ACTIONS);
	const build = isWorkflow ? 'the signed build' : `the build in ${buildDir}/`;
	console.error(
		`\n${String(mismatches.length)} of ${String(targetCount)} addresses on ${origin} do not match ${build}:`
	);
	for (const { address, actual } of mismatches) {
		console.error(
			`  ${address}  (${actual.length === HASH_LENGTH ? 'different content' : actual})`
		);
	}
	if (mismatches.some(({ actual }) => !actual.startsWith(POLICY_PREFIX))) {
		console.error(
			isWorkflow
				? '\nThe live site is not serving the build that was attested. Likely causes: another deploy' +
						'\nreplaced this one (for example a build by Netlify itself, if a repository has been linked' +
						'\nto the project), or the deploy step rebuilt the project instead of uploading build/ as it was.'
				: '\nThe live site is not serving the same files as this build. If you built it to compare, check' +
						'\nthat you are on the commit the site names in /_app/version.json, and that GITHUB_SHA and' +
						'\nSOURCE_DATE_EPOCH were set as the README shows under "Reproducing a Build". If they were,' +
						'\nthe site is serving something other than that commit builds.'
		);
	}
	if (mismatches.some(({ actual }) => actual.startsWith(POLICY_PREFIX))) {
		console.error(
			'\nA page is being served with a Content-Security-Policy that does not fit it, so visitors may be' +
				'\nlooking at a page that cannot start. The policy is written into build/_headers by' +
				'\nscripts/write-csp.ts. Check that the build ran it, that netlify.toml sets no policy of its' +
				'\nown, and that the file reached Netlify. Rolling back to the previous deploy in the Netlify' +
				'\ndashboard puts the site right while this is looked into.'
		);
	}
}

/**
 * Checks that the wallet proxy function can be reached. Only a 404 proves it
 * cannot: the request then fell through to a "not found" page, because the
 * function was not deployed or something else answers at its address. Any
 * other answer came from the function, even an error while its upstream is
 * asleep or down, so those are reported without failing the deploy.
 */
async function checkFunction(): Promise<FunctionCheck> {
	try {
		const res = await fetch(new URL(FUNCTION_PATH, origin), {
			cache: 'no-store',
			signal: AbortSignal.timeout(FUNCTION_TIMEOUT_MS)
		});
		if (res.status === HTTP_NOT_FOUND) {
			return {
				missing:
					`${FUNCTION_PATH} answered HTTP 404: the wallet proxy function cannot be reached, so the donate page ` +
					'cannot show addresses. Either it was not deployed or something else answers at its address.'
			};
		}
		if (res.ok) {
			return { note: FUNCTION_DEPLOYED };
		}
		return {
			note: `Wallet proxy function is deployed, but answered HTTP ${String(res.status)}; its upstream may be asleep or down.`
		};
	} catch (e: unknown) {
		return {
			note: `Could not confirm the wallet proxy function (${describeError(e)}); check the donate page by hand.`
		};
	}
}

/**
 * Checks that an address that does not exist gets the app's own "not found"
 * page: the build's 404.html, byte for byte, with a 404 and with a policy that
 * lets it start. Netlify serves that file wherever no other file answers. Its
 * own plain page here would mean the file did not reach it or is not being
 * used. The rest of the site works either way, so this only warns.
 * @returns What is wrong, or undefined if nothing is
 */
async function checkErrorPage(): Promise<string | undefined> {
	let local: Buffer;
	try {
		local = await readFile(join(buildDir, NOT_FOUND_PAGE));
	} catch {
		return `The build has no ${NOT_FOUND_PAGE}, so an address that does not exist gets the host's own page.`;
	}
	try {
		const missingAddress = new URL(`/deploy-check-${String(Date.now())}`, origin);
		const res = await fetch(missingAddress, {
			cache: 'no-store',
			signal: AbortSignal.timeout(FILE_TIMEOUT_MS)
		});
		const body = Buffer.from(await res.arrayBuffer());
		if (res.status !== HTTP_NOT_FOUND) {
			return `An address that does not exist answered HTTP ${String(res.status)} where 404 was expected.`;
		}
		if (sha256(body) !== sha256(local)) {
			return `An address that does not exist is not answered with the build's ${NOT_FOUND_PAGE}; visitors who mistype an address see something else.`;
		}
		const problem = policyProblem(
			res.headers.get('content-security-policy'),
			await pageHashes(local)
		);
		return problem
			? `The "not found" page is served with a content policy that does not fit it: ${problem}.`
			: undefined;
	} catch (e: unknown) {
		return `Could not check the "not found" page (${describeError(e)}).`;
	}
}

/** The policy's names for the inline scripts of a page */
function pageHashes(page: Buffer): Promise<string[]> {
	return Promise.all(inlineScripts(page.toString('utf-8')).map((script) => scriptHash(script)));
}

/** Prints a warning; on GitHub Actions it also appears in the run summary */
function warn(message: string): void {
	console.log(process.env.GITHUB_ACTIONS ? `::warning::${message}` : `Warning: ${message}`);
}

function sha256(data: Buffer): string {
	return createHash('sha256').update(data).digest('hex');
}

function describeError(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}
