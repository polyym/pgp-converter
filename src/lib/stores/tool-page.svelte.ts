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
	/**
	 * What to do when the page has sat untouched for too long. Defaults to
	 * clearing the whole form, the same as onClear.
	 */
	onIdle?: () => void;
	/** Whether anything is on the page that an idle clear would remove; defaults to canClear */
	hasSecrets?: () => boolean;
	/** What to tell the user after an idle clear */
	idleNotice?: string;
	/**
	 * The inputs the result depends on, in a fixed order. Once any of them is
	 * changed after a run, the result on screen is out of date. Leave out
	 * anything that does not change the result, such as a passphrase.
	 */
	resultInputs?: () => readonly string[];
}

/** What every operation in src/lib reports back */
export interface RunOutcome {
	success: boolean;
	error?: string;
	/** The id of the input the failure is about, when it is about one */
	errorField?: string;
}

/** What a run that produced a result tells the user */
export interface RunReport {
	/** For example "Encrypted" */
	message: string;
	/**
	 * The run worked but its result is not good news, such as a signature that
	 * does not match. The message is then shown as a problem.
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
	 * Whether to wait a moment before the work starts, so that the busy state
	 * is drawn before the cryptography takes over the page. On by default.
	 */
	shouldPaintFirst?: boolean;
}

/** The shared behaviour of one tool page, as its components use it */
export type ToolPage = ReturnType<typeof createToolPage>;

const DEFAULT_IDLE_NOTICE = `Cleared after ${String(IDLE_CLEAR_MINUTES)} minutes without activity, so your keys and messages are not left on screen.`;

/**
 * Creates the behaviour that the tool pages share: running the main action
 * and reporting how it ended, copying the result, keyboard shortcuts and
 * their dialog, the donation banner, clearing after a time without activity,
 * and marking a result whose inputs have changed since it was made.
 *
 * Call it while the page component is being set up: it starts listening when
 * the page is shown and stops when the page is left.
 * @param options - The page's actions and what is currently possible
 * @returns Reactive state for the page's markup, plus the helpers its handlers call
 */
export function createToolPage(options: ToolPageOptions) {
	const feedback = createFeedback();
	const copyFlag = createCopyFlag();
	const clearConfirm = createClearConfirm(options.onClear);
	const freshness = createResultFreshness(options.resultInputs);
	let isShortcutsOpen = $state(false);
	let isDonationOffered = $state(false);
	// Shortcut hints stay hidden until the page is running in a browser and knows
	// whether it is on a touch device, so nobody sees hints that then disappear
	let areHintsVisible = $state(false);
	let isApple = $state(false);
	let isLoading = $state(false);
	let runId = 0;
	let fieldError = $state<{ field: string; message: string }>();
	let idleNotice = $state('');
	let resultElement = $state<HTMLElement>();
	// True only while a shortcut pressed inside a multi-line field is starting a run
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

	/** Runs the main action, if the form is ready for it and nothing is running */
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
	 * Runs the page's main action once and reports how it ended. A result that
	 * arrives after the form was cleared, or after a newer run began, is
	 * discarded and never reappears.
	 * @param steps - The work, and what the page does with its result
	 */
	async function run<T extends RunOutcome>(steps: ToolRun<T>): Promise<void> {
		if (isLoading) {
			return;
		}
		const id = ++runId;
		// A run started with the shortcut from inside a multi-line field leaves
		// focus there: that user is still typing
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
				// Offered after a successful operation, unless it was dismissed recently
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
	 * The user wants the out-of-date result as it is. Its buttons come back,
	 * and focus goes to the first of them so that the next key press can use it.
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
		// A stray shortcut must not copy an out-of-date result. It leads to the
		// choice instead, where a mindless copy would have taken the old result.
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
		// A dialog that is asking a question has the keyboard to itself
		if (document.querySelector('dialog[open]')) {
			return;
		}
		// Carrying on with anything else withdraws a half-made request to clear
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
		 * True when an input has changed since the result was made. The result is
		 * then no longer what the form would produce, and must not pass for it.
		 */
		get isResultStale() {
			return freshness.isStale;
		},
		/**
		 * True while an out-of-date result's Copy, Download and Share buttons are
		 * put away, which is until the user asks for them or runs the action again
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
		// Some browsers report a composition only through the old key code, which
		// is why the deprecated property is still read here
		isComposing: e.isComposing || e.keyCode === COMPOSING_KEY_CODE,
		target
	};
}
