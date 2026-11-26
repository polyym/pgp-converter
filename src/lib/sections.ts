import { PAGE_BOTTOM_TOLERANCE_PX, SECTION_MARK_OFFSET_PX } from './constants.ts';

const SECTION_SELECTOR = '.doc-body > section[id]';
const TOP_BAR_SELECTOR = '.nav';

/**
 * Returns the id of the section being read, for marking it in the table of
 * contents, or undefined on a page without `.doc-body > section[id]` elements.
 */
export function findCurrentSection(): string | undefined {
	const sections = [...document.querySelectorAll<HTMLElement>(SECTION_SELECTOR)];
	const topBarBottom =
		document.querySelector(TOP_BAR_SELECTOR)?.getBoundingClientRect().bottom ?? 0;
	const isAtBottom =
		window.innerHeight + window.scrollY >=
		document.documentElement.scrollHeight - PAGE_BOTTOM_TOLERANCE_PX;
	const index = pickSection(
		sections.map((section) => section.getBoundingClientRect().top),
		topBarBottom + SECTION_MARK_OFFSET_PX,
		isAtBottom
	);
	return index === undefined ? undefined : sections[index].id;
}

/**
 * Returns the index of the last section whose top is at or above `line`, or 0
 * while none has reached it. At the bottom of the page it returns the last
 * section instead. Returns undefined for an empty list.
 * @param tops - Each section's top edge relative to the viewport, in CSS pixels and page order
 * @param line - The viewport y coordinate a section's top must reach to count as current
 */
export function pickSection(
	tops: readonly number[],
	line: number,
	isAtBottom: boolean
): number | undefined {
	if (tops.length === 0) {
		return undefined;
	}
	// The last section may be too short ever to reach the line
	if (isAtBottom) {
		return tops.length - 1;
	}
	let picked = 0;
	for (const [index, top] of tops.entries()) {
		if (top <= line) {
			picked = index;
		}
	}
	return picked;
}
