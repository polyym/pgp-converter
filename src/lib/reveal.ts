import { tick } from 'svelte';
import { onScreenKeyboard } from './stores/on-screen-keyboard.svelte.ts';

/**
 * Scrolls a new result into view unless it is already wholly visible between the
 * top bar and the bottom action bar; on a phone it would otherwise appear below
 * the fold. With `shouldMoveFocus` it also takes focus, so a screen reader
 * announces it and an on-screen keyboard closes. Does nothing when `element` is
 * undefined.
 */
export function revealResult(element: HTMLElement | undefined, shouldMoveFocus: boolean): void {
	if (!element) {
		return;
	}
	const navBottom = topBarCover();
	// The action bar only covers the page where it is pinned to the bottom (phones)
	const actions = document.querySelector('.bottom-actions');
	const actionsTop =
		actions && getComputedStyle(actions).position === 'fixed'
			? actions.getBoundingClientRect().top
			: window.innerHeight;
	const box = element.getBoundingClientRect();
	if (box.top < navBottom || box.bottom > actionsTop) {
		element.scrollIntoView({ block: 'start' });
	}
	if (shouldMoveFocus) {
		element.focus({ preventScroll: true });
	}
}

/**
 * Opens the details element that holds the field with this id, if it is closed,
 * then focuses the field and scrolls its .field wrapper to the middle of the
 * window. Waits for Svelte to apply pending updates first, such as the error
 * message under the field, so the scroll lands in the right place.
 */
export async function revealField(id: string): Promise<void> {
	const element = document.getElementById(id);
	const section = element?.closest('details');
	if (section) {
		section.open = true;
	}
	await tick();
	element?.focus({ preventScroll: true });
	element?.closest('.field')?.scrollIntoView({ block: 'center' });
}

/** Scrolls the first element matching `selector` to the middle of the window and focuses it */
export function revealControl(selector: string): void {
	const control = document.querySelector<HTMLElement>(selector);
	control?.scrollIntoView({ block: 'center' });
	control?.focus({ preventScroll: true });
}

/** Returns how far down the window the top bar reaches, in CSS pixels */
function topBarCover(): number {
	const bar = document.querySelector('.nav');
	if (!bar) {
		return 0;
	}
	const box = bar.getBoundingClientRect();
	// While an on-screen keyboard is open the bar may be scrolled out of view, but
	// revealing a result closes the keyboard and brings the bar back, so allow
	// for its full height
	if (onScreenKeyboard.isOpen) {
		return box.height;
	}
	// In a short window the bar can scroll away for good; then the top edge is the limit
	return Math.max(0, box.bottom);
}
