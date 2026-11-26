import { describe, it, expect } from 'vitest';
import {
	directives,
	inlineScripts,
	policyHeader,
	policyProblem,
	scriptHash,
	scriptSources
} from './csp.ts';

// The CSP allows each page's start-up script by hash. A wrong hash, or a
// script missed when reading a page, would stop every page from starting.

describe('scriptHash', () => {
	it("should match the hash in the CSP specification's example", async () => {
		expect(await scriptHash("alert('Hello, world.');")).toBe(
			'sha256-qznLcsROx4GACP2dm0UCKCzCG+HiZ1guq6ZZDob/Tng='
		);
	});

	it('should hash text outside ASCII as UTF-8', async () => {
		expect(await scriptHash('"é"')).not.toBe(await scriptHash('"e"'));
	});
});

describe('inlineScripts', () => {
	it('should find inline scripts whatever their other attributes', () => {
		const html =
			'<head><script>one()</script></head><body><script type="module" data-x="1">two()</script></body>';
		expect(inlineScripts(html)).toEqual(['one()', 'two()']);
	});

	it('should skip scripts with a src attribute', () => {
		expect(
			inlineScripts('<script src="/a.js"></script><script type="module" src="/b.js"></script>')
		).toEqual([]);
	});

	it('should skip data blocks such as JSON-LD', () => {
		expect(
			inlineScripts('<script type="application/ld+json">{"a":1}</script><script>run()</script>')
		).toEqual(['run()']);
	});

	it('should keep whitespace exactly', () => {
		expect(inlineScripts('<script>\n\t a(); \n</script>')).toEqual(['\n\t a(); \n']);
	});

	it('should turn CRLF and CR into LF, as the HTML parser does', () => {
		expect(inlineScripts('<script>a();\r\nb();\rc();</script>')).toEqual(['a();\nb();\nc();']);
	});
});

describe('the policy itself', () => {
	it("should default to 'none'", () => {
		expect(directives['default-src']).toEqual(['none']);
	});

	it('should list no other origin, remote scheme or wildcard', () => {
		const lists = directives as Record<string, string[]>;
		for (const [name, sources] of Object.entries(lists)) {
			for (const source of sources) {
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

	it('should allow data: URLs for images only, for the donation QR codes', () => {
		const lists = directives as Record<string, string[]>;
		const withData = Object.entries(lists)
			.filter(([, sources]) => sources.includes('data:'))
			.map(([name]) => name);
		expect(withData).toEqual(['img-src']);
	});
});

describe('policyHeader', () => {
	it("should allow neither 'unsafe-inline' nor 'unsafe-eval'", () => {
		const sources = scriptSources(policyHeader(['sha256-abc=']));
		expect(sources).not.toContain("'unsafe-inline'");
		expect(sources).not.toContain("'unsafe-eval'");
		expect(directives['script-src']).not.toContain('unsafe-inline');
	});

	it('should append the given hashes to script-src', () => {
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

	it('should report a policy with no script-src', () => {
		expect(policyProblem("default-src 'self'", page)).toMatch(/no script-src/);
	});
});
