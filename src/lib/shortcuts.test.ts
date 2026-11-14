import { describe, it, expect } from 'vitest';
import { getShortcutKeys, isAppleDevice, readShortcut, type KeyStroke } from './shortcuts.ts';

const userAgents = {
	windows:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
	linux: 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
	android:
		'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
	mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
	iphone:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
};

/** A key pressed on its own, away from any field, unless the test says otherwise */
function stroke(key: string, changes: Partial<KeyStroke> = {}): KeyStroke {
	return {
		key,
		hasModifier: false,
		hasShift: false,
		hasAlt: false,
		isComposing: false,
		target: 'other',
		...changes
	};
}

describe('isAppleDevice', () => {
	it('should recognise Apple devices', () => {
		expect(isAppleDevice(userAgents.mac)).toBe(true);
		expect(isAppleDevice(userAgents.iphone)).toBe(true);
	});

	it('should not mistake other devices for Apple ones', () => {
		// Every browser's user agent mentions "AppleWebKit" or "Safari"; that must not count
		expect(isAppleDevice(userAgents.windows)).toBe(false);
		expect(isAppleDevice(userAgents.linux)).toBe(false);
		expect(isAppleDevice(userAgents.android)).toBe(false);
	});
});

describe('getShortcutKeys', () => {
	it('should use the Command key on Apple devices', () => {
		const keys = getShortcutKeys(true);
		expect(keys.submit).toEqual(['⌘', '↵']);
		expect(keys.submitHint).toBe('⌘↵');
		expect(keys.copyHint).toBe('⌘⇧C');
	});

	it('should use Ctrl everywhere else', () => {
		const keys = getShortcutKeys(false);
		expect(keys.submit).toEqual(['Ctrl', 'Enter']);
		expect(keys.copy).toEqual(['Ctrl', 'Shift', 'C']);
		expect(keys.submitHint).toBe('Ctrl+Enter');
		expect(keys.copyHint).toBe('Ctrl+Shift+C');
	});
});

describe('readShortcut', () => {
	it('should run the action on Ctrl or Command + Enter, wherever it is pressed', () => {
		expect(readShortcut(stroke('Enter', { hasModifier: true }))).toBe('submit');
		expect(readShortcut(stroke('Enter', { hasModifier: true, target: 'textarea' }))).toBe('submit');
		expect(readShortcut(stroke('Enter', { hasModifier: true, target: 'input' }))).toBe('submit');
	});

	it('should run the action on plain Enter in a single-line field only', () => {
		expect(readShortcut(stroke('Enter', { target: 'input' }))).toBe('submit');
		// Enter in a message box starts a new line, and on a button it presses the button
		expect(readShortcut(stroke('Enter', { target: 'textarea' }))).toBeUndefined();
		expect(readShortcut(stroke('Enter'))).toBeUndefined();
	});

	it('should leave Enter alone when it is held with Shift or Alt, or finishes a composition', () => {
		expect(readShortcut(stroke('Enter', { target: 'input', hasShift: true }))).toBeUndefined();
		expect(readShortcut(stroke('Enter', { target: 'input', hasAlt: true }))).toBeUndefined();
		expect(readShortcut(stroke('Enter', { target: 'input', isComposing: true }))).toBeUndefined();
	});

	it('should copy on Ctrl or Command + Shift + C, in either case', () => {
		expect(readShortcut(stroke('C', { hasModifier: true, hasShift: true }))).toBe('copy');
		expect(readShortcut(stroke('c', { hasModifier: true, hasShift: true }))).toBe('copy');
		// The browser's own copy must keep working
		expect(readShortcut(stroke('c', { hasModifier: true }))).toBeUndefined();
		expect(readShortcut(stroke('C', { hasShift: true }))).toBeUndefined();
	});

	it('should clear on Esc, except while an input method is composing', () => {
		expect(readShortcut(stroke('Escape'))).toBe('clear');
		expect(readShortcut(stroke('Escape', { target: 'textarea' }))).toBe('clear');
		expect(readShortcut(stroke('Escape', { target: 'input', isComposing: true }))).toBeUndefined();
	});

	it('should open the shortcuts on ?, but not while the user is typing', () => {
		expect(readShortcut(stroke('?', { hasShift: true }))).toBe('toggle-help');
		expect(readShortcut(stroke('?', { hasShift: true, target: 'input' }))).toBeUndefined();
		expect(readShortcut(stroke('?', { hasShift: true, target: 'textarea' }))).toBeUndefined();
	});

	it('should ignore every other key', () => {
		expect(readShortcut(stroke('a'))).toBeUndefined();
		expect(readShortcut(stroke('Tab'))).toBeUndefined();
		expect(readShortcut(stroke('s', { hasModifier: true }))).toBeUndefined();
	});
});
