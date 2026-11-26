import { CLEAR_CONFIRM_MS } from '#lib/constants.ts';

/**
 * Creates a Clear that needs two presses, because a cleared form cannot be
 * recovered. The first press arms it, and a second press within
 * CLEAR_CONFIRM_MS calls `clear`; after that the first press lapses.
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
		/** Arms on the first press and clears on the second */
		press,
		/** Clears without asking */
		clearNow,
		/** Cancels a first press without clearing */
		disarm
	};
}
