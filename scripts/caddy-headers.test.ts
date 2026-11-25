import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { toCaddyHeaders } from './caddy-headers.ts';

// The Docker image must send the headers the released site sends, apart from
// the HTTPS-only one, and make netlify.toml's redirects. The policy comes from
// each build; the rest are written out in docker/Caddyfile, and checked here
// against netlify.toml both ways. Any line in netlify.toml's header and
// redirect tables, and any header, redir, import or matcher line anywhere in
// the Caddyfile, that this file cannot read fails the check.

const POLICY = "default-src 'none'; script-src 'self' 'sha256-AbC+/12='";

// What the released site's host does without being told, which the image has
// to say for itself: a browser asks again before it uses a file it has kept,
// and an address with a slash at the end is sent on to the one without it
const HOST_DEFAULT_HEADERS = ['@revalidated cache-control: public, max-age=0, must-revalidate'];
const HOST_DEFAULT_REDIRECTS = ['@slash {re.slash.1}{?query} permanent'];
// netlify.toml's status for a permanent redirect, and how the Caddyfile writes one
const MOVED_FOR_GOOD = '301';
const CADDY_REDIRECT_END = '{?query} permanent';
const HSTS = 'strict-transport-security';
const UNREADABLE = 'unreadable:';
const LINE_BREAK = /\r?\n/;
// The one site the Caddyfile serves, and the header block for every address in it
const SITE_BLOCK = ':8080 {';
const HEADER_BLOCK = 'header {';
// The one file the Caddyfile may read in: the policy written from the build
const BUILD_HEADERS_IMPORT = 'import /etc/caddy/build-headers.caddy';
// A placeholder such as {path} or {re.slash.1}, which opens no block
const PLACEHOLDER = /\{[^{}\s]*\}/g;
// What Caddy reads in before anything else: environment values and heredocs
const READ_FIRST = /\{\$|<</;
// netlify.toml's tables of headers and redirects, however they are written
const RULE_TABLE = /^\[\[?(?:headers|redirects)\b/;
// The redirect from the host's own address, which only the released site has
const HOST_ADDRESS_RULE = 'https://pgp-converter.netlify.app/*';
// Words that start a line which can change what the server sends: "order"
// can run the header rules after the file has gone
const RULE_WORDS: ReadonlySet<string> = new Set(['header', 'redir', 'import', 'order']);
// The matchers the rules above name, as they were reviewed
const MATCHERS = [
	'@revalidated not path /_app/immutable/*',
	'@slash path_regexp slash ^((?:/[A-Za-z0-9._~-]+)+)/$'
];
const SLASH_MATCHER = /^@slash path_regexp slash (.+)$/;

describe('toCaddyHeaders', () => {
	it('should write the policy from a headers file as the build writes it', () => {
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

	it('should read a file with Windows line endings', () => {
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

	it('should refuse a name that Caddy would read as an instruction, such as to delete the policy', () => {
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

	it('should refuse a header set more than once, which Caddy would send only once', () => {
		const inOneRule = `/*\n  Content-Security-Policy: ${POLICY}\n  content-security-policy: ${POLICY}\n`;
		const inTwoRules = `/*\n  Content-Security-Policy: ${POLICY}\n  X-Note: a\n/encrypt\n  X-Note: b\n`;
		for (const file of [inOneRule, inTwoRules]) {
			const result = toCaddyHeaders(file);
			expect(result.success).toBe(false);
			expect(result.error).toContain('more than once');
		}
	});

	it('should refuse a path with a placeholder, which Caddy does not have', () => {
		const result = toCaddyHeaders(`/keys/:id\n  Content-Security-Policy: ${POLICY}\n`);
		expect(result.success).toBe(false);
		expect(result.error).toContain('/keys/:id');
	});

	it('should refuse a file whose policy is missing, empty or not for every address, so the image never serves without one', () => {
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

	it('should refuse an empty value, which Netlify refuses and Caddy would send', () => {
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

	it('should send exactly the headers netlify.toml sends, but the HTTPS-only one', () => {
		const expected = netlify.headers.filter((header) => !header.includes(` ${HSTS}: `));
		expect(expected.length).toBeGreaterThan(0);
		expect(caddy.headers.toSorted(byCharacterCode)).toEqual(
			[...expected, ...HOST_DEFAULT_HEADERS].toSorted(byCharacterCode)
		);
	});

	it("should make exactly the redirects netlify.toml makes on the site's own address", () => {
		expect(netlify.redirects.length).toBeGreaterThan(0);
		expect(caddy.redirects.toSorted(byCharacterCode)).toEqual(
			[...netlify.redirects, ...HOST_DEFAULT_REDIRECTS].toSorted(byCharacterCode)
		);
	});

	it('should define the matchers its rules use, as they were reviewed', () => {
		expect(caddy.matchers.toSorted(byCharacterCode)).toEqual(MATCHERS.toSorted(byCharacterCode));
	});

	it("should send on only addresses made of the site's own characters, so that no redirect leaves the site", () => {
		const pattern = caddy.matchers.map((line) => SLASH_MATCHER.exec(line)?.[1]).find(Boolean);
		expect(pattern).toBeDefined();
		const slash = new RegExp(pattern ?? '');
		for (const address of ['/encrypt/', '/_app/immutable/', '/a.b~c-d_e/']) {
			expect(slash.test(address)).toBe(true);
		}
		// Caddy matches the decoded address; a browser reads a backslash as a slash and drops tabs and line breaks
		for (const address of [
			'/\\evil.example/',
			'/\t/evil.example/',
			'/\n/x/',
			'/a\\/b/',
			'/@evil.example/'
		]) {
			expect(slash.test(address)).toBe(false);
		}
	});

	it('should not send the HTTPS-only header, which belongs to whoever serves it over HTTPS', () => {
		expect(caddyfile.toLowerCase()).not.toContain(HSTS);
	});

	it("should leave out the redirect from the host's own address, which only the released site has", () => {
		expect(readFileSync('netlify.toml', 'utf-8')).toContain('netlify.app');
		expect(caddyfile).not.toContain('netlify.app');
	});

	it('should take the content policy from the build, and set none of its own', () => {
		expect(caddyfile).toContain('\timport /etc/caddy/build-headers.caddy\n');
		expect(caddyfile.toLowerCase()).not.toContain('content-security-policy');
	});
});

/**
 * Reads the header and redirect rules of netlify.toml, in the form the
 * Caddyfile has them: "<path> <name>: <value>" with the name in lower case,
 * and "<from> <to>{?query} permanent" for each redirect on the site's own
 * address, with and without a slash at the end. A line in a header or
 * redirect table that is not written as these are, and a redirect from
 * anywhere else but the host's own address, is kept as unreadable. Other
 * tables are not about headers or redirects, and are left alone.
 */
function readNetlifyToml(toml: string): { headers: string[]; redirects: string[] } {
	const headers: string[] = [];
	const redirects: string[] = [];
	let table = '';
	let path = '';
	let redirect: Record<string, string> = {};

	function finishRedirect(): void {
		const { from = '', to = '', status = '', force = '' } = redirect;
		if (Object.keys(redirect).length === 0 || from === HOST_ADDRESS_RULE) {
			// Nothing to finish, or the rule only the released site has
		} else if (from.startsWith('/')) {
			// Caddy redirects whatever file the address has, as Netlify does with force
			const end =
				status === MOVED_FOR_GOOD && force === 'true'
					? CADDY_REDIRECT_END
					: ` ${status} force=${force}`;
			redirects.push(`${from} ${to}${end}`, `${from}/ ${to}${end}`);
		} else {
			headers.push(`${UNREADABLE} redirect from ${from}`);
		}
		redirect = {};
	}

	for (const text of toml.split(LINE_BREAK)) {
		const line = text.trim();
		if (line === '' || line.startsWith('#')) {
			continue;
		}
		if (line.startsWith('[')) {
			finishRedirect();
			// The table's name without spaces, quotes or a comment after it
			table = line.replace(/\]\s*#.*$/, ']').replaceAll(/[\s"']/g, '');
			continue;
		}
		const rulePath = /^for = "([^"]+)"$/.exec(line)?.[1];
		const header = /^([A-Za-z][\w-]*) = "([^"]*)"$/.exec(line);
		const setting = /^(from|to) = "([^"]*)"$|^(status) = (\d+)$|^(force) = (true|false)$/.exec(
			line
		);
		if (table === '[[headers]]' && rulePath) {
			path = rulePath;
		} else if (table === '[headers.values]' && header) {
			headers.push(`${path} ${header[1].toLowerCase()}: ${header[2]}`);
		} else if (table === '[[redirects]]' && setting) {
			const [, key = '', value = ''] = setting.filter(Boolean);
			redirect[key] = value;
		} else if (RULE_TABLE.test(table)) {
			headers.push(`${UNREADABLE} ${line}`);
		}
	}
	finishRedirect();
	return { headers, redirects };
}

/**
 * Reads the Caddyfile's header and redirect directives in the same forms as
 * readNetlifyToml, and the matchers they name. It follows the braces, as Caddy
 * does. Only the site block's own directives count: any other header, redir,
 * import or matcher line, in a snippet, another site or a block inside the
 * site, any line it does not read, such as one that deletes a header, and
 * anything Caddy would read in from elsewhere, is kept as unreadable.
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
			// Braces this does not follow, or text Caddy reads in from elsewhere
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
			// A header block of the site's own; its fields are read as they come
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
