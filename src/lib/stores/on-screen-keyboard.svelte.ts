import { on } from 'svelte/events';
import { isKeyboardOverPage } from '#lib/on-screen-keyboard.ts';

let isOpen = $state(false);

/** Whether an on-screen keyboard is open, kept current by watchOnScreenKeyboard */
export const onScreenKeyboard = {
	/** True while an on-screen keyboard covers part of the window */
	get isOpen() {
		return isOpen;
	}
};

/**
 * Tracks the on-screen keyboard through visualViewport resize events. Mobile
 * browsers lay the keyboard over the page without resizing the layout
 * viewport, so no media query can see it, and only the visual viewport
 * shrinks. Call once, in the browser. Returns the cleanup function, which does
 * nothing where visualViewport is unsupported.
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
	// Cleanup where visualViewport is unsupported
}
