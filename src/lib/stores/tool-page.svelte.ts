import { onMount, tick } from 'svelte';
import { on } from 'svelte/events';
import {
	COMPOSING_KEY_CODE,
	COPY_ERROR_MS,
	IDLE_CLEAR_MINUTES,
	IDLE_CLEAR_MS,
	LOADING_DELAY_MS
} from '#lib/constants.ts';
import { dismissDonationBanner, isDonationBannerAllowed } from '#lib/donation-banner.ts';
import { startIdleWatch } from '#lib/idle-watch.ts';
import { revealControl, revealField, revealResult } from '#lib/reveal.ts';
import { getShortcutKeys, isAppleDevice, readShortcut, type KeyStroke } from '#lib/shortcuts.ts';
import { createClearConfirm } from './clear-confirm.svelte.ts';
import { createCopyFlag } from './copy.svelte.ts';
import { createFeedback } from './feedback.svelte.ts';
import { createResultFreshness } from './result-freshness.svelte.ts';

export interface ToolPageOptions {
	/** Name of the main action in the shortcuts dialog, for example "Encrypt message" */
	submitLabel: string;
	/** Whether the form holds enough to run the main action */
	canSubmit: () => boolean;
	/**
	 * Runs the main action (its button, Ctrl or Command + Enter, or Enter in a
	 * single-line field); only called while canSubmit returns true and nothing
	 * is running
	 */
	onSubmit: () => void;
	/** Whether there is anything on the page to clear */
	canClear: () => boolean;
	/** Empties the page's own fields (Esc pressed twice, or the Clear button); only called while canClear returns true */
	onClear: () => void;
	/**
	 * Whether the Clear button should ask twice as well, because what is on the
	 * page cannot be recovered. Esc always asks twice.
	 */
	confirmClear?: () => boolean;
	/**
	 * The result as text, for the Copy button and its shortcut (Ctrl or Command
	 * + Shift + C); empty while there is none. Leave out on pages without a
	 * single result.
	 */
	copyable?: () => string;
	/** Runs after IDLE_CLEAR_MS without activity; defaults to onClear */
	onIdle?: () => void;
	/** The idle clear runs only while this returns true; defaults to canClear */
	hasSecrets?: () => boolean;
	/** What to tell the user after an idle clear */
	idleNotice?: string;
	/**
	 * The inputs the result depends on, in a fixed order. Once any of them is
	 * changed after a run, the result on screen is stale. Leave out
	 * anything that does not change the result, such as a passphrase.
	 */
	resultInputs?: () => readonly string[];
}

/** The success-or-error shape that the src/lib operations return, as run() expects it */
export interface RunOutcome {
	success: boolean;
	error?: string;
	/** The id of the field to show the error under; without it the error shows as a toast */
	errorField?: string;
}

/** What a run that produced a result tells the user */
export interface RunReport {
	/** For example "Encrypted" */
	message: string;
	/**
	 * Set when the run succeeded but the outcome is bad news, such as a
	 * signature that does not verify. The message then shows as an error.
	 */
	isProblem?: boolean;
}

/** One run of a page's main action */
export interface ToolRun<T extends RunOutcome> {
	/** Does the work, with the inputs as they are when it is called */
	work: () => Promise<T>;
	/**
	 * Puts a successful result on the page.
	 * @returns What to tell the user about it
	 */
	onSuccess: (result: T) => RunReport;
	/** Takes the previous result off the page after a failure */
	onFailure: () => void;
	/** What to say about a failure that came with no explanation */
	fallbackError: string;
	/**
	 * Waits LOADING_DELAY_MS before `work`, so the busy state paints before the
	 * cryptography blocks the main thread. Defaults to true.
	 */
	shouldPaintFirst?: boolean;
}

/** The shared behaviour of one tool page, as its components use it */
export type ToolPage = ReturnType<typeof createToolPage>;

const DEFAULT_IDLE_NOTICE = `Cleared after ${String(IDLE_CLEAR_MINUTES)} minutes without activity, so your keys and messages are not left on screen.`;

/**
 * Creates the behaviour the tool pages share: running the main action and
 * reporting the outcome, copying the result, keyboard shortcuts and their
 * dialog, the donation banner, the idle clear and stale-result tracking.
 * Uses onMount and $effect, so call it during component initialisation; the
 * keyboard and idle listeners are added on mount and removed on destroy.
 */
