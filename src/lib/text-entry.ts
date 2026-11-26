/**
 * Returns true if navigator.clipboard.readText exists, so a Paste button can
 * work. It does not tell whether the visitor will grant permission. Browser only.
 */
export function canReadClipboard(): boolean {
	// navigator.clipboard is undefined outside a secure context, and some browsers
	// lack readText, although the DOM types declare both
	const clipboard: unknown = Reflect.get(navigator, 'clipboard');
	return typeof clipboard === 'object' && clipboard !== null && 'readText' in clipboard;
}

/**
 * Returns true if the Web Share API is available, which is mostly on phones and
 * in a few desktop browsers. Browser only.
 */
export function canShareText(): boolean {
	return 'share' in navigator;
}

/**
 * Focuses the textarea and inserts text at the caret, replacing any selection,
 * as a keyboard paste would
 */
export function insertAtCursor(textarea: HTMLTextAreaElement, text: string): void {
	// The textarea keeps its selection while a Paste button has focus, and
	// execCommand acts on the focused element
	textarea.focus();
	// execCommand goes through the browser's own editing, so Undo removes the text.
	// It is deprecated but has no replacement that keeps Undo working.
	if (!document.execCommand('insertText', false, text)) {
		textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
	}
}

/**
 * Appends a PGP block to a text box's contents with one blank line between them,
 * trimming trailing whitespace from `existing` and surrounding whitespace from
 * `addition`.
 */
export function appendBlock(existing: string, addition: string): string {
	return `${existing.trimEnd()}\n\n${addition.trim()}`;
}
