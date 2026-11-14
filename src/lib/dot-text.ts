/** Height of every glyph, in dots */
export const DOT_TEXT_ROWS = 5;

// A five-row dot font with just the characters a version number needs.
// Each glyph is its rows from top to bottom; "#" is a lit dot.
const LIT = '#';
const UNLIT = '.';
const GLYPHS: Readonly<Partial<Record<string, readonly string[]>>> = {
	'0': ['###', '#.#', '#.#', '#.#', '###'],
	'1': ['.#.', '##.', '.#.', '.#.', '###'],
	'2': ['###', '..#', '###', '#..', '###'],
	'3': ['###', '..#', '###', '..#', '###'],
	'4': ['#.#', '#.#', '###', '..#', '..#'],
	'5': ['###', '#..', '###', '..#', '###'],
	'6': ['###', '#..', '###', '#.#', '###'],
	'7': ['###', '..#', '..#', '..#', '..#'],
	'8': ['###', '#.#', '###', '#.#', '###'],
	'9': ['###', '#.#', '###', '..#', '###'],
	'.': ['.', '.', '.', '.', '#'],
	v: ['#.#', '#.#', '#.#', '#.#', '.#.']
};

export interface DotText {
	/** Number of dots across */
	columns: number;
	/** Every dot, row by row from the top left; true where it is lit */
	dots: boolean[];
}

/**
 * Lays out a short piece of text, such as "v4.0.0", as a grid of dots
 * @param text - Digits, full stops and the letter v; anything else is left out
 * @returns The width of the grid and which of its dots are lit
 */
export function toDotText(text: string): DotText {
	const glyphs: (readonly string[])[] = [];
	for (const character of text) {
		const glyph = GLYPHS[character];
		if (glyph) {
			glyphs.push(glyph);
		}
	}

	const dots: boolean[] = [];
	let columns = 0;
	for (let row = 0; row < DOT_TEXT_ROWS; row++) {
		// One unlit column between characters
		const line = glyphs.map((glyph) => glyph[row]).join(UNLIT);
		columns = line.length;
		for (const dot of line) {
			dots.push(dot === LIT);
		}
	}
	return { columns, dots };
}
