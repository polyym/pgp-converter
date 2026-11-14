import type { OnNavigate } from '$app/navigation';
import { PAGE_FADE_WAIT_MS } from './constants.ts';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Cross-fades from one page to the next where the browser supports view
 * transitions. Elsewhere, and for people who ask for reduced motion, pages
 * switch at once. Hand it to SvelteKit's onNavigate.
 * @param navigation - The page change that is about to happen
 * @returns A promise that settles when the new page may be drawn, or nothing
 *   when there is no cross-fade to wait for
 */
export function crossFade(navigation: OnNavigate): Promise<void> | undefined {
	// Older browsers have no view transitions, whatever the type definitions say
	if (!('startViewTransition' in document)) {
		return undefined;
	}
	if (window.matchMedia(REDUCED_MOTION).matches) {
		return undefined;
	}

	return new Promise((resolve) => {
		// The browser calls back on its next frame. A window that is not being
		// drawn has no next frame, and the new page must not wait for one: after
		// a short while it is shown without the cross-fade.
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
	// A cross-fade that is skipped or cut short, or a page change that another
	// one overtakes, needs no report
}
