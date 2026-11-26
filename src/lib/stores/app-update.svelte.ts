import { on } from 'svelte/events';
import {
	UPDATE_CHECK_INTERVAL_MS,
	UPDATE_STAYED_AFTER_MS,
	UPDATE_TAKEOVER_TIMEOUT_MS
} from '#lib/constants.ts';
import { ACTIVATE_UPDATE_MESSAGE } from '#lib/offline.ts';

let waiting = $state<ServiceWorker | null>(null);
let isSwitching = $state(false);
let isReloadAsked = false;
let takeoverTimer: ReturnType<typeof setTimeout> | undefined;
// Set by holdFor, so a page with unsaved work can intercept Update before the reload
let holder: (() => boolean) | undefined;

/** Service worker update state for the top bar, and the actions behind its Update button */
export const appUpdate = {
	/**
	 * True once a new service worker has installed, until Update reloads the page.
	 * It stays true if another tab activates the worker first.
	 */
	get isReady() {
		return waiting !== null;
	},
	/** True once Update has been pressed, until the page reloads */
	get isBusy() {
		return isSwitching;
	},
	apply,
	applyNow,
	holdFor
};

/**
 * Watches the service worker registration for a waiting update, and checks for
 * one when the tab becomes visible again. Call once, in the browser. Returns
 * the cleanup function, which does nothing where service workers are unsupported.
 */
export function watchForUpdates(): () => void {
	if (!('serviceWorker' in navigator)) {
		return doNothing;
	}

	let registration: ServiceWorkerRegistration | undefined;
	let lastCheck = Date.now();

	function onTakeover(): void {
		if (isSwitching) {
			reloadOnce();
		}
	}

	function consider(worker: ServiceWorker | null): void {
		if (!worker) {
			return;
		}
		const settle = () => {
			// An installed worker is an update only if a controller exists: on the
			// first visit there is nothing to switch from.
			if (worker.state === 'installed' && navigator.serviceWorker.controller) {
				waiting = worker;
			}
		};
		settle();
		worker.addEventListener('statechange', settle);
	}

	function onUpdateFound(): void {
		consider(registration?.installing ?? null);
	}

	// Browsers check for a new service worker on a full page load, which a tab
	// left open for days never does, so also check when the tab becomes visible.
	function onShown(): void {
		if (document.visibilityState !== 'visible' || !registration) {
			return;
		}
		if (Date.now() - lastCheck < UPDATE_CHECK_INTERVAL_MS) {
			return;
		}
		lastCheck = Date.now();
		registration.update().catch(() => {
			// Offline or unreachable: the cached version keeps running
		});
	}

	navigator.serviceWorker.addEventListener('controllerchange', onTakeover);
	void navigator.serviceWorker.ready.then((found) => {
		registration = found;
		consider(found.waiting);
		consider(found.installing);
		found.addEventListener('updatefound', onUpdateFound);
	});
	const stopWatchingVisibility = on(document, 'visibilitychange', onShown);

	return () => {
		navigator.serviceWorker.removeEventListener('controllerchange', onTakeover);
		registration?.removeEventListener('updatefound', onUpdateFound);
		stopWatchingVisibility();
	};
}

/**
 * Activates the waiting worker and reloads the page, unless a holdFor check
 * holds it back. Call it only from the Update button: the reload loses
 * whatever is on the page.
 */
function apply(): void {
	if (holder?.()) {
		return;
	}
	switchNow();
}

/** Like apply, but skips the holdFor check; for a page to call once the visitor has agreed */
function applyNow(): void {
	switchNow();
}

/**
 * Registers a check that runs when Update is pressed. If `ask` returns true,
 * the update is held, and the page calls applyNow itself if the visitor
 * agrees. Only one hold exists at a time, so a later call replaces it.
 * @returns A function that removes the hold, if it is still the current one
 */
function holdFor(ask: () => boolean): () => void {
	holder = ask;
	return () => {
		if (holder === ask) {
			holder = undefined;
		}
	};
}

// Asks the waiting worker to skipWaiting, then reloads on controllerchange or
// after UPDATE_TAKEOVER_TIMEOUT_MS, whichever comes first.
function switchNow(): void {
	if (!waiting || isSwitching) {
		return;
	}
	isSwitching = true;
	// Another tab may have activated it already, and then no controllerchange is
	// left to wait for.
	if (waiting.state !== 'installed') {
		reloadOnce();
		return;
	}
	waiting.postMessage(ACTIVATE_UPDATE_MESSAGE);
	takeoverTimer = setTimeout(reloadOnce, UPDATE_TAKEOVER_TIMEOUT_MS);
}

// Both controllerchange and the takeover timer call this, so it guards against a second reload
function reloadOnce(): void {
	if (isReloadAsked) {
		return;
	}
	isReloadAsked = true;
	clearTimeout(takeoverTimer);
	location.reload();
	// Fires if the visitor cancels a beforeunload prompt, or if the reload takes
	// longer than this, in which case the page is replaced soon after anyway. The
	// worker has been told to activate by then, so the Update button is hidden.
	setTimeout(() => {
		isSwitching = false;
		isReloadAsked = false;
		waiting = null;
	}, UPDATE_STAYED_AFTER_MS);
}

function doNothing(): void {
	// Cleanup where service workers are unsupported
}
