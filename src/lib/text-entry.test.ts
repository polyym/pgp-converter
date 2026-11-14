import { describe, it, expect } from 'vitest';
import { appendBlock } from './text-entry.ts';

describe('appendBlock', () => {
	it('should put the addition after what is there, one empty line apart', () => {
		expect(appendBlock('FIRST', 'SECOND')).toBe('FIRST\n\nSECOND');
	});

	it('should not stack up empty lines that were already at the end', () => {
		expect(appendBlock('FIRST\n\n\n', 'SECOND')).toBe('FIRST\n\nSECOND');
	});

	it('should drop the space around the addition', () => {
		expect(appendBlock('FIRST', '\n  SECOND\n\n')).toBe('FIRST\n\nSECOND');
	});

	it('should keep the lines inside each block as they are', () => {
		expect(appendBlock('A\nB', 'C\nD')).toBe('A\nB\n\nC\nD');
	});
});
