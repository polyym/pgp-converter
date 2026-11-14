import { on } from 'svelte/events';
import { isKeyboardOverPage } from '#lib/on-screen-keyboard.ts';

let isOpen = $state(false);

/** What the page frame reads to know that a keyboard is over the page */
export const onScreenKeyboard = {
	/** True while an on-screen keyboard covers part of the window */
	get isOpen() {
		return isOpen;
	}
};

/**
 * Starts noticing when an on-screen keyboard opens and closes. Call once, in
 * the browser. Phones lay the keyboard over the page without resizing it,
 * which no media query can see; the part of the window that can be seen
 * getting shorter is the only sign.
 * @returns A function that stops noticing
 */
export function watchOnScreenKeyboard(): () => void {
	const viewport = window.visualViewport;
	if (!viewport) {
		return doNothing;
	}

	const read = (): void => {
		isOpen = isKeyboardOverPage({
			layoutHeight: window.innerHeight,
			visibleHeight: viewport.height,
			scale: viewport.scale
		});
	};

	read();
	return on(viewport, 'resize', read);
}

function doNothing(): void {
	// What watchOnScreenKeyboard hands back where the browser cannot say what is visible
}
