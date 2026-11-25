import { RESULT_PREVIEW_CHARS } from './constants.ts';

/** The part of a result to render into the page */
export interface ResultPreview {
	/** The whole text, or its beginning if it is very long */
	shown: string;
	/** Whether the text was too long to show whole */
	isCut: boolean;
	/** Length of the whole text, in UTF-16 code units */
	length: number;
}

// Cut at the last line break if it falls within the final tenth of the limit
const LINE_BREAK_REACH = 0.9;

/**
 * Returns the text whole if it is at most `limit` UTF-16 code units long.
 * Otherwise returns its beginning, cut at the last line break in the final tenth
 * of the limit or else at the limit itself, without splitting a surrogate pair.
 * Rendering a very long result can stall the page (see RESULT_PREVIEW_CHARS);
 * the caller keeps the whole text for copying and downloading.
 */
export function previewOf(text: string, limit: number = RESULT_PREVIEW_CHARS): ResultPreview {
	if (text.length <= limit) {
		return { shown: text, isCut: false, length: text.length };
	}
	let shown = text.slice(0, limit);
	const lastBreak = shown.lastIndexOf('\n');
	if (lastBreak >= limit * LINE_BREAK_REACH) {
		shown = shown.slice(0, lastBreak);
	} else if (!shown.isWellFormed()) {
		// The cut split a surrogate pair, such as an emoji
		shown = shown.slice(0, -1);
	}
	return { shown, isCut: true, length: text.length };
}
