export type DotPicture = 'pgp' | 'key' | 'encrypt' | 'decrypt' | 'sign' | 'verify';

/** Width and height of every picture, in dots */
export const DOT_PICTURE_SIZE = 11;

const LIT = '#';

// Pictures for the homepage dot grid, one string per row. A "#" is a lit dot.
const PICTURES: Readonly<Record<DotPicture, readonly string[]>> = {
	// Shown at rest. It must differ from every tool's picture so the grid visibly
	// redraws when a tool's link in the hero sentence is hovered or focused.
	pgp: [
		'...........',
		'...........',
		'###.###.###',
		'#.#.#...#.#',
		'#.#.#...#.#',
		'###.#.#.###',
		'#...#.#.#..',
		'#...#.#.#..',
		'#...###.#..',
		'...........',
		'...........'
	],
	key: [
		'...........',
		'...........',
		'..###......',
		'.#...#.....',
		'.#...#.....',
		'.#...######',
		'.#...#..#.#',
		'..###...#.#',
		'...........',
		'...........',
		'...........'
	],
	encrypt: [
		'...#####...',
		'..#.....#..',
		'..#.....#..',
		'..#.....#..',
		'.#########.',
		'.#########.',
		'.####.####.',
		'.####.####.',
		'.#########.',
		'.#########.',
		'...........'
	],
	decrypt: [
		'...#####...',
		'..#.....#..',
		'..#........',
		'..#........',
		'.#########.',
		'.#########.',
		'.####.####.',
		'.####.####.',
		'.#########.',
		'.#########.',
		'...........'
	],
	sign: [
		'........##.',
		'.......####',
		'......####.',
		'.....####..',
		'....####...',
		'...####....',
		'..####.....',
		'.####......',
		'.###.......',
		'.##........',
		'...........'
	],
	verify: [
		'.#########.',
		'.#.......#.',
		'.#......##.',
		'.#.....#.#.',
		'.#.#..#..#.',
		'.#..##...#.',
		'..#.....#..',
		'..#.....#..',
		'...#...#...',
		'....###....',
		'...........'
	]
};

/** Every picture the grid can draw */
export const DOT_PICTURE_NAMES: readonly DotPicture[] = [
	'pgp',
	'key',
	'encrypt',
	'decrypt',
	'sign',
	'verify'
];

/**
 * Returns the picture as DOT_PICTURE_SIZE squared booleans, row by row from the
 * top left, true where a dot is lit
 */
export function pictureDots(picture: DotPicture): boolean[] {
	const dots: boolean[] = [];
	const rows = PICTURES[picture];
	for (const row of rows) {
		for (let column = 0; column < row.length; column++) {
			dots.push(row.charAt(column) === LIT);
		}
	}
	return dots;
}
