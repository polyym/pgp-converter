import { describe, it, expect } from 'vitest';
import { isKeyboardOverPage } from './on-screen-keyboard.ts';
import { KEYBOARD_MIN_HEIGHT_PX } from './constants.ts';

describe('isKeyboardOverPage', () => {
	it('should say no while the whole page can be seen', () => {
		expect(isKeyboardOverPage({ layoutHeight: 844, visibleHeight: 844, scale: 1 })).toBe(false);
	});

	it('should say yes when a phone keyboard covers the bottom of the page', () => {
		expect(isKeyboardOverPage({ layoutHeight: 844, visibleHeight: 508, scale: 1 })).toBe(true);
	});

	it('should say yes for the lower keyboard of a phone on its side', () => {
		expect(isKeyboardOverPage({ layoutHeight: 390, visibleHeight: 190, scale: 1 })).toBe(true);
	});

	it('should not take zooming in for a keyboard', () => {
		expect(isKeyboardOverPage({ layoutHeight: 844, visibleHeight: 422, scale: 2 })).toBe(false);
		expect(isKeyboardOverPage({ layoutHeight: 844, visibleHeight: 281.3, scale: 3 })).toBe(false);
	});

	it('should still see a keyboard while the page is zoomed in', () => {
		expect(isKeyboardOverPage({ layoutHeight: 844, visibleHeight: 254, scale: 2 })).toBe(true);
	});

	it('should not take the shortcut bar of a hardware keyboard for one', () => {
		expect(isKeyboardOverPage({ layoutHeight: 1024, visibleHeight: 969, scale: 1 })).toBe(false);
	});

	it('should ignore the fraction of a pixel a browser may round away', () => {
		expect(isKeyboardOverPage({ layoutHeight: 844, visibleHeight: 843.6, scale: 1 })).toBe(false);
	});

	it('should draw the line at the smallest height that counts as a keyboard', () => {
		const layoutHeight = 800;
		expect(
			isKeyboardOverPage({
				layoutHeight,
				visibleHeight: layoutHeight - KEYBOARD_MIN_HEIGHT_PX,
				scale: 1
			})
		).toBe(true);
		expect(
			isKeyboardOverPage({
				layoutHeight,
				visibleHeight: layoutHeight - KEYBOARD_MIN_HEIGHT_PX + 1,
				scale: 1
			})
		).toBe(false);
	});
});
