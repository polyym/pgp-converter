import { tick } from 'svelte';
import { onScreenKeyboard } from './stores/on-screen-keyboard.svelte.ts';

/**
 * Brings a fresh result on screen; on a phone it would otherwise appear below
 * the fold.
 * @param element - Where the result is shown
 * @param shouldMoveFocus - Whether focus goes to it as well, so that screen readers announce it and an on-screen keyboard gets out of the way
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
	// Leave the page alone when the whole result is already in view
	if (box.top < navBottom || box.bottom > actionsTop) {
		element.scrollIntoView({ block: 'start' });
	}
	if (shouldMoveFocus) {
		element.focus({ preventScroll: true });
	}
}

/**
 * Takes the user to the field an error is about, opening the optional section
 * the field sits in if that is closed.
 * @param id - The id of the field
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

/**
 * Moves focus to a control and brings it into view.
 * @param selector - Matches the control
 */
export function revealControl(selector: string): void {
	const control = document.querySelector<HTMLElement>(selector);
	control?.scrollIntoView({ block: 'center' });
	control?.focus({ preventScroll: true });
}

/**
 * Measures how much of the top of the window the top bar covers.
 * @returns The height in pixels that a result has to stay below
 */
function topBarCover(): number {
	const bar = document.querySelector('.nav');
	if (!bar) {
		return 0;
	}
	const box = bar.getBoundingClientRect();
	// The bar scrolls away while an on-screen keyboard is open, and is back at
	// the top of the window when the keyboard closes, which showing a result
	// brings about
	if (onScreenKeyboard.isOpen) {
		return box.height;
	}
	// In a short window it scrolls away for good, and the window's edge is the limit
	return Math.max(0, box.bottom);
}
