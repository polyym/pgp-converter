import { CLEAR_CONFIRM_MS } from '#lib/constants.ts';

/**
 * Creates the state behind a Clear that asks twice. A cleared form cannot be
 * brought back, so the first press only asks, and the question lapses if no
 * second press follows.
 * @param clear - Empties the form
 * @returns Whether a first press is waiting, and the presses themselves
 */
export function createClearConfirm(clear: () => void) {
	let isArmed = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function disarm(): void {
		clearTimeout(timer);
		isArmed = false;
	}

	function clearNow(): void {
		disarm();
		clear();
	}

	function press(): void {
		if (isArmed) {
			clearNow();
			return;
		}
		isArmed = true;
		clearTimeout(timer);
		timer = setTimeout(() => {
			isArmed = false;
		}, CLEAR_CONFIRM_MS);
	}

	return {
		/** True while a first press waits to be confirmed */
		get isArmed() {
			return isArmed;
		},
		/** Asks on the first press and clears on the second */
		press,
		/** Clears without asking */
		clearNow,
		/** Withdraws a first press */
		disarm
	};
}
