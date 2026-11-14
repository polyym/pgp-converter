// Lets the app open with no connection: the browser keeps a copy of the app's
// own pages, code and fonts, and reads them from the device after the first
// visit. Only GET requests for the files listed below are answered from the
// copy. Nothing a visitor types, pastes or generates passes through here, and
// everything else, the wallet service included, goes to the network.
//
// A new version is fetched in the background and waits. It takes over when
// every tab is closed, or at once if the visitor presses Update.
//
// If offline support is ever withdrawn, do not delete this file: browsers that
// have a copy would keep running the old app. Ship a version that unregisters
// itself and deletes its caches.

import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { self as sw } from '$app/service-worker';
import { ACTIVATE_UPDATE_MESSAGE, selectPrecache, isKeptOnceUsed } from '#lib/offline.ts';

// SvelteKit lists the app's files relative to the site's root; requests and
// the cache are keyed by the path from the root, which starts with a slash
function fromRoot(list: readonly { path: string }[]): string[] {
	return list.map(({ path }) => (path.startsWith('/') ? path : `/${path}`));
}

const CACHE_PREFIX = 'pgp-converter-';
// One copy per version of the app, so files from two versions are never mixed
const CACHE = `${CACHE_PREFIX}${version}`;
const PRECACHE = selectPrecache({
	build: fromRoot(immutable),
	files: fromRoot(assets),
	prerendered: fromRoot(prerendered)
});
const PRECACHED = new Set(PRECACHE);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await Promise.all(
				PRECACHE.map(async (path) => {
					// Asked of the server afresh, so a new version never keeps an old page
					const response = await fetch(path, { cache: 'no-cache' });
					// A missing file fails the whole install: an incomplete copy must never take over
					if (!response.ok) {
						throw new Error(`Could not fetch ${path}: HTTP ${String(response.status)}`);
					}
					// An address that redirects has no content of its own to keep
					if (response.redirected) {
						return;
					}
					await cache.put(path, response);
				})
			);
		})()
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const names = await caches.keys();
			for (const name of names) {
				if (name.startsWith(CACHE_PREFIX) && name !== CACHE) {
					await caches.delete(name);
				}
			}
			// The page that installed this is served from the copy from now on
			await sw.clients.claim();
		})()
	);
});

// Sent by the page when the visitor presses Update
sw.addEventListener('message', (event) => {
	if (event.data === ACTIVATE_UPDATE_MESSAGE) {
		void sw.skipWaiting();
	}
});

/** Answers from the device's copy, and from the network only if the file is not there */
async function respond(request: Request, pathname: string): Promise<Response> {
	const cache = await caches.open(CACHE);
	const kept = await cache.match(pathname, { ignoreVary: true });
	if (kept) {
		return kept;
	}

	const response = await fetch(request);
	if (response.ok && !response.redirected) {
		await cache.put(pathname, response.clone());
	}
	return response;
}

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') {
		return;
	}

	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) {
		return;
	}
	if (!PRECACHED.has(url.pathname) && !isKeptOnceUsed(url.pathname)) {
		return;
	}

	event.respondWith(respond(request, url.pathname));
});
