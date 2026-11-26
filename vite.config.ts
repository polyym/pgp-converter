import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { directives } from './scripts/csp.ts';

const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const OPENPGP_MANIFEST = new URL('node_modules/openpgp/package.json', import.meta.url);
const SECURITY_TXT_PATH = '/.well-known/security.txt';

const commit = readCommit();
const openpgpVersion = readOpenpgpVersion();

// SvelteKit 3 is configured here; it has no svelte.config.js
export default defineConfig({
	// Declared in src/app.d.ts
	define: {
		__BUILD_COMMIT__: JSON.stringify(commit),
		__OPENPGP_VERSION__: JSON.stringify(openpgpVersion)
	},
	plugins: [
		sveltekit({
			preprocess: vitePreprocess(),
			// Named 404.html because Netlify serves that file, with status 404, for
			// any path that has no file of its own
			adapter: adapter({ fallback: '404.html' }),
			// Prerendered pages get the policy as a <meta> tag that lists the hash of
			// their inline start-up script; scripts/write-csp.ts then writes the
			// matching header into build/_headers
			csp: { mode: 'auto', directives },
			// Nothing links to security.txt, and '*' skips any route whose id contains
			// '[', as the escaped folder name [x+2e]well-known does, so it is listed here
			prerender: { entries: ['*', SECURITY_TXT_PATH] },
			// The commit, not the time, so /_app/version.json names the commit and the
			// build is reproducible (README, "Reproducing a Build"). Builds without
			// GITHUB_SHA fall back to the time.
			version: { name: commit || Date.now().toString() }
		})
	]
});

/**
 * Returns GITHUB_SHA if it is a full commit hash, or '' otherwise. GitHub Actions
 * sets it; a local build has it only if the builder sets it.
 */
function readCommit(): string {
	const sha = process.env.GITHUB_SHA ?? '';
	return COMMIT_PATTERN.test(sha) ? sha : '';
}

function readOpenpgpVersion(): string {
	const manifest: unknown = JSON.parse(readFileSync(OPENPGP_MANIFEST, 'utf-8'));
	if (
		typeof manifest === 'object' &&
		manifest !== null &&
		'version' in manifest &&
		typeof manifest.version === 'string'
	) {
		return manifest.version;
	}
	throw new Error('node_modules/openpgp/package.json has no version. Reinstall with npm install.');
}
