// Compares a deployed copy of the site with a local build, byte for byte:
// every file, and every page again at its extensionless path (/encrypt for
// encrypt.html). Each page must also arrive with a CSP that lists the hashes
// of its inline scripts and does not allow 'unsafe-inline'. deploy.yml runs
// this after each production and staging deploy, and image.yml runs it
// against the Docker image before pushing it and again before attesting it.
//
// Every mode fails if one of OFF_SITE_PROBES redirects to another origin, and
// warns if a path that does not exist gets anything but the build's 404.html,
// or if the manifest has the wrong Content-Type. Production, the default,
// also checks X-Robots-Tag, the wallet proxy function, the HSTS preload
// requirements and the redirect from pgp-converter.netlify.app. --staging
// instead warns if noindex is missing, and skips the wallet proxy, HSTS and
// the redirect.
// --self-hosted requires every page to carry exactly the CSP in the build's
// _headers, and skips the checks that only concern pgp-converter.com.
//
// Usage: node scripts/verify-deploy.ts <site-origin> [build-dir] [--staging | --self-hosted]
//   e.g. node scripts/verify-deploy.ts https://pgp-converter.com build
//        node scripts/verify-deploy.ts http://localhost:8080 build --self-hosted

import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readCheckArgs } from './check-args.ts';
import { inlineScripts, policyProblem, scriptHash } from './csp.ts';
import { listFiles } from './list-files.ts';
import { leavesSite } from './off-site.ts';
import { missingForPreload } from './preload-header.ts';
import { asksNotToBeListed } from './robots-header.ts';

interface Target {
	file: string;
	address: string;
}

interface Mismatch {
	address: string;
	/** The hex SHA-256 digest of the response body, or a description of the failure */
	actual: string;
}

interface FunctionCheck {
	/** Set when the function is not deployed, which fails the run */
	missing?: string;
	/** FUNCTION_DEPLOYED, or a warning if the function returned an error or no response */
	note?: string;
}

interface ListingCheck {
	/** Set when production sends noindex, which fails the run */
	failure?: string;
	/** Set when staging does not send noindex, or the request failed */
	warning?: string;
}

// Netlify reads these as configuration and does not serve them
const HEADERS_FILE = '_headers';
const NOT_SERVED: ReadonlySet<string> = new Set([HEADERS_FILE, '_redirects']);
// Captures the CSP value from _headers, as scripts/write-csp.ts writes it
const POLICY_LINE = /^\s+Content-Security-Policy:\s*(.+?)\s*$/im;
// Compared as /404.html like any other file, then by requesting a path that
// does not exist (checkErrorPage). It has no extensionless path of its own.
const NOT_FOUND_PAGE = '404.html';
// A Netlify function, not a build file, so only its presence is checked.
// Keep in sync with WALLETS_ENDPOINT in src/lib/donations.ts.
const FUNCTION_PATH = '/.netlify/functions/wallet-proxy';
const FUNCTION_DEPLOYED = 'Wallet proxy function is deployed.';
const FUNCTION_NOT_CHECKED =
	'Wallet proxy function is not checked: the Donate page of a staging copy shows fake addresses.';
const FUNCTION_NOT_CHECKED_SELF_HOSTED =
	'Wallet proxy function is not checked: the Donate page of a self-hosted copy links to the released site.';
// netlify.toml sets this Content-Type, because Netlify does not know the
// .webmanifest extension
const MANIFEST_PATH = '/manifest.webmanifest';
const MANIFEST_TYPE = 'application/manifest+json';
// netlify.toml redirects the project's Netlify subdomain to the custom domain
const RELEASED_HOST = 'pgp-converter.com';
const NETLIFY_SUBDOMAIN_URL = 'https://pgp-converter.netlify.app';
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
const HTTP_MOVED_PERMANENTLY = 301;
// The length of a hex SHA-256 digest, which tells a digest in Mismatch.actual
// from a description of a failure
const HASH_LENGTH = 64;
const POLICY_PREFIX = 'CSP';
const META_REFRESH = /<meta http-equiv="refresh"/i;
const ROBOTS_HEADER = 'x-robots-tag';
// A server that decodes the path and redirects it without the trailing slash
// would send Location: /\off-site.example or /<tab>/off-site.example for
// these. Browsers read a backslash as a slash and strip tabs, so both lead to
// //off-site.example.
const OFF_SITE_PROBES: readonly string[] = [
	'/%5Coff-site.example/',
	'/%5C%5Coff-site.example/',
	'/%09/off-site.example/'
];
const REQUEST_FAILED = 'request failed';
const SELF_HOSTED_HINT = [
	'',
	'The copy is not serving the same files, or the same policy, as this build. Check that both were',
	'built from the same commit, with GITHUB_SHA and SOURCE_DATE_EPOCH set as the README shows under',
	'"Reproducing a Build", and that the server takes its policy from build/_headers (as docker/Caddyfile does).'
].join('\n');
const USAGE =
	'Usage: node scripts/verify-deploy.ts <site-origin> [build-dir] [--staging | --self-hosted]';
