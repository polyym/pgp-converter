import { PAGE_BOTTOM_TOLERANCE_PX, SECTION_MARK_OFFSET_PX } from './constants.ts';

const SECTION_SELECTOR = '.doc-body > section[id]';
const TOP_BAR_SELECTOR = '.nav';

/**
 * Finds the section of a long page that is being read, for marking it in
 * the list of contents.
 * @returns The id of that section, or undefined on a page without sections
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
 * Chooses the section being read from where each one starts on screen.
 * @param tops - How far down the window each section starts, in page order
 * @param line - How far down the window a section must have reached to count
 * @param isAtBottom - Whether the page is scrolled to its very end
 * @returns The position of the section in the list, or undefined if the list is empty
 */
export function pickSection(
	tops: readonly number[],
	line: number,
	isAtBottom: boolean
): number | undefined {
	if (tops.length === 0) {
		return undefined;
	}
	// At the very bottom the last section may be too short to reach the line
	if (isAtBottom) {
		return tops.length - 1;
	}
	// The last section whose start has passed the line; the first until one has
	let picked = 0;
	for (const [index, top] of tops.entries()) {
		if (top <= line) {
			picked = index;
		}
	}
	return picked;
}
