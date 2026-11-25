// The site's Content-Security-Policy, in one place. vite.config.ts passes it
// to SvelteKit, scripts/write-csp.ts writes it into build/_headers with the
// build's script hashes, and scripts/verify-deploy.ts checks the live site
// against it.

import type { sveltekit } from '@sveltejs/kit/vite';

/** SvelteKit's type for the `csp.directives` setting, taken from the plugin's parameters */
export type Directives = NonNullable<
	NonNullable<NonNullable<Parameters<typeof sveltekit>[0]>['csp']>['directives']
>;

// CSP keywords and hash sources, which the header must single-quote; schemes
// such as data: stay bare
const QUOTED = /^(?:self|none|unsafe-inline|wasm-unsafe-eval|sha256-.+)$/;
// The type values treated as a script ('' when there is none). A browser also
// runs text/ecmascript and the other legacy JavaScript MIME types, and checks
// import maps against script-src, but neither SvelteKit nor this app writes
// them. The rest, such as application/ld+json, make the element a data block.
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

// `satisfies` keeps the literal type, in which every directive is a list of
// sources, so policyHeader can map over it; Directives does not guarantee that
const SOURCE_LISTS = {
	// The fallback for every fetch directive not listed below, such as frame-src,
	// media-src and object-src
	'default-src': ['none'],
	// 'wasm-unsafe-eval' lets OpenPGP.js run its compiled Argon2 code, which some
	// password-protected keys need. There is no 'unsafe-inline' and no 'unsafe-eval'.
	'script-src': ['self', 'wasm-unsafe-eval'],
	// Svelte sets style attributes on elements, which only 'unsafe-inline' allows
	'style-src': ['self', 'unsafe-inline'],
	'font-src': ['self'],
	'img-src': ['self', 'data:'],
	// Same origin only: the app's own files and the wallet proxy function
	'connect-src': ['self'],
	'manifest-src': ['self'],
	'worker-src': ['self'],
	'frame-ancestors': ['none'],
	// The app has no <base> element and no form that submits, so an injected one is blocked
	'base-uri': ['none'],
	'form-action': ['none']
} satisfies Directives;

/** The policy, in the form SvelteKit's settings take */
export const directives: Directives = SOURCE_LISTS;

/**
 * Returns the policy as a Content-Security-Policy header value, with keywords
 * single-quoted and `scriptHashes` appended to script-src.
 * @param scriptHashes - Unquoted hash sources, each `sha256-<base64>`, as scriptHash returns them
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
 * Returns, in document order, the text of each inline script in an HTML page
 * with no type or the type module, text/javascript or application/javascript.
 * Scripts with a src attribute or any other type are skipped. The attribute
 * patterns also match data-src and data-type, which the build's script
 * elements do not have.
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
		// The HTML parser turns CRLF and CR into LF, so the browser hashes LF text
		found.push(text.replaceAll(LINE_ENDING, '\n'));
	}
	return found;
}

/**
 * Returns the CSP hash source for an inline script: `sha256-` and the Base64
 * SHA-256 digest of its UTF-8 text, without quotes. Any change to the text,
 * whitespace included, changes the hash.
 */
export async function scriptHash(text: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return `sha256-${btoa(String.fromCodePoint(...new Uint8Array(digest)))}`;
}

/**
 * Returns the sources of the script-src directive in a Content-Security-Policy
 * header value, as written (keywords keep their quotes). Returns undefined
 * when the header is missing or has no script-src.
 */
export function scriptSources(header: string | null | undefined): string[] | undefined {
	const part = (header ?? '')
		.split(';')
		.map((entry) => entry.trim().split(/\s+/))
		.find(([name]) => name.toLowerCase() === SCRIPT_DIRECTIVE);
	return part?.slice(1);
}

/**
 * Returns why a page served with this Content-Security-Policy header would not
 * start, or would allow any inline script, or undefined if neither applies.
 * @param hashes - Unquoted hash sources of the page's own inline scripts
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
