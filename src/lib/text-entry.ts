/**
 * Says whether a page may read the clipboard in this browser, which is what
 * a Paste button needs. Call it in the browser only.
 * @returns True if the button can work here
 */
export function canReadClipboard(): boolean {
	// The clipboard is missing on a page that was not served securely, and the
	// method is missing in some browsers, whatever the type definitions say
	const clipboard: unknown = Reflect.get(navigator, 'clipboard');
	return typeof clipboard === 'object' && clipboard !== null && 'readText' in clipboard;
}

/**
 * Says whether the device has a share sheet that a page can hand text to.
 * Only phones and a few desktop browsers do. Call it in the browser only.
 * @returns True if a Share button can work here
 */
export function canShareText(): boolean {
	return 'share' in navigator;
}

/**
 * Adds text to a box at the cursor, as pasting from the keyboard would, and
 * in place of any text that is selected.
 * @param textarea - The box to add to
 * @param text - The text to add
 */
export function insertAtCursor(textarea: HTMLTextAreaElement, text: string): void {
	// The box keeps its cursor while another control, such as a Paste button, has the focus
	textarea.focus();
	// The browser's own editing, so that Undo takes the text out again. The
	// method is deprecated and has no replacement that keeps Undo working.
	if (!document.execCommand('insertText', false, text)) {
		textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
	}
}

/**
 * Puts a further PGP block after the ones a box already holds.
 * @param existing - What the box holds
 * @param addition - The block to add
 * @returns Both, with one empty line between them
 */
export function appendBlock(existing: string, addition: string): string {
	return `${existing.trimEnd()}\n\n${addition.trim()}`;
}
