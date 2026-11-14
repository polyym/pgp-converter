import { describe, it, expect } from 'vitest';
import { pickSection } from './sections.ts';

describe('pickSection', () => {
	it('should pick the first section before any has reached the line', () => {
		expect(pickSection([200, 900, 1600], 100, false)).toBe(0);
	});

	it('should pick the last section that has passed the line', () => {
		expect(pickSection([-700, 40, 800], 100, false)).toBe(1);
		expect(pickSection([-1500, -800, 90], 100, false)).toBe(2);
	});

	it('should count a section that starts exactly on the line', () => {
		expect(pickSection([-500, 100, 700], 100, false)).toBe(1);
	});

	it('should pick the last section at the very bottom, however short it is', () => {
		expect(pickSection([-900, -200, 400], 100, true)).toBe(2);
	});

	it('should pick nothing on a page without sections', () => {
		expect(pickSection([], 100, false)).toBeUndefined();
		expect(pickSection([], 100, true)).toBeUndefined();
	});
});
