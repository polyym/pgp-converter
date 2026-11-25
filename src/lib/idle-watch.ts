import { on } from 'svelte/events';
import { IDLE_CHECK_MS } from './constants.ts';
import { createIdleWatch, type IdleWatchOptions } from './idle.ts';

const ACTIVITY_EVENTS = ['keydown', 'pointerdown', 'input', 'wheel', 'touchstart'] as const;

/**
 * Runs createIdleWatch against the document: keyboard, pointer, input, wheel and
 * touch events count as activity, and the time is checked every IDLE_CHECK_MS
 * and whenever the page becomes visible. Returns a function that removes the
 * listeners and the interval.
 */
export function startIdleWatch(options: IdleWatchOptions): () => void {
	const idle = createIdleWatch(options);
	const stopListening = [
		on(document, 'visibilitychange', () => {
			// Mobile browsers freeze background pages, timers included, so check as
			// soon as the page is visible again
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
				// Capture, so a handler that stops propagation cannot hide activity
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
