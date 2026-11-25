import type { OnNavigate } from '$app/navigation';
import { PAGE_FADE_WAIT_MS } from './constants.ts';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Cross-fades between pages with the View Transitions API; pass it to SvelteKit's
 * onNavigate. Returns undefined, so the page switches at once, where the API is
 * missing or the visitor prefers reduced motion. Otherwise returns a promise that
 * resolves when SvelteKit may render the new page.
 */
export function crossFade(navigation: OnNavigate): Promise<void> | undefined {
	// The DOM types declare startViewTransition, but older browsers lack it
	if (!('startViewTransition' in document)) {
		return undefined;
	}
	if (window.matchMedia(REDUCED_MOTION).matches) {
		return undefined;
	}

	return new Promise((resolve) => {
		// The transition callback runs on the next rendering frame, which a hidden
		// tab never draws. Resolve after PAGE_FADE_WAIT_MS anyway, so navigation
		// goes ahead without the fade instead of hanging.
		const withoutFade = setTimeout(resolve, PAGE_FADE_WAIT_MS);
		const transition = document.startViewTransition(async () => {
			clearTimeout(withoutFade);
			resolve();
			await navigation.complete.catch(ignore);
		});
		for (const outcome of [transition.ready, transition.finished, transition.updateCallbackDone]) {
			outcome.catch(ignore);
		}
	});
}

function ignore(): void {
	// These promises reject when a transition is skipped or interrupted, or when a
	// later navigation overtakes this one, and none of that needs handling
}