const EXIT_USAGE = 2;

const checkArgs = readCheckArgs(process.argv.slice(2), isFolder);
if (!checkArgs.data) {
	console.error(`${checkArgs.error ?? 'The arguments cannot be used.'}\n${USAGE}`);
	process.exit(EXIT_USAGE);
}
const { origin, buildDir, isStaging, isSelfHosted } = checkArgs.data;
// With --self-hosted, the exact CSP every page must carry; main() reads it from the build
let expectedPolicy: string | undefined;

await main();

async function main(): Promise<void> {
	const built = await listFiles(buildDir);
	const files = built.filter((path) => !NOT_SERVED.has(path));
	if (files.length === 0) {
		console.error(`No files found in ${buildDir}; build the site first.`);
		process.exit(EXIT_USAGE);
	}
	if (isSelfHosted) {
		expectedPolicy = await builtPolicy();
	}

	const targets = await listTargets(files);
	const mismatches = await findMismatchesWithRetries(targets);
	if (mismatches.length > 0) {
		reportMismatches(mismatches, targets.length);
		process.exit(1);
	}
	const pageCount = targets.length - files.length;
	console.log(
		`All ${String(files.length)} files on ${origin} match the build in ${buildDir}/, as do the ${String(pageCount)} pages at their extensionless paths.` +
			"\nEvery page has a CSP that allows its inline scripts by hash, without 'unsafe-inline'."
	);
	const offSite = await findOffSiteRedirects();
	if (offSite.length > 0) {
		console.error(
			`${origin} redirects off-site from ${offSite.join(', ')}: the redirect copies the request path into its Location header unchanged.`
		);
		process.exit(1);
	}
	console.log('None of the off-site redirect probes left the site.');
	if (isSelfHosted) {
		console.log(`Every page arrives with exactly the CSP in ${buildDir}/${HEADERS_FILE}.`);
		console.log(FUNCTION_NOT_CHECKED_SELF_HOSTED);
		await checkEverywhere();
		return;
	}

	const listing = await checkSearchListing();
	if (listing.failure) {
		console.error(listing.failure);
		process.exit(1);
	}
	if (listing.warning) {
		warn(listing.warning);
	} else {
		console.log(
			isStaging
				? 'The staging copy sends noindex in X-Robots-Tag.'
				: 'The site does not send noindex in X-Robots-Tag.'
		);
	}

	if (isStaging) {
		console.log(FUNCTION_NOT_CHECKED);
	} else {
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
	}

	await checkEverywhere();

	// Browsers ignore HSTS over plain HTTP, so a local preview is skipped, and
	// the staging hostname belongs to Netlify, not to the preloaded domain
	if (isStaging || new URL(origin).protocol !== 'https:') {
		return;
	}
	const preloadProblem = await checkPreloadHeader();
	if (preloadProblem) {
		warn(preloadProblem);
	} else {
		console.log('Strict-Transport-Security meets the HSTS preload list requirements.');
	}

	// Only pgp-converter.com has a Netlify subdomain that redirects to it
	if (new URL(origin).hostname !== RELEASED_HOST) {
		return;
	}
	const netlifySubdomainProblem = await checkNetlifySubdomain();
	if (netlifySubdomainProblem) {
		warn(netlifySubdomainProblem);
	} else {
		console.log(`${NETLIFY_SUBDOMAIN_URL} redirects to the released site.`);
	}
}

function isFolder(path: string): boolean {
	return statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false;
}

