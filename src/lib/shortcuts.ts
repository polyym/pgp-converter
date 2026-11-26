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

/** The parts of a keydown event that readShortcut needs, so it can be tested without the DOM */
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
 * Returns true for a macOS, iOS or iPadOS user agent string, where shortcuts use
 * Command instead of Ctrl. iPadOS Safari sends a Macintosh user agent, which
 * this also matches.
 */
export function isAppleDevice(userAgent: string): boolean {
	return /Macintosh|Mac OS X|iPhone|iPad|iPod/i.test(userAgent);
}

/** Returns the key labels for the shortcuts dialog and button hints: Apple symbols or Ctrl names */
export function getShortcutKeys(isApple: boolean): ShortcutKeys {
	return isApple ? APPLE_KEYS : OTHER_KEYS;
}

/** Returns the action a key press on a tool page triggers, or undefined if it is not a shortcut */
export function readShortcut(stroke: KeyStroke): ShortcutAction | undefined {
	switch (stroke.key) {
		case 'Enter': {
			if (stroke.hasModifier) {
				return 'submit';
			}
			// Plain Enter submits from a single-line input, as in a native form, but not
			// the Enter that commits an IME composition
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
