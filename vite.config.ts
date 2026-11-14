import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { directives } from './scripts/csp.ts';

// A commit's full hash: forty hexadecimal characters
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const OPENPGP_MANIFEST = new URL('node_modules/openpgp/package.json', import.meta.url);
const SECURITY_TXT_PATH = '/.well-known/security.txt';

const commit = readCommit();
const openpgpVersion = readOpenpgpVersion();

// SvelteKit 3 is configured here; it has no svelte.config.js
export default defineConfig({
	// The pages show the commit beside the version number, and the About page
	// names the cryptography library's version (see src/app.d.ts)
	define: {
		__BUILD_COMMIT__: JSON.stringify(commit),
		__OPENPGP_VERSION__: JSON.stringify(openpgpVersion)
	},
	plugins: [
		sveltekit({
			preprocess: vitePreprocess(),
			// Every page is built ahead of time, so the site is files only. Netlify
			// serves 404.html, with a 404, wherever no file answers.
			adapter: adapter({ fallback: '404.html' }),
			// The policy is in scripts/csp.ts. SvelteKit names its start-up script in
			// each page, and scripts/write-csp.ts writes the header.
			csp: { mode: 'auto', directives },
			// Nothing links to security.txt, and its folder's name hides it from the
			// search for unlinked routes, so it is named here.
			prerender: { entries: ['*', SECURITY_TXT_PATH] },
			// The build is named after its commit, not the time, so /_app/version.json
			// says which commit is running and the same commit builds the same files
			// (see "Reproducing a Build" in the README). With no commit, the time is used.
			version: { name: commit || Date.now().toString() }
		})
	]
});

/**
 * Reads the commit this build is made from. GitHub Actions supplies it for
 * every build it runs; a build on someone's own machine has none unless they
 * set it.
 * @returns The commit's full hash, or an empty string if none was given
 */
function readCommit(): string {
	const sha = process.env.GITHUB_SHA ?? '';
	return COMMIT_PATTERN.test(sha) ? sha : '';
}

/**
 * Reads the version of OpenPGP.js that is installed, and so the one the build contains.
 * @returns The version, for example "6.3.2"
 */
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
	throw new Error('The installed openpgp package does not state its version.');
}