/**
 * Requests each of OFF_SITE_PROBES without following redirects, and returns
 * those whose Location leads to another origin, with the target. A request
 * that fails counts as no redirect.
 */
async function findOffSiteRedirects(): Promise<string[]> {
	const found: string[] = [];
	for (const probe of OFF_SITE_PROBES) {
		const res = await fetch(new URL(probe, origin), {
			redirect: 'manual',
			cache: 'no-store',
			signal: AbortSignal.timeout(FILE_TIMEOUT_MS)
		}).catch(() => null);
		const location = res?.headers.get('location') ?? null;
		if (leavesSite(location, origin)) {
			found.push(`${probe} (to ${String(location)})`);
		}
	}
	return found;
}

/** Runs the checks that apply in every mode and only warn: the 404 page and the manifest */
async function checkEverywhere(): Promise<void> {
	const errorPageProblem = await checkErrorPage();
	if (errorPageProblem) {
		warn(errorPageProblem);
	} else {
		console.log(
			"A path that does not exist gets the build's 404.html with status 404, and a CSP that allows its inline scripts by hash, without 'unsafe-inline'."
		);
	}

	const manifestProblem = await checkManifestType();
	if (manifestProblem) {
		warn(manifestProblem);
	} else {
		console.log('manifest.webmanifest is served as application/manifest+json.');
	}
}

/** Returns the CSP in the build's _headers, or exits if the file or the header is missing */
async function builtPolicy(): Promise<string> {
	const file = join(buildDir, HEADERS_FILE);
	const policy = POLICY_LINE.exec(await readFile(file, 'utf-8').catch(() => ''))?.[1];
	if (!policy) {
		console.error(`${file} holds no Content-Security-Policy; build the site first.`);
		process.exit(EXIT_USAGE);
	}
	return policy;
}

/**
 * Returns the extensionless path a page is served at (/encrypt for
 * encrypt.html, /docs/ for docs/index.html, / for index.html), or undefined
 * for a file that is not HTML.
 */
function pagePath(file: string): string | undefined {
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
 * Returns true for a page that only redirects with a meta refresh, such as
 * help.html. Only the .html file itself is compared: netlify.toml redirects
 * its extensionless path before the file is served, and a self-hosted copy
 * serves the same file at that path, so comparing it there would add nothing.
 */
async function isMetaRefreshPage(file: string): Promise<boolean> {
	return META_REFRESH.test(await readFile(join(buildDir, file), 'utf-8'));
}

/**
 * Returns each file at its own path, plus each page at its extensionless path,
 * except 404.html and meta refresh pages
 */
async function listTargets(files: readonly string[]): Promise<Target[]> {
	const targets: Target[] = files.map((file) => ({ file, address: `/${file}` }));
	for (const file of files) {
		const address = pagePath(file);
		if (address && file !== NOT_FOUND_PAGE && !(await isMetaRefreshPage(file))) {
			targets.push({ file, address });
		}
	}
	return targets;
}

/** Returns the targets whose response differs from the build, or whose page has the wrong CSP */
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
			actual = `${REQUEST_FAILED} (${describeError(e)})`;
		}
		if (actual !== expected) {
			mismatches.push({ address, actual });
		} else if (file.endsWith(HTML_ENDING)) {
			// The right bytes are not enough: a CSP without the page's script hashes
			// stops it starting, and a self-hosted copy must send the build's own CSP
			const problem =
				policyProblem(policy, await pageHashes(local)) ??
				(expectedPolicy === undefined || policy === expectedPolicy
					? undefined
					: `not the policy in ${HEADERS_FILE}`);
			if (problem) {
				mismatches.push({ address, actual: `${POLICY_PREFIX}: ${problem}` });
			}
		}
	}
	return mismatches;
}

/**
 * Runs findMismatches up to ATTEMPTS times, RETRY_DELAY_MS apart, while a new
 * deploy propagates across the CDN. Returns the last attempt's mismatches.
 */
async function findMismatchesWithRetries(targets: readonly Target[]): Promise<Mismatch[]> {
	let mismatches: Mismatch[] = [];
	for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
		mismatches = await findMismatches(targets);
		if (mismatches.length === 0 || attempt === ATTEMPTS) {
			break;
		}
		console.log(
			`Attempt ${String(attempt)}: ${String(mismatches.length)} of ${String(targets.length)} paths are not right yet; retrying in ${String(RETRY_DELAY_MS / MS_PER_SECOND)}s`
		);
		await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
	}
	return mismatches;
}

