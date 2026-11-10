import { dismissDonationBanner, isDonationBannerAllowed } from './donation-banner';
import { getShortcutKeys, isAppleDevice } from './shortcuts';

export interface ToolPageOptions {
	/** Name of the main action in the shortcuts dialog, for example "Encrypt message" */
	submitLabel: string;
	/** Runs the main action (Ctrl or Command + Enter, or Enter in a single-line field) */
	onSubmit: () => void;
	/** Clears the form (Esc); only called while canClear returns true */
	onClear: () => void;
	/** Whether there is anything on the page to clear */
	canClear: () => boolean;
	/** Copies the result (Ctrl or Command + Shift + C); leave out on pages without a single result */
	onCopy?: () => void;
	/** Whether there is a result to copy */
	canCopy?: () => boolean;
}

/**
 * Creates the behaviour that the encrypt, decrypt and generate pages share:
 * keyboard shortcuts and their dialog, shortcut labels that match the user's
 * keyboard, the donation banner, and a guard against stale results.
 * @param options - The page's actions and what is currently possible
 * @returns Reactive state for the page's markup, plus the helpers its handlers call
 */
export function createToolPage(options: ToolPageOptions) {
	let showShortcuts = $state(false);
	let showDonationBanner = $state(false);
	// Shortcut hints stay hidden until the page is running in a browser and knows
	// whether it is on a touch device, so nobody sees hints that then disappear
	let hintsVisible = $state(false);
	let isApple = $state(false);
	let runId = 0;
	// True only while a shortcut pressed inside a multi-line field is starting a run
	let shortcutFromTextarea = false;
	// Whether the current run should leave keyboard focus where it is
	let keepFocus = false;

	function submitFromKeyboard(target: EventTarget | null) {
		shortcutFromTextarea = target instanceof HTMLTextAreaElement;
		options.onSubmit();
		shortcutFromTextarea = false;
	}

	const keys = $derived(getShortcutKeys(isApple));
	const shortcuts = $derived([
		{ label: options.submitLabel, keys: keys.submit },
		...(options.onCopy ? [{ label: 'Copy result', keys: keys.copy }] : []),
		{ label: 'Clear all', keys: ['Esc'] },
		{ label: 'Toggle shortcuts', keys: ['?'] }
	]);

	function handleKeydown(e: KeyboardEvent) {
		// While the shortcuts dialog is open, Esc closes it and nothing else
		if (e.key === 'Escape' && showShortcuts) {
			e.preventDefault();
			showShortcuts = false;
			return;
		}

		const hasModifier = e.metaKey || e.ctrlKey;
		if (hasModifier && e.key === 'Enter') {
			e.preventDefault();
			submitFromKeyboard(e.target);
		}
		// Plain Enter in a single-line field (a name, an email, a passphrase) also runs
		// the action, as it would in any form. Not while an input method is composing text.
		const inSingleLineField = e.target instanceof HTMLInputElement;
		if (e.key === 'Enter' && inSingleLineField && !hasModifier && !e.shiftKey && !e.altKey && !e.isComposing) {
			e.preventDefault();
			submitFromKeyboard(e.target);
		}
		if (hasModifier && e.shiftKey && e.key.toLowerCase() === 'c' && options.onCopy && options.canCopy?.()) {
			e.preventDefault();
			options.onCopy();
		}
		if (e.key === 'Escape' && options.canClear()) {
			e.preventDefault();
			options.onClear();
		}

		const isTyping =
			e.target instanceof HTMLElement && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT');
		if (e.key === '?' && !isTyping) {
			e.preventDefault();
			showShortcuts = !showShortcuts;
		}
	}

	return {
		get showShortcuts() {
			return showShortcuts;
		},
		get showDonationBanner() {
			return showDonationBanner;
		},
		get hintsVisible() {
			return hintsVisible;
		},
		/** Shortcut labels for this device */
		get keys() {
			return keys;
		},
		/** The rows of the shortcuts dialog */
		get shortcuts() {
			return shortcuts;
		},
		toggleShortcuts() {
			showShortcuts = !showShortcuts;
		},
		closeShortcuts() {
			showShortcuts = false;
		},
		/** Shows the donation banner after a successful operation, unless it was dismissed recently */
		offerDonation() {
			if (isDonationBannerAllowed()) showDonationBanner = true;
		},
		dismissDonation() {
			showDonationBanner = false;
			dismissDonationBanner();
		},
		/**
		 * Marks the start of an operation. The returned check turns false once a newer
		 * operation starts or the form is cleared, so a stale result can be discarded
		 * instead of reappearing.
		 */
		startRun(): () => boolean {
			const id = ++runId;
			keepFocus = shortcutFromTextarea;
			return () => id === runId;
		},
		/**
		 * Brings a fresh result on screen; on a phone it would otherwise appear below
		 * the fold. Focus moves to it as well, so screen readers announce it and an
		 * on-screen keyboard gets out of the way. The exception is a run started with
		 * the shortcut from inside a multi-line field: that user is still typing there.
		 */
		revealResult(element: HTMLElement | undefined) {
			if (!element) return;
			const navBottom = document.querySelector('.nav')?.getBoundingClientRect().bottom ?? 0;
			const actionsTop =
				document.querySelector('.bottom-actions-inner')?.getBoundingClientRect().top ?? window.innerHeight;
			const box = element.getBoundingClientRect();
			// Leave the page alone when the whole result is already in view
			if (box.top < navBottom || box.bottom > actionsTop) {
				element.scrollIntoView({ block: 'start' });
			}
			if (!keepFocus) element.focus({ preventScroll: true });
		},
		/** Invalidates any operation that is still in flight */
		cancelRuns() {
			runId++;
		},
		/** Call from onMount. Detects the device, starts listening for shortcuts, and returns the cleanup. */
		mount(): () => void {
			const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
			isApple = isAppleDevice(navigator.userAgent);
			hintsVisible = !isTouchDevice;
			document.addEventListener('keydown', handleKeydown);
			return () => document.removeEventListener('keydown', handleKeydown);
		}
	};
}

/**
 * Copies text to the clipboard
 * @param text - The text to copy
 * @returns True if the browser accepted the copy
 */
export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
