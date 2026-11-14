// Fails the build if a page that does no cryptography would download the
// cryptography library. The homepage, About and Donate load every component in
// src/lib/components (the tool pages' own are in its tool folder), so one of
// those importing a file that imports OpenPGP.js is enough. Nothing else
// notices: the pages still work, only slower.
//
// Usage: node scripts/check-bundle.ts [build directory]

import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface ScriptSize {
	path: string;
	bytes: number;
}

// Pages with no cryptography on them
const LIGHT_PAGES: readonly string[] = ['index.html', 'about.html', 'donate.html'];
// Their script comes to between 120 and 150 kB before compression; OpenPGP.js
// alone is about 390 kB. The limit sits between the two, with room for the app to grow.
const LIMIT_BYTES = 250_000;
const BYTES_PER_KB = 1000;
const LINK_ELEMENT = /<link\b[^>]*>/g;
const PRELOADS_A_SCRIPT = 'rel="modulepreload"';
const HREF_ATTRIBUTE = /href="([^"]+)"/;
const LEADING_SLASH = /^\.?\//;

const buildDir = process.argv[2] ?? 'build';

main();

function main(): void {
	// Every page is checked before the script ends, so one run reports them all
	const results = LIGHT_PAGES.map((page) => isLightEnough(page));
	if (results.includes(false)) {
		process.exit(1);
	}
	console.log('Pages without cryptography do not load the cryptography library.');
}

/** Checks one page, says what it found, and returns whether the page passed */
function isLightEnough(page: string): boolean {
	const scripts = preloadedScripts(readFileSync(join(buildDir, page), 'utf-8'));
	if (scripts.length === 0) {
		console.error(
			`${page}: found no preloaded scripts. Has the page's markup changed? This check needs updating.`
		);
		return false;
	}
	const sizes: ScriptSize[] = scripts.map((path) => ({
		path,
		bytes: statSync(join(buildDir, path)).size
	}));
	const total = sizes.reduce((sum, script) => sum + script.bytes, 0);
	if (total > LIMIT_BYTES) {
		const largest = sizes.toSorted((a, b) => b.bytes - a.bytes)[0];
		console.error(
			`${page} loads ${inKilobytes(total)} of script, over the ${inKilobytes(LIMIT_BYTES)} limit. ` +
				`The largest file is ${largest.path} (${inKilobytes(largest.bytes)}). ` +
				'A component outside src/lib/components/tool is probably importing a file that imports OpenPGP.js.'
		);
		return false;
	}
	console.log(`${page}: ${inKilobytes(total)} of script in ${String(scripts.length)} files`);
	return true;
}

/** Every script the page tells the browser to fetch up front */
function preloadedScripts(html: string): string[] {
	const paths = new Set<string>();
	const links = html.match(LINK_ELEMENT) ?? [];
	for (const tag of links) {
		if (!tag.includes(PRELOADS_A_SCRIPT)) {
			continue;
		}
		const href = HREF_ATTRIBUTE.exec(tag)?.[1];
		if (href) {
			paths.add(href.replace(LEADING_SLASH, ''));
		}
	}
	return [...paths];
}

function inKilobytes(bytes: number): string {
	return `${String(Math.round(bytes / BYTES_PER_KB))} kB`;
}
