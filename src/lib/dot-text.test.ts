import { describe, it, expect } from 'vitest';
import { toDotText, DOT_TEXT_ROWS } from './dot-text.ts';

/** Draws the grid back as text, one line per row */
function draw(text: string): string[] {
	const { columns, dots } = toDotText(text);
	return Array.from({ length: DOT_TEXT_ROWS }, (_unused, row) =>
		dots
			.slice(row * columns, (row + 1) * columns)
			.map((lit) => (lit ? '#' : '.'))
			.join('')
	);
}

describe('toDotText', () => {
	it('should draw a single digit', () => {
		expect(draw('7')).toEqual(['###', '..#', '..#', '..#', '..#']);
	});

	it('should leave one unlit column between characters', () => {
		expect(draw('1.0')).toEqual(['.#....###', '##....#.#', '.#....#.#', '.#....#.#', '###.#.###']);
	});

	it('should size the grid to fit a version of any length', () => {
		for (const version of ['v4.0.0', 'v3.10.12', 'v10.0.0']) {
			const { columns, dots } = toDotText(version);
			expect(dots).toHaveLength(columns * DOT_TEXT_ROWS);
			expect(dots.some(Boolean)).toBe(true);
		}
		expect(toDotText('v3.10.12').columns).toBeGreaterThan(toDotText('v4.0.0').columns);
	});

	it('should leave out characters it has no drawing for', () => {
		expect(toDotText('3-beta').columns).toBe(toDotText('3').columns);
	});

	it('should return an empty grid for empty text', () => {
		expect(toDotText('')).toEqual({ columns: 0, dots: [] });
	});
});
