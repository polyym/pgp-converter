// Cache-first service worker, so the app works offline after the first visit.
// Only same-origin GET requests for the app's own files are answered from the
// cache. Everything else, the wallet proxy included, goes to the network, so
// nothing a visitor types, pastes or generates is ever cached.
//
// There is no skipWaiting on install: a new version waits until every tab is
// closed, or until the visitor presses Update (see app-update.svelte.ts).
//
// To withdraw offline support, ship a worker that unregisters itself and
// deletes its caches. Deleting this file would leave existing installs running
// the old version.

import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { self as sw } from '$app/service-worker';
import { ACTIVATE_UPDATE_MESSAGE, selectPrecache, isKeptOnceUsed } from '#lib/offline.ts';

// The manifest lists paths relative to the site root, but the fetch handler
// matches against URL.pathname, which has a leading slash.
function fromRoot(list: readonly { path: string }[]): string[] {
	return list.map(({ path }) => (path.startsWith('/') ? path : `/${path}`));
}

const CACHE_PREFIX = 'pgp-converter-';
// One cache per build, so a page never mixes files from two versions
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
					// Revalidate, so the HTTP cache cannot hand the new version an old page
					const response = await fetch(path, { cache: 'no-cache' });
					// Throwing fails the install, so a partial cache never activates
					if (!response.ok) {
						throw new Error(`Could not fetch ${path}: HTTP ${String(response.status)}`);
					}
					// Browsers reject a redirected response used to answer a navigation
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
			// Control open pages without a reload, including the page of a first visit,
			// which loaded before this worker was installed
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

// Cache first. The lookup uses the path alone and ignores Vary, so a query
// string or a Vary header on the stored response cannot cause a miss.
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
	// Non-Latin font subsets are not precached, but are cached once a page loads them
	if (!PRECACHED.has(url.pathname) && !isKeptOnceUsed(url.pathname)) {
		return;
	}

	event.respondWith(respond(request, url.pathname));
});
