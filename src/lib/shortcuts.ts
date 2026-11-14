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

/** What a key press asks a tool page to do */
export type ShortcutAction = 'submit' | 'copy' | 'clear' | 'toggle-help';

/** A key press, reduced to what decides its meaning */
export interface KeyStroke {
	/** The key, as KeyboardEvent.key names it */
	key: string;
	/** Ctrl or Command was held */
	hasModifier: boolean;
	hasShift: boolean;
	hasAlt: boolean;
	/** An input method is composing text, so the key belongs to it */
	isComposing: boolean;
	/** Where the key was pressed: a single-line field, a multi-line field, or anywhere else */
	target: 'input' | 'textarea' | 'other';
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

/**
 * Says what a key press on a tool page means.
 * @param stroke - The key, what was held with it, and where it was pressed
 * @returns The action it asks for, or undefined if it is not a shortcut
 */
export function readShortcut(stroke: KeyStroke): ShortcutAction | undefined {
	switch (stroke.key) {
		case 'Enter': {
			if (stroke.hasModifier) {
				return 'submit';
			}
			// Plain Enter in a single-line field (a name, an email, a passphrase) runs
			// the action, as it would in any form
			const isPlain = !stroke.hasShift && !stroke.hasAlt && !stroke.isComposing;
			return stroke.target === 'input' && isPlain ? 'submit' : undefined;
		}
		case 'Escape': {
			// While an input method is composing, Esc cancels the composition
			return stroke.isComposing ? undefined : 'clear';
		}
		case '?': {
			return stroke.target === 'other' ? 'toggle-help' : undefined;
		}
		case 'c':
		case 'C': {
			return stroke.hasModifier && stroke.hasShift ? 'copy' : undefined;
		}
		default: {
			return undefined;
		}
	}
}
