// Turns the headers file that the build writes for Netlify (build/_headers)
// into the same rules for Caddy, the web server in the Docker image. The
// Content-Security-Policy in that file changes with every build
// (scripts/write-csp.ts), so the image takes it from the build it serves
// instead of keeping a copy that would go stale.
//
// It takes text and returns text; write-caddy-headers.ts reads and writes the
// files. So the tests can try any headers file without one on disk.

/** What converting a headers file gave */
export interface Conversion {
	success: boolean;
	/** The rules, ready to be imported into a Caddyfile */
	data?: string;
	error?: string;
}

/** One rule of a headers file: the addresses it covers and the headers it sets */
interface Rule {
	path: string;
	headers: [name: string, value: string][];
}

// The image must never serve the site without its policy, on every address
const REQUIRED_HEADER = 'content-security-policy';
const EVERY_ADDRESS = '/*';
const LINE_BREAK = /\r?\n/;
const COMMENT = /^\s*#/;
const INDENTED = /^\s/;
// A name starts with a letter. Caddy reads a leading "-", "+", "?" or ">" as an
// instruction to delete, add, default or replace a header, not as part of its name.
const HEADER_LINE = /^\s+([A-Za-z][A-Za-z0-9-]*):\s*(.*?)\s*$/;
// Words that Caddy reads inside a header block as something other than a
// header: settings of the block, and "import", which reads in another file
const RESERVED_NAMES: ReadonlySet<string> = new Set(['defer', 'match', 'import']);
// A path that means the same to Caddy as to Netlify: no placeholders, and no
// character that Caddy would read as the end of the path
const SAFE_PATH = /^\/[\w.~/*-]*$/;
// Caddy reads braces as placeholders, and quotes and backslashes as the end of
// the value or an escape. No header the build writes has any of them.
const UNSAFE_IN_VALUE = /["\\{}]/;

/**
 * Writes the rules of a Netlify headers file as Caddy `header` directives.
 * @param headersFile - The text of the file, as the build wrote it
 * @returns The directives, or what in the file they could not carry over safely
 */
export function toCaddyHeaders(headersFile: string): Conversion {
	const rules: Rule[] = [];
	for (const line of headersFile.split(LINE_BREAK)) {
		if (line.trim() === '' || COMMENT.test(line)) {
			continue;
		}
		if (!INDENTED.test(line)) {
			rules.push({ path: line.trim(), headers: [] });
			continue;
		}
		const header = HEADER_LINE.exec(line);
		const rule = rules.at(-1);
		if (!header || !rule) {
			return { success: false, error: `Cannot read this line of the headers file: "${line}"` };
		}
		rule.headers.push([header[1], header[2]]);
	}

	const problem = findProblem(rules);
	if (problem) {
		return { success: false, error: problem };
	}
	return { success: true, data: rules.map((rule) => directive(rule)).join('') };
}

/** Says what would keep the rules from working the same way in Caddy, if anything */
function findProblem(rules: readonly Rule[]): string | undefined {
	// Netlify sends every value of a header that two lines set, and Caddy only
	// one, so a header may be set once in the whole file
	const seen = new Set<string>();
	for (const { path, headers } of rules) {
		if (!SAFE_PATH.test(path)) {
			return `The path "${path}" cannot be carried over to Caddy as it is.`;
		}
		for (const [name, value] of headers) {
			const lowerName = name.toLowerCase();
			if (RESERVED_NAMES.has(lowerName)) {
				return `"${lowerName}" for "${path}" is a word Caddy reads as something other than a header.`;
			}
			if (seen.has(lowerName)) {
				return `${name} is set more than once. Where two rules cover one address, Caddy and Netlify send it differently, so each header may be set once.`;
			}
			seen.add(lowerName);
			// Netlify refuses an empty value, and Caddy would send one
			if (value === '') {
				return `The value of ${name} for "${path}" is empty.`;
			}
			if (UNSAFE_IN_VALUE.test(value)) {
				return `The value of ${name} for "${path}" has a quote, backslash or brace, which Caddy would read differently.`;
			}
		}
	}
	const hasPolicy = rules
		.filter(({ path }) => path === EVERY_ADDRESS)
		.some(({ headers }) => headers.some(([name]) => name.toLowerCase() === REQUIRED_HEADER));
	return hasPolicy
		? undefined
		: `The headers file sets no Content-Security-Policy for every address (${EVERY_ADDRESS}).`;
}

/** One rule as a Caddy `header` directive */
function directive({ path, headers }: Rule): string {
	const lines = headers.map(([name, value]) => `\t${name} "${value}"\n`).join('');
	return `header ${path} {\n${lines}}\n`;
}
