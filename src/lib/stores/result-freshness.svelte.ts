import { isOutOfDate } from '#lib/result-state.ts';

/**
 * Keeps track of whether the result on a page still belongs to its form.
 * Call while a component is being set up.
 * @param readInputs - The inputs the result depends on, in a fixed order; leave out on a page whose result never goes out of date
 * @returns Whether the result is out of date, and whether its buttons are put away
 */
export function createResultFreshness(readInputs?: () => readonly string[]) {
	// What the result on screen was made from; undefined while there is none
	let madeFrom = $state<readonly string[]>();
	const isStale = $derived(isOutOfDate(madeFrom, read()));
	// An out-of-date result can still be wanted: a key brushed by accident in a
	// box changes nothing about the result someone came for. Its buttons are put
	// away until they say so, which makes using it a choice and not a slip.
	let isAccepted = $state(false);
	const isWithheld = $derived(isStale && !isAccepted);

	// The choice is about one result in one state. A result that is current
	// again, or a new one, starts without it.
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
		/** True while an out-of-date result's buttons are put away */
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
		/** The user wants the out-of-date result as it is */
		accept(): void {
			isAccepted = true;
		}
	};
}
