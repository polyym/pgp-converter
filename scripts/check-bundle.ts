// Fails if the homepage, About or Donate would preload OpenPGP.js. Those pages
// load the shared components in src/lib/components (tool-only ones are in
// src/lib/components/tool), so one shared component that imports OpenPGP.js,
// even indirectly, puts the library on them. Nothing else would catch it: the
// pages still work, only slower.
//
// Usage: node scripts/check-bundle.ts [build-dir]

import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface ScriptSize {
	path: string;
	bytes: number;
}

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
	console.log(
		`${LIGHT_PAGES.join(', ')} each preload at most ${inKilobytes(LIMIT_BYTES)} of script, less than OpenPGP.js alone.`
	);
}

/** Checks one page, says what it found, and returns whether the page passed */
function isLightEnough(page: string): boolean {
	const scripts = preloadedScripts(readFileSync(join(buildDir, page), 'utf-8'));
	if (scripts.length === 0) {
		console.error(
			`${page}: found no modulepreload links. If SvelteKit's output has changed, update preloadedScripts().`
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
			`${page} preloads ${inKilobytes(total)} of script, over the ${inKilobytes(LIMIT_BYTES)} limit. ` +
				`The largest file is ${largest.path} (${inKilobytes(largest.bytes)}). ` +
				'A component outside src/lib/components/tool is probably importing a file that imports OpenPGP.js.'
		);
		return false;
	}
	console.log(`${page}: ${inKilobytes(total)} of script in ${String(scripts.length)} files`);
	return true;
}

/** Returns the build-relative paths of the page's modulepreload links */
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
