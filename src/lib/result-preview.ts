import { RESULT_PREVIEW_CHARS } from './constants.ts';

/** What part of a result to put on the page */
export interface ResultPreview {
	/** The whole text, or its beginning if it is very long */
	shown: string;
	/** Whether the text was too long to show whole */
	isCut: boolean;
	/** How long the whole text is, in characters */
	length: number;
}

// How far back from the limit a line break may be and still be where the text is cut
const LINE_BREAK_REACH = 0.9;

/**
 * Chooses how much of a result to show. A very long text is cut, at a line
 * break if one is near, so that showing it cannot hold the page up. The whole
 * text stays with the caller for copying and downloading.
 * @param text - The whole result
 * @param limit - The most characters to show
 * @returns The part to show, and whether anything was left out
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
		// The cut fell between the two halves of a character such as an emoji
		shown = shown.slice(0, -1);
	}
	return { shown, isCut: true, length: text.length };
}
