import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { toCaddyHeaders } from './caddy-headers.ts';

// The Docker image must send the same headers as the released site, except
// HSTS. The CSP comes from each build; the rest are in docker/Caddyfile and
// are compared here with netlify.toml. A header line that readNetlifyToml or
// readCaddyfile cannot parse fails the check. The image makes no redirects, so
// a new redirect in netlify.toml fails it too, until someone decides what the
// image should do for that path.

const POLICY = "default-src 'none'; script-src 'self' 'sha256-AbC+/12='";

// Netlify sends this by default, so the Caddyfile sets it but netlify.toml does not
const HOST_DEFAULT_HEADERS = ['@revalidated cache-control: public, max-age=0, must-revalidate'];
const HSTS = 'strict-transport-security';
const UNREADABLE = 'unreadable:';
const LINE_BREAK = /\r?\n/;
// The Caddyfile's only site block, and the bare header block that applies to
// every path in it
const SITE_BLOCK = ':8080 {';
const HEADER_BLOCK = 'header {';
// The only import allowed: the CSP that write-caddy-headers.ts converts from the build
const BUILD_HEADERS_IMPORT = 'import /etc/caddy/build-headers.caddy';
// A placeholder such as {path}, which opens no block
const PLACEHOLDER = /\{[^{}\s]*\}/g;
// Environment variables and heredocs, which Caddy expands before parsing
const READ_FIRST = /\{\$|<</;
// netlify.toml's header tables, however they are written
const HEADER_TABLE = /^\[\[?headers\b/;
// Directives that can change a response. "order" could move the header rules
// after the response has been written.
const RULE_WORDS: ReadonlySet<string> = new Set(['header', 'redir', 'import', 'order']);
const MATCHERS = ['@revalidated not path /_app/immutable/*'];
// The image needs neither: the build's help.html forwards /help with a meta
// refresh, and the netlify.app redirect only applies on Netlify
const NETLIFY_ONLY_REDIRECTS = ['/help', 'https://pgp-converter.netlify.app/*'];

describe('toCaddyHeaders', () => {
	it('should convert the headers file that write-csp.ts writes', () => {
		const file = `# Written by scripts/write-csp.ts after the build; do not edit.\n/*\n  Content-Security-Policy: ${POLICY}\n`;

		expect(toCaddyHeaders(file)).toEqual({
			success: true,
			data: `header /* {\n\tContent-Security-Policy "${POLICY}"\n}\n`
		});
	});

	it('should keep each rule, and each header in a rule, in order', () => {
		const file = `/*\n  Content-Security-Policy: ${POLICY}\n  X-Robots-Tag: noindex\n\n/_app/immutable/*\n  Cache-Control: immutable\n`;

		expect(toCaddyHeaders(file).data).toBe(
			`header /* {\n\tContent-Security-Policy "${POLICY}"\n\tX-Robots-Tag "noindex"\n}\n` +
				'header /_app/immutable/* {\n\tCache-Control "immutable"\n}\n'
		);
	});

	it('should read a file with CRLF line endings', () => {
		expect(toCaddyHeaders(`/*\r\n  Content-Security-Policy: ${POLICY}\r\n`).success).toBe(true);
	});

	it('should refuse a value that Caddy would read differently', () => {
		for (const value of ['say "hi"', 'a\\b', '{path}']) {
			const result = toCaddyHeaders(
				`/*\n  Content-Security-Policy: ${POLICY}\n  X-Note: ${value}\n`
			);
			expect(result.success).toBe(false);
			expect(result.error).toContain('X-Note');
		}
	});

	it('should refuse a header name that does not start with a letter', () => {
		for (const name of ['-Content-Security-Policy', '+X-Note', '?X-Note', '>X-Note', '9-Note']) {
			expect(toCaddyHeaders(`/*\n  Content-Security-Policy: ${POLICY}\n  ${name}: x\n`)).toEqual({
				success: false,
				error: `Cannot read this line of the headers file: "  ${name}: x"`
			});
		}
	});

	it('should refuse a name that Caddy reads as something other than a header', () => {
		for (const name of ['defer', 'Match', 'import']) {
			const result = toCaddyHeaders(`/*\n  Content-Security-Policy: ${POLICY}\n  ${name}: x\n`);
			expect(result.success).toBe(false);
			expect(result.error).toContain(name.toLowerCase());
		}
	});

	it('should refuse a header set more than once', () => {
		const inOneRule = `/*\n  Content-Security-Policy: ${POLICY}\n  content-security-policy: ${POLICY}\n`;
		const inTwoRules = `/*\n  Content-Security-Policy: ${POLICY}\n  X-Note: a\n/encrypt\n  X-Note: b\n`;
		for (const file of [inOneRule, inTwoRules]) {
			const result = toCaddyHeaders(file);
			expect(result.success).toBe(false);
			expect(result.error).toContain('more than once');
		}
	});

	it('should refuse a path with a Netlify placeholder', () => {
		const result = toCaddyHeaders(`/keys/:id\n  Content-Security-Policy: ${POLICY}\n`);
		expect(result.success).toBe(false);
		expect(result.error).toContain('/keys/:id');
	});

	it('should refuse a file whose CSP is missing, empty or not set for /*', () => {
		const files = [
			'/*\n  X-Frame-Options: DENY\n',
			'/*\n  Content-Security-Policy:\n',
			`/*\n  X-Frame-Options: DENY\n/robots.txt\n  Content-Security-Policy: ${POLICY}\n`
		];
		for (const file of files) {
			const result = toCaddyHeaders(file);
			expect(result.success).toBe(false);
			expect(result.error).toContain('Content-Security-Policy');
		}
	});

	it('should refuse an empty value', () => {
		const result = toCaddyHeaders(`/*\n  Content-Security-Policy: ${POLICY}\n  X-Note:\n`);
		expect(result.success).toBe(false);
		expect(result.error).toContain('X-Note');
	});

	it('should refuse a header that belongs to no path', () => {
		expect(toCaddyHeaders(`  Content-Security-Policy: ${POLICY}\n`).success).toBe(false);
	});

	it('should refuse a line it cannot read', () => {
		expect(toCaddyHeaders(`/*\n  Content-Security-Policy ${POLICY}\n`).success).toBe(false);
	});
});

describe('docker/Caddyfile', () => {
	const caddyfile = withoutComments(readFileSync('docker/Caddyfile', 'utf-8'));
	const netlify = readNetlifyToml(readFileSync('netlify.toml', 'utf-8'));
	const caddy = readCaddyfile(caddyfile);

	it('should send exactly the headers netlify.toml sets, except HSTS', () => {
		const expected = netlify.headers.filter((header) => !header.includes(` ${HSTS}: `));
		expect(expected.length).toBeGreaterThan(0);
		expect(caddy.headers.toSorted(byCharacterCode)).toEqual(
			[...expected, ...HOST_DEFAULT_HEADERS].toSorted(byCharacterCode)
		);
	});

	// A path ending in / gets a 404 here, where Netlify would redirect it; the
	// app never links to one
	it('should make no redirects', () => {
		expect(caddy.redirects).toEqual([]);
	});

	it('should have only the redirects in netlify.toml that the image does without', () => {
		expect(netlify.redirects).toEqual(NETLIFY_ONLY_REDIRECTS);
	});

	it('should define only the matchers that were reviewed', () => {
		expect(caddy.matchers.toSorted(byCharacterCode)).toEqual(MATCHERS.toSorted(byCharacterCode));
	});

	it('should not send HSTS', () => {
		expect(caddyfile.toLowerCase()).not.toContain(HSTS);
	});

	it('should import the CSP from the build and set none of its own', () => {
		expect(caddyfile).toContain('\timport /etc/caddy/build-headers.caddy\n');
		expect(caddyfile.toLowerCase()).not.toContain('content-security-policy');
	});
});

/**
 * Reads netlify.toml's headers as "<path> <name>: <value>", with the name in
 * lower case, and the "from" of each redirect. Any other line in a header
 * table is kept as unreadable.
 */
function readNetlifyToml(toml: string): { headers: string[]; redirects: string[] } {
	const headers: string[] = [];
	const redirects: string[] = [];
	let table = '';
	let path = '';
	for (const text of toml.split(LINE_BREAK)) {
		const line = text.trim();
		if (line === '' || line.startsWith('#')) {
			continue;
		}
		if (line.startsWith('[')) {
			// Without spaces, quotes or a trailing comment
			table = line.replace(/\]\s*#.*$/, ']').replaceAll(/[\s"']/g, '');
			continue;
		}
		const rulePath = /^for = "([^"]+)"$/.exec(line)?.[1];
		const header = /^([A-Za-z][\w-]*) = "([^"]*)"$/.exec(line);
		if (table === '[[headers]]' && rulePath) {
			path = rulePath;
		} else if (table === '[headers.values]' && header) {
			headers.push(`${path} ${header[1].toLowerCase()}: ${header[2]}`);
		} else if (HEADER_TABLE.test(table)) {
			headers.push(`${UNREADABLE} ${line}`);
		} else if (table === '[[redirects]]' && line.startsWith('from')) {
			redirects.push(/^from = "([^"]*)"$/.exec(line)?.[1] ?? `${UNREADABLE} ${line}`);
		}
	}
	return { headers, redirects };
}

