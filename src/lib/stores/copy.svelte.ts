import { COPY_FEEDBACK_MS } from '#lib/constants.ts';

/** Writes text to the clipboard. Resolves to false, and never rejects, if the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		// The browser refused, or the page is not allowed to write to the clipboard
		return false;
	}
}

/**
 * Creates the state behind a Copy button: `copy` writes to the clipboard and,
 * if that works, sets `isCopied` for COPY_FEEDBACK_MS so the button can say so.
 * `reset` clears the flag early.
 */
export function createCopyFlag() {
	let isCopied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy(text: string): Promise<boolean> {
		if (!(await copyText(text))) {
			return false;
		}
		clearTimeout(timer);
		isCopied = true;
		timer = setTimeout(() => {
			isCopied = false;
		}, COPY_FEEDBACK_MS);
		return true;
	}

	function reset(): void {
		clearTimeout(timer);
		isCopied = false;
	}

	return {
		/** True for a moment after a copy that the browser accepted */
		get isCopied() {
			return isCopied;
		},
		copy,
		reset
	};
}
