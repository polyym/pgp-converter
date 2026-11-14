import { describe, it, expect } from 'vitest';
import { normaliseArmor, splitKeyBlocks } from './armor.ts';
import { must } from './testing.ts';

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
		const indented = lines.map((line) => ' '.repeat(4) + line).join('\n');
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
		expect(normaliseArmor('  ' + block).split('\n', 3)[2]).toBe('');
	});
});

describe('normaliseArmor, when line breaks were lost', () => {
	// Long enough to be told apart from a word of a comment, as real data lines are
	const data = [
		'xjMEaQAAABYJKwYBBAHaRw8BAQdAhiBr5lz1+Ox11YCspgHlJz9Bcw0tgKPe',
		'S/zYwk+NqTzNBVByb2JlwsATBBMWCgCFBYJq9ldhAwsJBwkQbM2EfbuXeBdF',
		'7rNtDs44BGr2V2ESCis='
	];
	const plain = [
		'-----BEGIN PGP PUBLIC KEY BLOCK-----',
		'',
		...data,
		'=abcd',
		'-----END PGP PUBLIC KEY BLOCK-----'
	];
	const withHeaders = [
		plain[0],
		'Version: GnuPG v2',
		'Comment: made by a test',
		'',
		...data,
		'=abcd',
		must(plain.at(-1))
	];

	it('should restore a block whose line breaks became spaces', () => {
		const copiedFromAPage = plain.filter((line) => line !== '').join(' ');
		expect(normaliseArmor(copiedFromAPage)).toBe(plain.join('\n'));
	});

	it('should restore the header lines of such a block too', () => {
		const copiedFromAPage = withHeaders.filter((line) => line !== '').join(' ');
		expect(normaliseArmor(copiedFromAPage)).toBe(withHeaders.join('\n'));
	});

	it('should restore a block whose line breaks vanished altogether', () => {
		const pastedThroughOneLineBox = plain.join('');
		const restored = normaliseArmor(pastedThroughOneLineBox).split('\n');
		expect(restored[0]).toBe(plain[0]);
		expect(restored[1]).toBe('');
		expect(restored[2]).toBe(`${data.join('')}=abcd`);
		expect(restored[3]).toBe(plain.at(-1));
	});

	it('should put back the empty line when only that was dropped', () => {
		expect(normaliseArmor(plain.filter((line) => line !== '').join('\n'))).toBe(plain.join('\n'));
		expect(normaliseArmor(withHeaders.filter((line) => line !== '').join('\n'))).toBe(
			withHeaders.join('\n')
		);
	});

	it('should give a restored block lines of its own when other words surround it', () => {
		const inASentence = `my key: ${plain.filter((line) => line !== '').join(' ')} thanks`;
		expect(normaliseArmor(inASentence)).toBe(`my key:\n${plain.join('\n')}\nthanks`);
	});

	it('should restore each of two blocks on one line', () => {
		const one = plain.filter((line) => line !== '').join(' ');
		expect(splitKeyBlocks(normaliseArmor(`${one} ${one}`))).toEqual([
			plain.join('\n'),
			plain.join('\n')
		]);
	});

	it('should leave a block alone when what is inside it is not armor data', () => {
		const odd =
			'-----BEGIN PGP PUBLIC KEY BLOCK----- this is not a key -----END PGP PUBLIC KEY BLOCK-----';
		expect(normaliseArmor(odd)).toBe(odd);
	});

	it('should never rearrange a signed message that anyone can read', () => {
		const signed = [
			'-----BEGIN PGP SIGNED MESSAGE-----',
			'Hash: SHA512',
			'',
			'two words',
			'-----BEGIN PGP SIGNATURE-----',
			'',
			data[0],
			'-----END PGP SIGNATURE-----'
		];
		const collapsed = signed.filter((line) => line !== '').join(' ');
		expect(normaliseArmor(collapsed)).toBe(collapsed);
		expect(normaliseArmor(signed.join('\n'))).toBe(signed.join('\n'));
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

/** How long the clean-up takes on a text, in milliseconds */
function timeOf(text: string): number {
	const start = performance.now();
	splitKeyBlocks(normaliseArmor(text));
	return performance.now() - start;
}

describe('the clean-up, on text built to be slow', () => {
	// Each of these once took seconds to minutes at this size. The limit is far
	// above what they take now, so that a slow machine does not fail the test.
	const LIMIT_MS = 3000;
	const SIZE = 1_000_000;
	const data = 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5';
	const flattened = `-----BEGIN PGP MESSAGE----- ${data} ${data} =abcd -----END PGP MESSAGE-----`;

	it('should read through first lines that have no last line', () => {
		const text = '-----BEGIN PGP MESSAGE-----\n'.repeat(SIZE / 28);
		expect(timeOf(text)).toBeLessThan(LIMIT_MS);
		expect(normaliseArmor(text)).toBe(text.trim());
	});

	it('should read through key first lines that have no last line', () => {
		const text = '-----BEGIN PGP PUBLIC KEY BLOCK-----\n'.repeat(SIZE / 37);
		expect(timeOf(text)).toBeLessThan(LIMIT_MS);
		expect(splitKeyBlocks(text)).toEqual([text]);
	});

	it('should not be held up by a long run of spaces after a block it has laid out again', () => {
		const text = `${flattened}\nbefore${' '.repeat(SIZE)}after`;
		expect(timeOf(text)).toBeLessThan(LIMIT_MS);
		const cleaned = normaliseArmor(text);
		expect(cleaned).toContain(`\n\n${data}\n${data}\n=abcd\n-----END PGP MESSAGE-----`);
		expect(cleaned.endsWith(`before${' '.repeat(SIZE)}after`)).toBe(true);
	});

	it('should take apart thousands of header names that have run together', () => {
		const text = `-----BEGIN PGP MESSAGE----- ${'Comment: abc '.repeat(SIZE / 13)}${data} =abcd -----END PGP MESSAGE-----`;
		expect(timeOf(text)).toBeLessThan(LIMIT_MS);
		expect(
			normaliseArmor(text)
				.split('\n')
				.filter((line) => line === 'Comment: abc')
		).toHaveLength(Math.floor(SIZE / 13));
	});
});

describe('the clean-up, where blocks meet', () => {
	it('should pair a first line with the nearest last line of its own kind', () => {
		const message = '-----BEGIN PGP MESSAGE-----\n\nabcd\n-----END PGP MESSAGE-----';
		const text = `${block}\n${message}\n${block}`;
		expect(splitKeyBlocks(text)).toEqual([block, block]);
	});

	it('should skip a first line whose kind never ends, and still find the block after it', () => {
		const text = `-----BEGIN PGP PRIVATE KEY BLOCK-----\n${block}`;
		expect(splitKeyBlocks(text)).toEqual([block]);
	});

	it('should not start a block inside another', () => {
		const inner = '-----BEGIN PGP PUBLIC KEY BLOCK-----';
		const text = `${lines.slice(0, 4).join('\n')}\n${inner}\n${lines.slice(4).join('\n')}`;
		expect(splitKeyBlocks(text)).toEqual([text]);
	});
});