/**
 * Reads the Caddyfile's headers in the same form as readNetlifyToml, with its
 * redirects and matchers. It tracks braces as Caddy does, and only rules
 * directly in the site block count. A rule anywhere else (a snippet, another
 * site, a nested block), a line it cannot parse, such as one that deletes a
 * header, and anything Caddy expands before parsing are kept as unreadable.
 */
function readCaddyfile(text: string): {
	headers: string[];
	redirects: string[];
	matchers: string[];
} {
	const headers: string[] = [];
	const redirects: string[] = [];
	const matchers: string[] = [];
	// The line that opened each block the reader is in, the outermost first
	const open: string[] = [];
	for (const raw of text.split(LINE_BREAK)) {
		const line = raw.trim();
		if (line === '') {
			continue;
		}
		const shape = line.replaceAll(PLACEHOLDER, '');
		if (shape === '}') {
			open.pop();
			continue;
		}
		const opens = shape.endsWith('{');
		const word = line.split(/\s/, 1)[0] ?? '';
		const isRule = RULE_WORDS.has(word) || word.startsWith('@');
		const inSite = open[0] === SITE_BLOCK;
		const headerBlock = inSite && open.length === 2 ? headerBlockPath(open[1] ?? '') : undefined;
		if (
			READ_FIRST.test(line) ||
			shape.slice(0, opens ? -1 : undefined).includes('{') ||
			shape.includes('}')
		) {
			// A brace other than a { that ends the line or a } on its own, which this
			// reader does not track, or text that Caddy substitutes before parsing
			headers.push(`${UNREADABLE} ${line}`);
		} else if (headerBlock !== undefined) {
			const field = opens ? null : /^([A-Za-z][\w-]*) "([^"]*)"$/.exec(line);
			headers.push(
				field ? `${headerBlock} ${field[1].toLowerCase()}: ${field[2]}` : `${UNREADABLE} ${line}`
			);
		} else if (isRule) {
			readRule(
				line,
				inSite && open.length === 1 && !(opens && headerBlockPath(line) === undefined)
			);
		}
		if (opens) {
			open.push(line);
		}
	}
	return { headers, redirects, matchers };

	/** Reads one header, redir, import or matcher line; only the site's own count */
	function readRule(line: string, isSiteRule: boolean): void {
		const single = /^header (\/\S*|@\w+) ([A-Za-z][\w-]*) "([^"]*)"$/.exec(line);
		const redir = /^redir (\S+) (\S+) (\S+)$/.exec(line);
		const matcher = /^(@\w+ [^{]+)$/.exec(line)?.[1];
		if (!isSiteRule) {
			headers.push(`${UNREADABLE} ${line}`);
		} else if (headerBlockPath(line) !== undefined) {
			// Opens one of the site's header blocks; its fields are read on the lines that follow
		} else if (single) {
			headers.push(`${single[1]} ${single[2].toLowerCase()}: ${single[3]}`);
		} else if (redir) {
			redirects.push(`${redir[1]} ${redir[2]} ${redir[3]}`);
		} else if (matcher) {
			matchers.push(matcher);
		} else if (line !== BUILD_HEADERS_IMPORT) {
			headers.push(`${UNREADABLE} ${line}`);
		}
	}
}

/** The path or matcher a line opens a header block for, if it opens one */
function headerBlockPath(line: string): string | undefined {
	return line === HEADER_BLOCK ? '/*' : /^header (\/\S*|@\w+) \{$/.exec(line)?.[1];
}

/** Orders text by character code, the same way on every machine */
function byCharacterCode(a: string, b: string): number {
	if (a < b) {
		return -1;
	}
	return a > b ? 1 : 0;
}

function withoutComments(text: string): string {
	return text
		.split(LINE_BREAK)
		.filter((line) => !line.trimStart().startsWith('#'))
		.join('\n');
}