/** Prints the mismatches and their most likely cause */
function reportMismatches(mismatches: readonly Mismatch[], targetCount: number): void {
	// In CI the build is the workflow's own. Anyone else is comparing a rebuild
	// ("Reproducing a Build" in the README), which differs for other reasons.
	const isWorkflow = Boolean(process.env.GITHUB_ACTIONS);
	const deployed = deployedBuild();
	const build = isWorkflow ? deployed : `the build in ${buildDir}/`;
	console.error(
		`\n${String(mismatches.length)} of ${String(targetCount)} paths on ${origin} do not match ${build}:`
	);
	for (const { address, actual } of mismatches) {
		console.error(
			`  ${address}  (${actual.length === HASH_LENGTH ? 'different content' : actual})`
		);
	}
	// If every request failed, nothing is answering, so the advice about builds does not apply
	if (
		mismatches.length === targetCount &&
		mismatches.every(({ actual }) => actual.startsWith(REQUEST_FAILED))
	) {
		console.error(
			`\nNothing answered at ${origin}. Check that the site is running and that the host and port are right.`
		);
		return;
	}
	if (isSelfHosted) {
		console.error(SELF_HOSTED_HINT);
		return;
	}
	if (mismatches.some(({ actual }) => !actual.startsWith(POLICY_PREFIX))) {
		console.error(
			isWorkflow
				? `\nThe site is not serving ${deployed}. Likely causes: another deploy` +
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

/** Describes, for the CI messages, the build the site is compared with */
function deployedBuild(): string {
	if (isSelfHosted) {
		return 'the production build of this commit';
	}
	return isStaging ? 'the build that was just deployed' : 'the signed build';
}

/**
 * Checks that the wallet proxy function is deployed. Only a 404 means it is
 * not: the request fell through to the 404 page. Any other status came from
 * the function itself, such as a 5xx while its upstream wakes, so it only warns.
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
					'cannot show addresses. Either it was not deployed or something else answers at its path.'
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
 * Checks X-Robots-Tag on the root URL. Staging should send noindex, or search
 * engines may list it beside the released site, so its absence warns.
 * Production must not: noindex there drops the site from search results with
 * nothing else visibly wrong, so it fails the run.
 */
async function checkSearchListing(): Promise<ListingCheck> {
	let header: string | null;
	try {
		const res = await fetch(origin, {
			method: 'HEAD',
			cache: 'no-store',
			signal: AbortSignal.timeout(FILE_TIMEOUT_MS)
		});
		header = res.headers.get(ROBOTS_HEADER);
	} catch (e: unknown) {
		return { warning: `Could not check the X-Robots-Tag header (${describeError(e)}).` };
	}
	const sendsNoindex = asksNotToBeListed(header);
	if (isStaging) {
		return sendsNoindex
			? {}
			: {
					warning:
						'The staging copy does not send "X-Robots-Tag: noindex", so search engines may list it beside the released site.'
				};
	}
	return sendsNoindex
		? {
				failure: `${origin} sends "X-Robots-Tag: ${header ?? ''}", which asks search engines not to index the site. That header is for the staging copy alone.`
			}
		: {};
}

/**
 * Requests a URL that does not exist and checks for status 404, the build's
 * 404.html byte for byte, and a CSP that lets it start. Netlify's own error
 * page here means 404.html did not deploy or is not used. The rest of the site
 * works either way, so this only warns. Returns the problem, or undefined.
 */
async function checkErrorPage(): Promise<string | undefined> {
	let local: Buffer;
	try {
		local = await readFile(join(buildDir, NOT_FOUND_PAGE));
	} catch {
		return `The build has no ${NOT_FOUND_PAGE}, so a path that does not exist gets the host's own page.`;
	}
	try {
		const missingUrl = new URL(`/deploy-check-${String(Date.now())}`, origin);
		const res = await fetch(missingUrl, {
			cache: 'no-store',
			signal: AbortSignal.timeout(FILE_TIMEOUT_MS)
		});
		const body = Buffer.from(await res.arrayBuffer());
		if (res.status !== HTTP_NOT_FOUND) {
			return `A path that does not exist answered HTTP ${String(res.status)} where 404 was expected.`;
		}
		if (sha256(body) !== sha256(local)) {
			return `A path that does not exist is not answered with the build's ${NOT_FOUND_PAGE}; visitors who mistype a URL see something else.`;
		}
		const problem = policyProblem(
			res.headers.get('content-security-policy'),
			await pageHashes(local)
		);
		return problem ? `The 404 page fails the CSP check: ${problem}.` : undefined;
	} catch (e: unknown) {
		return `Could not check the 404 page (${describeError(e)}).`;
	}
}

/**
 * Checks that the manifest is served as application/manifest+json. Browsers
 * load it whatever its Content-Type, so this only warns. Returns the problem,
 * or undefined.
 */
async function checkManifestType(): Promise<string | undefined> {
	try {
		const res = await fetch(new URL(MANIFEST_PATH, origin), {
			cache: 'no-store',
			signal: AbortSignal.timeout(FILE_TIMEOUT_MS)
		});
		const type = res.headers.get('content-type') ?? 'no type';
		return type.startsWith(MANIFEST_TYPE)
			? undefined
			: `${MANIFEST_PATH} is served as "${type}" where ${MANIFEST_TYPE} was expected; the rule for it in netlify.toml is not being applied.`;
	} catch (e: unknown) {
		return `Could not check the type of ${MANIFEST_PATH} (${describeError(e)}).`;
	}
}

/**
 * Checks that Strict-Transport-Security still meets the HSTS preload list's
 * requirements (see preload-header.ts); otherwise the domain is removed from
 * the list. The site works either way, so this only warns. Returns the
 * problem, or undefined.
 */
async function checkPreloadHeader(): Promise<string | undefined> {
	try {
		const res = await fetch(origin, {
			method: 'HEAD',
			cache: 'no-store',
			signal: AbortSignal.timeout(FILE_TIMEOUT_MS)
		});
		const header = res.headers.get('strict-transport-security');
		const missing = missingForPreload(header);
		return missing.length === 0
			? undefined
			: `The Strict-Transport-Security header (${header ? `"${header}"` : 'not sent'}) lacks ${missing.join(' and ')}. The domain was submitted to the HSTS preload list, which drops a site that stops sending them.`;
	} catch (e: unknown) {
		return `Could not check the Strict-Transport-Security header (${describeError(e)}).`;
	}
}

/**
 * Checks that pgp-converter.netlify.app answers with a 301 to the origin, as
 * netlify.toml configures. Without it the same build is served on a second
 * hostname, where the app labels itself a test copy. The released site works
 * either way, so this only warns. Returns the problem, or undefined.
 */
async function checkNetlifySubdomain(): Promise<string | undefined> {
	try {
		const res = await fetch(NETLIFY_SUBDOMAIN_URL, {
			method: 'HEAD',
			redirect: 'manual',
			cache: 'no-store',
			signal: AbortSignal.timeout(FILE_TIMEOUT_MS)
		});
		const target = res.headers.get('location') ?? '';
		return res.status === HTTP_MOVED_PERMANENTLY && target.startsWith(origin)
			? undefined
			: `${NETLIFY_SUBDOMAIN_URL} answered HTTP ${String(res.status)} where a redirect to ${origin} was expected; the rule for it in netlify.toml is not being applied.`;
	} catch (e: unknown) {
		return `Could not check ${NETLIFY_SUBDOMAIN_URL} (${describeError(e)}).`;
	}
}

/** Returns the CSP hash source of each inline script in a page */
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
	if (!(e instanceof Error)) {
		return String(e);
	}
	// Node's fetch throws "fetch failed" with the reason in `cause`. When every IP
	// address of a host refuses (localhost resolves to ::1 and 127.0.0.1), the
	// cause is an AggregateError with an empty message and only a code.
	const own = e.message || errorCode(e);
	return e.cause === undefined ? own : `${own}: ${describeError(e.cause)}`;
}

/** The code Node gives a system error, such as ECONNREFUSED, or an empty string */
function errorCode(e: Error): string {
	return 'code' in e && typeof e.code === 'string' ? e.code : '';
}
