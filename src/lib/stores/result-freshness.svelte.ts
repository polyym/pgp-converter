import { isOutOfDate } from '#lib/result-state.ts';

/**
 * Tracks whether the result on a page is stale (an input has changed since it
 * was made), and withholds a stale result's buttons until the user accepts it.
 * Uses $effect, so call it during component initialisation.
 * @param readInputs - Returns the inputs the result depends on, in a fixed
 * order. Omit it on a page whose result never goes stale.
 */
export function createResultFreshness(readInputs?: () => readonly string[]) {
	// What the result on screen was made from; undefined while there is none
	let madeFrom = $state<readonly string[]>();
	const isStale = $derived(isOutOfDate(madeFrom, read()));
	// A stale result can still be wanted, for example after a stray keypress in
	// a field, so its buttons come back once the user accepts it
	let isAccepted = $state(false);
	const isWithheld = $derived(isStale && !isAccepted);

	// Acceptance lasts only while the result stays stale: once it is current
	// again, the next edit withholds it again
	$effect(() => {
		if (!isStale) {
			isAccepted = false;
		}
	});

	function read(): readonly string[] {
		return readInputs?.() ?? [];
	}

	return {
		/** True when an input has changed since the result was made */
		get isStale() {
			return isStale;
		},
		/** True while a stale result's buttons are hidden, until the user accepts it */
		get isWithheld() {
			return isWithheld;
		},
		/** The inputs as they are now, to hand to remember() if the run succeeds */
		read,
		/** Records what a new result was made from */
		remember(used: readonly string[]): void {
			if (readInputs) {
				madeFrom = used;
			}
			isAccepted = false;
		},
		/** Forgets the result: after a failed run, or when the form is cleared */
		forget(): void {
			madeFrom = undefined;
			isAccepted = false;
		},
		/** Accepts the stale result as it is, which brings its buttons back */
		accept(): void {
			isAccepted = true;
		}
	};
}
