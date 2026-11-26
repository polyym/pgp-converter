// Converts the Netlify headers file that the build writes (build/_headers)
// into Caddy header directives for the Docker image. The CSP in that file
// lists script hashes that change with every build (scripts/write-csp.ts), so
// the image converts it from the build it serves instead of keeping a copy in
// docker/Caddyfile.

/** The Caddy directives, or why the headers file cannot be converted safely */
export interface Conversion {
	success: boolean;
	/** One `header` block per path, for docker/Caddyfile to import */
	data?: string;
	error?: string;
}

interface Rule {
	path: string;
	headers: [name: string, value: string][];
}

// The conversion fails unless the file sets a CSP for /*, so the image cannot
// serve a page without one
const REQUIRED_HEADER = 'content-security-policy';
const EVERY_ADDRESS = '/*';
const LINE_BREAK = /\r?\n/;
const COMMENT = /^\s*#/;
const INDENTED = /^\s/;
// Captures the name and value of an indented header line. The name must start
// with a letter: Caddy reads a leading +, -, ? or > as add, delete, set if
// missing, or set and defer, so "-Content-Security-Policy" would delete the CSP.
const HEADER_LINE = /^\s+([A-Za-z][A-Za-z0-9-]*):\s*(.*?)\s*$/;
// Inside a header block Caddy reads these as subdirectives (defer, match) or
// as an import of another file, not as header names
const RESERVED_NAMES: ReadonlySet<string> = new Set(['defer', 'match', 'import']);
// Paths both servers read the same way: no Netlify :placeholders, and no
// character that ends a token or opens a placeholder in a Caddyfile
const SAFE_PATH = /^\/[\w.~/*-]*$/;
// Caddy reads braces as placeholders, and quotes and backslashes as the end of
// the value or an escape. No header the build writes has any of them.
const UNSAFE_IN_VALUE = /["\\{}]/;

/**
 * Converts the text of a Netlify `_headers` file into Caddy `header`
 * directives, one block per path in file order. Returns an error instead for
 * a line it cannot parse, a path, name or value Caddy would read differently,
 * an empty value, a header set more than once, or a file with no CSP for `/*`.
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

/** Returns the first reason the rules would behave differently in Caddy, or undefined */
function findProblem(rules: readonly Rule[]): string | undefined {
	// Where two rules set the same header for one path, Netlify sends both values
	// and Caddy only one, so each header may be set once in the whole file
	const seen = new Set<string>();
	for (const { path, headers } of rules) {
		if (!SAFE_PATH.test(path)) {
			return `The path "${path}" has a placeholder or a character that Caddy would read differently.`;
		}
		for (const [name, value] of headers) {
			const lowerName = name.toLowerCase();
			if (RESERVED_NAMES.has(lowerName)) {
				return `"${lowerName}" for "${path}" is a Caddy subdirective or import, not a header name.`;
			}
			if (seen.has(lowerName)) {
				return `${name} is set more than once. Where two rules cover one path, Caddy and Netlify send it differently, so each header may be set once.`;
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
		: `The headers file sets no Content-Security-Policy for every path (${EVERY_ADDRESS}).`;
}

/** One rule as a Caddy `header` directive */
function directive({ path, headers }: Rule): string {
	const lines = headers.map(([name, value]) => `\t${name} "${value}"\n`).join('');
	return `header ${path} {\n${lines}}\n`;
}
