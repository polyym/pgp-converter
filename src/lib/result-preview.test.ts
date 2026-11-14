import { describe, it, expect } from 'vitest';
import { previewOf } from './result-preview.ts';
import { RESULT_PREVIEW_CHARS } from './constants.ts';

describe('previewOf', () => {
	it('should show a short text whole', () => {
		expect(previewOf('hello')).toEqual({ shown: 'hello', isCut: false, length: 5 });
	});

	it('should show a text of exactly the limit whole', () => {
		const text = 'x'.repeat(RESULT_PREVIEW_CHARS);
		const preview = previewOf(text);
		expect(preview.isCut).toBe(false);
		expect(preview.shown).toBe(text);
	});

	it('should cut a longer text at the limit and report its full length', () => {
		const text = 'x'.repeat(RESULT_PREVIEW_CHARS + 1);
		const preview = previewOf(text);
		expect(preview.isCut).toBe(true);
		expect(preview.shown).toHaveLength(RESULT_PREVIEW_CHARS);
		expect(preview.length).toBe(RESULT_PREVIEW_CHARS + 1);
	});

	it('should end at a line break when one is near the limit', () => {
		const text = `${'a'.repeat(95)}\n${'b'.repeat(50)}`;
		expect(previewOf(text, 100).shown).toBe('a'.repeat(95));
	});

	it('should not go far back for a line break', () => {
		const text = `${'a'.repeat(10)}\n${'b'.repeat(200)}`;
		expect(previewOf(text, 100).shown).toHaveLength(100);
	});

	it('should not leave half a character at the end', () => {
		const text = `${'a'.repeat(99)}😀${'b'.repeat(50)}`;
		const preview = previewOf(text, 100);
		expect(preview.shown).toBe('a'.repeat(99));
		expect(preview.shown.isWellFormed()).toBe(true);
	});

	it('should show only whole lines of a long PGP block', () => {
		const line = 'A'.repeat(64);
		const block = Array.from({ length: 5000 }, () => line).join('\n');
		const preview = previewOf(block);
		expect(preview.isCut).toBe(true);
		expect(preview.shown.split('\n').every((shown) => shown === line)).toBe(true);
	});

	it('should stay quick on a very long text', () => {
		const start = performance.now();
		previewOf('x'.repeat(16_000_000));
		expect(performance.now() - start).toBeLessThan(1000);
	});
});
