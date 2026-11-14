import { KEYBOARD_MIN_HEIGHT_PX } from './constants.ts';

/** The sizes of a window that show whether something is laid over the page */
export interface WindowSizes {
	/** The height the page is laid out for, as window.innerHeight reports it */
	layoutHeight: number;
	/** The height of the part of the page that can be seen, as visualViewport.height reports it */
	visibleHeight: number;
	/** How far the page is zoomed in by pinching, as visualViewport.scale reports it */
	scale: number;
}

/**
 * Says whether an on-screen keyboard is over the page. A phone's keyboard
 * usually covers the bottom of the page without resizing it, so the part
 * that can be seen becomes shorter than the page's layout. Zooming in by
 * pinching shortens it too, which the scale accounts for.
 * @param sizes - The window's layout height, visible height and zoom
 * @returns True if enough of the window is covered to be a keyboard
 */
export function isKeyboardOverPage(sizes: WindowSizes): boolean {
	const covered = sizes.layoutHeight - sizes.visibleHeight * sizes.scale;
	return covered >= KEYBOARD_MIN_HEIGHT_PX;
}
