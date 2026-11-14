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
// A page with something to lose asks to be consulted before the reload
let holder: (() => boolean) | undefined;

/** The state the top bar reads, and the action behind its Update button */
export const appUpdate = {
	/** True once a newer version is ready to take over */
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
 * Starts watching for a newer version of the app. Call once, in the browser.
 * @returns A function that stops watching
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
			// "Installed" with a version already in charge means an update. On a first
			// visit nothing is in charge yet, and there is nothing to switch from.
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

	// Browsers look for a new version when a page is loaded. An app left open for
	// days never loads a page, so it also asks when it is brought back into view.
	function onShown(): void {
		if (document.visibilityState !== 'visible' || !registration) {
			return;
		}
		if (Date.now() - lastCheck < UPDATE_CHECK_INTERVAL_MS) {
			return;
		}
		lastCheck = Date.now();
		registration.update().catch(() => {
			// Offline, or the site is unreachable: the copy on the device carries on
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
 * Switches to the new version. The page reloads, which clears anything on
 * it, so this only ever runs when the visitor asks for it. A page that is
 * holding something that cannot be recovered is asked first (see holdFor).
 */
function apply(): void {
	if (holder?.()) {
		return;
	}
	switchNow();
}

/** Switches without asking the page again; for the page to call once the visitor has agreed */
function applyNow(): void {
	switchNow();
}

/**
 * Lets a page stand between the Update button and the reload. The page's
 * function is called when Update is pressed. If it returns true the page has
 * taken the question on, and calls applyNow itself should the visitor agree.
 * @param ask - Returns true to hold the update back, false to let it through
 * @returns A function that withdraws the hold; call it when the page is left
 */
function holdFor(ask: () => boolean): () => void {
	holder = ask;
	return () => {
		if (holder === ask) {
			holder = undefined;
		}
	};
}

/** Hands over to the waiting version and reloads once it has taken charge */
function switchNow(): void {
	if (!waiting || isSwitching) {
		return;
	}
	isSwitching = true;
	// With the app open in two tabs, the other may have switched already. The
	// waiting version is then in charge, and there is nothing to wait for.
	if (waiting.state !== 'installed') {
		reloadOnce();
		return;
	}
	waiting.postMessage(ACTIVATE_UPDATE_MESSAGE);
	takeoverTimer = setTimeout(reloadOnce, UPDATE_TAKEOVER_TIMEOUT_MS);
}

/** Reloads the page, once. The switch can be signalled twice: by the new version and by the timer. */
function reloadOnce(): void {
	if (isReloadAsked) {
		return;
	}
	isReloadAsked = true;
	clearTimeout(takeoverTimer);
	location.reload();
	// Only reached if the page was not replaced: the browser asked whether to
	// leave and the visitor stayed. The new version is in charge by now, so
	// the Update button has nothing left to do.
	setTimeout(() => {
		isSwitching = false;
		isReloadAsked = false;
		waiting = null;
	}, UPDATE_STAYED_AFTER_MS);
}

function doNothing(): void {
	// What watchForUpdates hands back where there is nothing to stop watching
}
