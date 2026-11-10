export interface ShortcutKeys {
	/** Keys for the page's main action, as listed in the shortcuts dialog */
	submit: string[];
	/** Keys for copying the result, as listed in the shortcuts dialog */
	copy: string[];
	/** Compact form of the main action's shortcut, shown inside its button */
	submitHint: string;
	/** Compact form of the copy shortcut, shown inside the copy button */
	copyHint: string;
}

const APPLE_KEYS: ShortcutKeys = {
	submit: ['⌘', '↵'],
	copy: ['⌘', '⇧', 'C'],
	submitHint: '⌘↵',
	copyHint: '⌘⇧C'
};

const OTHER_KEYS: ShortcutKeys = {
	submit: ['Ctrl', 'Enter'],
	copy: ['Ctrl', 'Shift', 'C'],
	submitHint: 'Ctrl+Enter',
	copyHint: 'Ctrl+Shift+C'
};

/**
 * Reports whether a browser's user agent string describes an Apple device,
 * where shortcuts use the Command key instead of Ctrl
 * @param userAgent - The value of navigator.userAgent
 * @returns True for macOS, iOS and iPadOS
 */
export function isAppleDevice(userAgent: string): boolean {
	return /Macintosh|Mac OS X|iPhone|iPad|iPod/i.test(userAgent);
}

/**
 * Returns the shortcut labels that match the user's keyboard
 * @param isApple - Whether the device uses the Command key
 * @returns The key names to show in the shortcuts dialog and on buttons
 */
export function getShortcutKeys(isApple: boolean): ShortcutKeys {
	return isApple ? APPLE_KEYS : OTHER_KEYS;
}
