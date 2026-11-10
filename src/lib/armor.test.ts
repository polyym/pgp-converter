import { describe, it, expect } from 'vitest';
import { normaliseArmor, splitKeyBlocks } from './armor';

const lines = [
	'-----BEGIN PGP PUBLIC KEY BLOCK-----',
	'Comment: example',
	'',
	'xjMEaQAAABYJKwYBBAHaRw8BAQdA',
	'=abcd',
	'-----END PGP PUBLIC KEY BLOCK-----'
];
const block = lines.join('\n');

describe('normaliseArmor', () => {
	it('should leave a clean block unchanged', () => {
		expect(normaliseArmor(block)).toBe(block);
	});

	it('should remove indentation', () => {
		const indented = lines.map((line) => '    ' + line).join('\n');
		expect(normaliseArmor(indented)).toBe(block);
	});

	it('should remove email quote markers', () => {
		const quoted = lines.map((line) => '> ' + line).join('\n');
		const nested = lines.map((line) => '>> ' + line).join('\n');
		expect(normaliseArmor(quoted)).toBe(block);
		expect(normaliseArmor(nested)).toBe(block);
	});

	it('should normalise Windows line endings and trailing spaces', () => {
		const windows = lines.map((line) => line + '  ').join('\r\n');
		expect(normaliseArmor(windows)).toBe(block);
	});

	it('should keep the blank line between the headers and the data', () => {
		expect(normaliseArmor('  ' + block).split('\n')[2]).toBe('');
	});
});

describe('splitKeyBlocks', () => {
	it('should return each key block separately', () => {
		const blocks = splitKeyBlocks(`${block}\nsome text in between\n${block}`);
		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toBe(block);
		expect(blocks[1]).toBe(block);
	});

	it('should return the whole text when it holds no complete block', () => {
		expect(splitKeyBlocks('not a key')).toEqual(['not a key']);
	});

	it('should not pair a public header with a private footer', () => {
		const mismatched = block.replace('END PGP PUBLIC', 'END PGP PRIVATE');
		expect(splitKeyBlocks(mismatched)).toEqual([mismatched]);
	});
});
