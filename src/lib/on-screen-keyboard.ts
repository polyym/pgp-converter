import { KEYBOARD_MIN_HEIGHT_PX } from './constants.ts';

/** Viewport measurements, in CSS pixels */
export interface WindowSizes {
	/** Layout viewport height: window.innerHeight */
	layoutHeight: number;
	/** Visual viewport height: visualViewport.height */
	visibleHeight: number;
	/** Pinch-zoom factor: visualViewport.scale */
	scale: number;
}

/**
 * Returns true when the visual viewport is at least KEYBOARD_MIN_HEIGHT_PX
 * shorter than the layout viewport, which is how an on-screen keyboard shows up
 * in mobile browsers that overlay the page instead of resizing it. The visual
 * height is multiplied by the pinch-zoom scale first, so zooming in alone does
 * not count.
 */
export function isKeyboardOverPage(sizes: WindowSizes): boolean {
	const covered = sizes.layoutHeight - sizes.visibleHeight * sizes.scale;
	return covered >= KEYBOARD_MIN_HEIGHT_PX;
}
