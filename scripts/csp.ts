// The site's Content-Security-Policy, in one place. vite.config.ts hands it to
// SvelteKit, scripts/write-csp.ts writes it into build/_headers, and
// scripts/verify-deploy.ts checks that the live site sends it.
//
// The policy starts from nothing: what no line below allows is refused. An
// inline script runs only if the policy names it by the hash of its text, and
// a page may connect to this site only.
//
// Nothing here uses Node's own modules, so the same code runs in the build
// scripts, in the tests and under the type checker.

import type { sveltekit } from '@sveltejs/kit/vite';

/** The directives of a policy, as SvelteKit's own settings describe them */
export type Directives = NonNullable<
	NonNullable<NonNullable<Parameters<typeof sveltekit>[0]>['csp']>['directives']
>;

// Words that a policy writes in single quotes
const QUOTED = /^(?:self|none|unsafe-inline|wasm-unsafe-eval|sha256-.+)$/;
// The script types a browser runs; anything else in a script element is data
const RUNS: ReadonlySet<string> = new Set([
	'',
	'module',
	'text/javascript',
	'application/javascript'
]);
const SCRIPT_ELEMENT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const SRC_ATTRIBUTE = /\bsrc\s*=/i;
const TYPE_ATTRIBUTE = /\btype\s*=\s*["']?([^"'\s>]*)/i;
const LINE_ENDING = /\r\n?/g;
const SCRIPT_DIRECTIVE = 'script-src';

// Every directive is a list of sources, which is what lets policyHeader write them out
const SOURCE_LISTS = {
	// Anything not named below (frames, media, plug-ins and whatever is invented next) is refused
	'default-src': ['none'],
	// 'wasm-unsafe-eval' lets OpenPGP.js run its compiled Argon2 code, which some
	// password-protected keys need. There is no 'unsafe-inline' and no 'unsafe-eval'.
	'script-src': ['self', 'wasm-unsafe-eval'],
	// Svelte sets style attributes on elements, which only 'unsafe-inline' allows
	'style-src': ['self', 'unsafe-inline'],
	'font-src': ['self'],
	'img-src': ['self', 'data:'],
	// What the page may talk to: this site, for its own files and the donation addresses
	'connect-src': ['self'],
	// The file that lets the app be installed, and the worker that keeps it for offline use
	'manifest-src': ['self'],
	'worker-src': ['self'],
	'frame-ancestors': ['none'],
	// The app has no <base> element and no form that submits anywhere, so neither is allowed to appear
	'base-uri': ['none'],
	'form-action': ['none']
} satisfies Directives;

/** The policy, in the form SvelteKit's settings take */
export const directives: Directives = SOURCE_LISTS;

/**
 * Writes the policy as the value of a Content-Security-Policy header.
 * @param scriptHashes - The inline scripts to allow, each as `sha256-...`
 * @returns The header value
 */
export function policyHeader(scriptHashes: Iterable<string> = []): string {
	return Object.entries(SOURCE_LISTS)
		.map(([name, sources]: [string, readonly string[]]) => {
			const all = name === SCRIPT_DIRECTIVE ? [...sources, ...scriptHashes] : sources;
			const written = all.map((source) => (QUOTED.test(source) ? `'${source}'` : source));
			return `${name} ${written.join(' ')}`;
		})
		.join('; ');
}

/**
 * Finds the scripts written into a page that a browser would run.
 * @param html - The page
 * @returns The text of each one, as the browser sees it
 */
export function inlineScripts(html: string): string[] {
	const found: string[] = [];
	for (const [, attributes, text] of html.matchAll(SCRIPT_ELEMENT)) {
		if (SRC_ATTRIBUTE.test(attributes)) {
			continue;
		}
		const type = TYPE_ATTRIBUTE.exec(attributes)?.[1] ?? '';
		if (!RUNS.has(type.toLowerCase())) {
			continue;
		}
		// A browser turns every line ending into a line feed before it hashes
		found.push(text.replaceAll(LINE_ENDING, '\n'));
	}
	return found;
}

/**
 * Works out the name a policy uses for one inline script.
 * @param text - The script's exact text
 * @returns `sha256-` followed by the hash in base64
 */
export async function scriptHash(text: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return `sha256-${btoa(String.fromCodePoint(...new Uint8Array(digest)))}`;
}

/**
 * Reads the script part of a policy.
 * @param header - A Content-Security-Policy header value
 * @returns The sources script-src lists, or undefined if the policy has none
 */
export function scriptSources(header: string | null | undefined): string[] | undefined {
	const part = (header ?? '')
		.split(';')
		.map((entry) => entry.trim().split(/\s+/))
		.find(([name]) => name.toLowerCase() === SCRIPT_DIRECTIVE);
	return part?.slice(1);
}

/**
 * Says what in a policy would stop a page from starting, or weaken it.
 * @param header - The Content-Security-Policy header a page was served with
 * @param hashes - The `sha256-...` names of that page's inline scripts
 * @returns The problem, or undefined if there is none
 */
export function policyProblem(
	header: string | null | undefined,
	hashes: readonly string[]
): string | undefined {
	if (!header) {
		return 'no Content-Security-Policy header';
	}
	const sources = scriptSources(header);
	if (!sources) {
		return 'the policy has no script-src';
	}
	if (sources.includes("'unsafe-inline'")) {
		return "script-src allows 'unsafe-inline'";
	}
	const missing = hashes.filter((hash) => !sources.includes(`'${hash}'`));
	if (missing.length > 0) {
		return `the policy does not name ${String(missing.length)} of the page's own scripts, so the page cannot start`;
	}
	return undefined;
}
