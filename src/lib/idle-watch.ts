import { on } from 'svelte/events';
import { IDLE_CHECK_MS } from './constants.ts';
import { createIdleWatch, type IdleWatchOptions } from './idle.ts';

const ACTIVITY_EVENTS = ['keydown', 'pointerdown', 'input', 'wheel', 'touchstart'] as const;

/**
 * Starts timing how long the page has gone untouched, in the browser.
 * @param options - The time limit, when it applies, and what to do once it is up
 * @returns A function that stops the timing
 */
export function startIdleWatch(options: IdleWatchOptions): () => void {
	const idle = createIdleWatch(options);
	const stopListening = [
		on(document, 'visibilitychange', () => {
			// A phone freezes a page in the background, timers included, so the clock
			// is also read the moment the page is shown again
			if (document.visibilityState === 'visible') {
				idle.check();
			}
		}),
		...ACTIVITY_EVENTS.map((type) =>
			on(
				document,
				type,
				() => {
					idle.touch();
				},
				{ passive: true, capture: true }
			)
		)
	];
	const timer = setInterval(() => {
		idle.check();
	}, IDLE_CHECK_MS);

	return () => {
		for (const stop of stopListening) {
			stop();
		}
		clearInterval(timer);
	};
}
