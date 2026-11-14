import { describe, it, expect } from 'vitest';
import { DOT_PICTURE_NAMES, DOT_PICTURE_SIZE, pictureDots } from './dot-pictures.ts';

describe('pictureDots', () => {
	it('should fill the whole grid for every picture', () => {
		for (const name of DOT_PICTURE_NAMES) {
			expect(pictureDots(name)).toHaveLength(DOT_PICTURE_SIZE * DOT_PICTURE_SIZE);
		}
	});

	it('should light some dots in every picture, and leave some dark', () => {
		for (const name of DOT_PICTURE_NAMES) {
			const dots = pictureDots(name);
			expect(dots.includes(true)).toBe(true);
			expect(dots.some((lit) => !lit)).toBe(true);
		}
	});

	it('should draw every picture differently, so that each word redraws the grid', () => {
		const drawings = DOT_PICTURE_NAMES.map((name) => pictureDots(name).join(','));
		expect(new Set(drawings).size).toBe(DOT_PICTURE_NAMES.length);
	});

	it('should read the rows from the top, left to right', () => {
		const dots = pictureDots('verify');
		// The first row of the shield is dark at both ends and lit between them
		expect(dots.slice(0, DOT_PICTURE_SIZE)).toEqual([
			false,
			true,
			true,
			true,
			true,
			true,
			true,
			true,
			true,
			true,
			false
		]);
	});
});