export function createToolPage(options: ToolPageOptions) {
	const feedback = createFeedback();
	const copyFlag = createCopyFlag();
	const clearConfirm = createClearConfirm(options.onClear);
	const freshness = createResultFreshness(options.resultInputs);
	let isShortcutsOpen = $state(false);
	let isDonationOffered = $state(false);
	// Hidden until mount, when touch support is known, so the prerendered page
	// never shows hints that a touch device then removes
	let areHintsVisible = $state(false);
	let isApple = $state(false);
	let isLoading = $state(false);
	let runId = 0;
	let fieldError = $state<{ field: string; message: string }>();
	let idleNotice = $state('');
	let resultElement = $state<HTMLElement>();
	// True only during the synchronous submit() call made by a shortcut pressed in
	// a textarea. It works because each page's onSubmit calls run() at once, and
	// run() reads the flag before its first await.
	let isSubmitFromTextarea = false;
	const keys = $derived(getShortcutKeys(isApple));
	const shortcuts = $derived([
		{ label: options.submitLabel, keys: keys.submit },
		...(options.copyable ? [{ label: 'Copy result', keys: keys.copy }] : []),
		{ label: 'Clear all (press twice)', keys: ['Esc'] },
		{ label: 'Toggle shortcuts', keys: ['?'] }
	]);

	onMount(() => {
		const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		isApple = isAppleDevice(navigator.userAgent);
		areHintsVisible = !isTouchDevice;

		const stopListening = on(document, 'keydown', handleKeydown);
		// Keys, passphrases and decrypted messages are not left on an unattended screen
		const stopIdleWatch = startIdleWatch({
			timeoutMs: IDLE_CLEAR_MS,
			isArmed: () => (options.hasSecrets ?? options.canClear)(),
			onIdle: () => {
				(options.onIdle ?? options.onClear)();
				idleNotice = options.idleNotice ?? DEFAULT_IDLE_NOTICE;
			}
		});

		return () => {
			stopListening();
			stopIdleWatch();
			clearConfirm.disarm();
			feedback.clear();
			fieldError = undefined;
		};
	});

	function submit(): void {
		if (isLoading || !options.canSubmit()) {
			return;
		}
		options.onSubmit();
	}

	function toggleShortcuts(): void {
		isShortcutsOpen = !isShortcutsOpen;
	}

	function closeShortcuts(): void {
		isShortcutsOpen = false;
	}

	/** For the Clear button: clears at once, unless the page asked for a second press */
	function pressClear(): void {
		if (options.confirmClear?.()) {
			clearConfirm.press();
		} else {
			clearConfirm.clearNow();
		}
	}

	function dismissDonation(): void {
		isDonationOffered = false;
		dismissDonationBanner();
	}

	/**
	 * Runs the page's main action and reports the outcome. Does nothing while a
	 * run is in progress. A result that arrives after reset() or a newer run is
	 * discarded.
	 */
	async function run<T extends RunOutcome>(steps: ToolRun<T>): Promise<void> {
		if (isLoading) {
			return;
		}
		const id = ++runId;
		// Leave focus in a textarea the run was started from: the user may still be typing
		const shouldMoveFocus = !isSubmitFromTextarea;
		idleNotice = '';
		isLoading = true;
		feedback.clear();
		fieldError = undefined;

		if (steps.shouldPaintFirst ?? true) {
			await new Promise((resolve) => setTimeout(resolve, LOADING_DELAY_MS));
			if (id !== runId) {
				return;
			}
		}

		// Snapshot the inputs as `work` sees them, so edits made while it runs mark
		// the result stale
		const used = freshness.read();
		const result = await steps.work();
		if (id !== runId) {
			return;
		}

		if (result.success) {
			const report = steps.onSuccess(result);
			freshness.remember(used);
			if (report.isProblem) {
				feedback.showError(report.message);
			} else {
				feedback.showSuccess(report.message);
				isDonationOffered ||= isDonationBannerAllowed();
			}
		} else {
			steps.onFailure();
			freshness.forget();
			const message =
				result.error === undefined || result.error === '' ? steps.fallbackError : result.error;
			if (result.errorField) {
				fieldError = { field: result.errorField, message };
				void revealField(result.errorField);
			} else {
				feedback.showError(message);
			}
		}
		isLoading = false;

		if (!result.success) {
			return;
		}

		await tick();
		revealResult(resultElement, shouldMoveFocus);
	}

	/**
	 * Puts the shared state back as it was before any run. Call it when the
	 * page clears its own fields.
	 */
	function reset(): void {
		// A run still in flight must not put its result back
		runId++;
		isLoading = false;
		freshness.forget();
		fieldError = undefined;
		copyFlag.reset();
		feedback.clear();
	}

	/**
	 * Accepts a stale result as it is: its buttons come back, and focus moves to
	 * the first of them so the next key press can use it.
	 */
	async function useStaleResult(): Promise<void> {
		freshness.accept();
		await tick();
		resultElement?.querySelector<HTMLElement>(':scope .output-tools button')?.focus();
	}

	/** Copies the result, for the Copy button and its shortcut */
	async function copyResult(): Promise<void> {
		const text = options.copyable?.() ?? '';
		if (!text) {
			return;
		}
		// The Copy button is hidden while the result is withheld, so only the
		// shortcut gets here. Focus the stale note's button instead of copying.
		if (freshness.isWithheld) {
			revealControl('.stale-note button');
			return;
		}
		if (!(await copyFlag.copy(text))) {
			feedback.showError('Failed to copy', COPY_ERROR_MS);
		}
	}

	/** The error to show under the field with this id; empty if it has none */
	function errorFor(field: string): string {
		return fieldError?.field === field ? fieldError.message : '';
	}

	function dismissIdleNotice(): void {
		idleNotice = '';
	}

	function handleKeydown(e: KeyboardEvent): void {
		// While the shortcuts dialog is open, Esc closes it and nothing else
		if (e.key === 'Escape' && isShortcutsOpen) {
			e.preventDefault();
			isShortcutsOpen = false;
			return;
		}
		// An open confirmation dialog keeps the keyboard to itself
		if (document.querySelector('dialog[open]')) {
			return;
		}
		// Any key but Esc cancels a first press of Clear
		if (e.key !== 'Escape') {
			clearConfirm.disarm();
		}

		switch (readShortcut(describeKey(e))) {
			case 'submit': {
				e.preventDefault();
				isSubmitFromTextarea = e.target instanceof HTMLTextAreaElement;
				submit();
				isSubmitFromTextarea = false;
				break;
			}
			case 'copy': {
				if (options.copyable?.()) {
					e.preventDefault();
					void copyResult();
				}
				break;
			}
			case 'clear': {
				// Esc is easy to press by accident, so the first press only asks
				if (options.canClear()) {
					e.preventDefault();
					clearConfirm.press();
				}
				break;
			}
			case 'toggle-help': {
				e.preventDefault();
				toggleShortcuts();
				break;
			}
			default: {
				break;
			}
		}
	}

	return {
		/** The page's success and error messages */
		feedback,
		get isShortcutsOpen() {
			return isShortcutsOpen;
		},
		get isDonationOffered() {
			return isDonationOffered;
		},
		get areHintsVisible() {
			return areHintsVisible;
		},
		get keys() {
			return keys;
		},
		get shortcuts() {
			return shortcuts;
		},
		get isLoading() {
			return isLoading;
		},
		get isCopied() {
			return copyFlag.isCopied;
		},
		get canSubmit() {
			return options.canSubmit();
		},
		get canClear() {
			return options.canClear();
		},
		/** True while a first press of Esc, or of a Clear button that asks twice, waits to be confirmed */
		get isClearArmed() {
			return clearConfirm.isArmed;
		},
		/** The result as text; empty while there is none */
		get resultText() {
			return options.copyable?.() ?? '';
		},
		/**
		 * True when an input has changed since the result was made, so the result
		 * no longer matches the form
		 */
		get isResultStale() {
			return freshness.isStale;
		},
		/**
		 * True while a stale result's Copy, Download and Share buttons are hidden,
		 * until the user accepts the result or runs the action again
		 */
		get isResultWithheld() {
			return freshness.isWithheld;
		},
		/** Why the form was cleared while the user was away; empty when it was not */
		get idleNotice() {
			return idleNotice;
		},
		/** Where the result appears, so that a new one can be brought into view; set by the page */
		get resultElement() {
			return resultElement;
		},
		set resultElement(element: HTMLElement | undefined) {
			resultElement = element;
		},
		submit,
		toggleShortcuts,
		closeShortcuts,
		pressClear,
		dismissDonation,
		run,
		reset,
		copyResult,
		useStaleResult,
		errorFor,
		dismissIdleNotice
	};
}

function describeKey(e: KeyboardEvent): KeyStroke {
	let target: KeyStroke['target'] = 'other';
	if (e.target instanceof HTMLInputElement) {
		target = 'input';
	} else if (e.target instanceof HTMLTextAreaElement) {
		target = 'textarea';
	}
	return {
		key: e.key,
		hasModifier: e.metaKey || e.ctrlKey,
		hasShift: e.shiftKey,
		hasAlt: e.altKey,
		// keyCode 229 marks a keydown that an IME handled. Some browsers send the
		// key that ends a composition with isComposing false, so the deprecated
		// keyCode is still checked.
		isComposing: e.isComposing || e.keyCode === COMPOSING_KEY_CODE,
		target
	};
}
