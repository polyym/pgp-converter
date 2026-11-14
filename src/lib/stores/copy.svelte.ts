import { COPY_FEEDBACK_MS } from '#lib/constants.ts';

/**
 * Copies text to the clipboard.
 * @param text - The text to copy
 * @returns True if the browser accepted the copy
 */
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
 * Creates the state behind a Copy button: it copies on request and stays
 * marked as copied for a moment, so the button can say so.
 * @returns The reactive flag, the copy function and a way to lower the flag
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
