export type DotPicture = 'pgp' | 'key' | 'encrypt' | 'decrypt' | 'sign' | 'verify';

/** The pictures are square: this many dots across and this many down */
export const DOT_PICTURE_SIZE = 11;

const LIT = '#';

// The pictures the dot grid on the homepage can draw. A "#" is a lit dot.
const PICTURES: Readonly<Record<DotPicture, readonly string[]>> = {
	// At rest the grid spells the name of what the sentence is about. It has to
	// differ from every tool's picture, so that each word visibly redraws it.
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
 * Lays a picture out as the dots of the grid, row by row.
 * @param picture - Which picture to draw
 * @returns One entry for each dot, true where the dot is lit
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
