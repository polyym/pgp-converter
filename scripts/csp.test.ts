import { describe, it, expect } from 'vitest';
import {
	directives,
	inlineScripts,
	policyHeader,
	policyProblem,
	scriptHash,
	scriptSources
} from './csp.ts';

// The site's content policy names each page's start-up script by hash. If the
// hashing or the reading of a page were wrong, no page would start, so both
// are pinned here.

describe('scriptHash', () => {
	it('should give the hash the Content Security Policy specification gives for its own example', async () => {
		expect(await scriptHash("alert('Hello, world.');")).toBe(
			'sha256-qznLcsROx4GACP2dm0UCKCzCG+HiZ1guq6ZZDob/Tng='
		);
	});

	it('should hash text outside ASCII as UTF-8', async () => {
		expect(await scriptHash('"é"')).not.toBe(await scriptHash('"e"'));
	});
});

describe('inlineScripts', () => {
	it('should find scripts written into the page, whatever their attributes', () => {
		const html =
			'<head><script>one()</script></head><body><script type="module" data-x="1">two()</script></body>';
		expect(inlineScripts(html)).toEqual(['one()', 'two()']);
	});

	it('should leave out scripts loaded from a file', () => {
		expect(
			inlineScripts('<script src="/a.js"></script><script type="module" src="/b.js"></script>')
		).toEqual([]);
	});

	it('should leave out data that is not run, such as structured data for search engines', () => {
		expect(
			inlineScripts('<script type="application/ld+json">{"a":1}</script><script>run()</script>')
		).toEqual(['run()']);
	});

	it('should keep the text exactly, spaces and line breaks included', () => {
		expect(inlineScripts('<script>\n\t a(); \n</script>')).toEqual(['\n\t a(); \n']);
	});

	it('should read line endings as a browser does', () => {
		expect(inlineScripts('<script>a();\r\nb();\rc();</script>')).toEqual(['a();\nb();\nc();']);
	});
});

describe('the policy itself', () => {
	it('should allow nothing that it does not name', () => {
		expect(directives['default-src']).toEqual(['none']);
	});

	it('should name no other site anywhere', () => {
		const lists = directives as Record<string, string[]>;
		for (const [name, sources] of Object.entries(lists)) {
			for (const source of sources) {
				// Only this site, nothing, or a kind of content: never an address, a scheme for remote content, or a wildcard
				expect(
					['self', 'none', 'data:', 'unsafe-inline', 'wasm-unsafe-eval'],
					`${name} lists ${source}`
				).toContain(source);
			}
		}
	});

	it('should let the page connect to this site and nowhere else', () => {
		expect(directives['connect-src']).toEqual(['self']);
	});

	it('should allow data only as pictures, which is how the donation QR codes are drawn', () => {
		const lists = directives as Record<string, string[]>;
		const withData = Object.entries(lists)
			.filter(([, sources]) => sources.includes('data:'))
			.map(([name]) => name);
		expect(withData).toEqual(['img-src']);
	});
});

describe('policyHeader', () => {
	it('should never allow inline scripts or eval', () => {
		const sources = scriptSources(policyHeader(['sha256-abc=']));
		expect(sources).not.toContain("'unsafe-inline'");
		expect(sources).not.toContain("'unsafe-eval'");
		expect(directives['script-src']).not.toContain('unsafe-inline');
	});

	it('should name the given scripts and keeps this site as the only other source', () => {
		expect(scriptSources(policyHeader(['sha256-abc=', 'sha256-def=']))).toEqual([
			"'self'",
			"'wasm-unsafe-eval'",
			"'sha256-abc='",
			"'sha256-def='"
		]);
	});

	it('should write every directive, with keywords quoted and schemes not', () => {
		const header = policyHeader();
		expect(header).toContain("default-src 'none'");
		expect(header).toContain("connect-src 'self'");
		expect(header).toContain("base-uri 'none'");
		expect(header).toContain("form-action 'none'");
		expect(header).toContain("img-src 'self' data:");
		expect(header).toContain("frame-ancestors 'none'");
		expect(header.split('; ')).toHaveLength(Object.keys(directives).length);
	});
});

describe('policyProblem', () => {
	const page = ['sha256-abc='];

	it('should accept the policy this project writes', () => {
		expect(policyProblem(policyHeader(page), page)).toBeUndefined();
	});

	it('should report a missing policy', () => {
		expect(policyProblem(null, page)).toMatch(/no Content-Security-Policy/);
	});

	it('should report a policy that allows any inline script', () => {
		expect(policyProblem("default-src 'self'; script-src 'self' 'unsafe-inline'", page)).toMatch(
			/unsafe-inline/
		);
	});

	it("should report a policy that would block the page's own script", () => {
		expect(policyProblem(policyHeader(['sha256-other=']), page)).toMatch(/cannot start/);
	});

	it('should report a policy with no script rule', () => {
		expect(policyProblem("default-src 'self'", page)).toMatch(/no script-src/);
	});
});
