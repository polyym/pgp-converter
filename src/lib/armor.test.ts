import { describe, it, expect } from 'vitest';
import { hasOtherText, normaliseArmor, splitKeyBlocks } from './armor.ts';
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

/** A block with some of its lines taken out and others put in their place */
function withLines(
	lines: readonly string[],
	from: number,
	count: number,
	...others: string[]
): string {
	return lines.toSpliced(from, count, ...others).join('\n');
}

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

	it('should keep the lines under a header name on lines of their own', () => {
		// Joined to "Comment:", they would pass for a comment that somebody wrote
		const paragraphs = [
			plain[0],
			'Comment:',
			'',
			'Pay Mallory 1000.',
			'Today.',
			'',
			...plain.slice(2)
		];
		const restored = [plain[0], 'Comment:', 'Pay Mallory 1000.', 'Today.', '', ...plain.slice(2)];
		expect(normaliseArmor(paragraphs.join('\n'))).toBe(restored.join('\n'));
	});

	it('should restore a header whose value was wrapped onto the next line, as two lines', () => {
		const wrapped = `${plain[0]} Comment: made by\na test ${data.join(' ')} =abcd ${must(plain.at(-1))}`;
		const restored = [
			plain[0],
			'Comment: made by',
			'a test',
			'',
			...data,
			'=abcd',
			must(plain.at(-1))
		];
		expect(normaliseArmor(wrapped)).toBe(restored.join('\n'));
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

describe('hasOtherText', () => {
	const messageLines = [
		'-----BEGIN PGP MESSAGE-----',
		'',
		'abcd',
		'efgh',
		'=abcd',
		'-----END PGP MESSAGE-----'
	];
	const message = messageLines.join('\n');
	// The signed text holds a line that looks like a first line. It is escaped
	// with a dash and a space, as the format requires, so it is no boundary.
	const signedLines = [
		'-----BEGIN PGP SIGNED MESSAGE-----',
		'Hash: SHA512',
		'',
		'Pay Alice 10.',
		'- -----BEGIN PGP MESSAGE-----',
		'-----BEGIN PGP SIGNATURE-----',
		'',
		'abcd',
		'=abcd',
		'-----END PGP SIGNATURE-----'
	];
	const signed = signedLines.join('\n');
	const SIGNATURE_FIRST_LINE = 5;
	const SIGNATURE_LAST_LINE = 9;
	const LINE_SEPARATOR = String.fromCodePoint(0x20_28);
	const ZERO_WIDTH_SPACE = String.fromCodePoint(0x20_0b);

	it('should find nothing more in a message that stands alone', () => {
		expect(hasOtherText(message)).toBe(false);
		expect(hasOtherText(signed)).toBe(false);
	});

	it('should allow the header lines the format names, and a message with no checksum', () => {
		const headers = ['Version: Example 1.0', 'Comment: made here'];
		expect(hasOtherText(withLines(messageLines, 1, 0, ...headers))).toBe(false);
		expect(hasOtherText(withLines(signedLines, SIGNATURE_FIRST_LINE + 1, 0, ...headers))).toBe(
			false
		);
		expect(hasOtherText(withLines(messageLines, 4, 1))).toBe(false);
	});

	it('should allow a checksum on the end of the data, as a block laid out again from one line has it', () => {
		expect(hasOtherText(withLines(messageLines, 2, 3, 'abcdefgh=abcd'))).toBe(false);
		expect(hasOtherText(withLines(messageLines, 2, 3, 'abcdefg===abcd'))).toBe(false);
		expect(hasOtherText(withLines(messageLines, 2, 3, 'abcdefgh=abcd Pay Mallory'))).toBe(true);
		// Only the last line of the data can carry it
		expect(hasOtherText(withLines(messageLines, 2, 3, 'abcdefgh=abcd', 'ijkl'))).toBe(true);
	});

	it('should find lines under a header name that the clean-up kept apart from it', () => {
		const underName = ['Comment:', 'Pay Mallory 1000.'];
		expect(hasOtherText(withLines(messageLines, 1, 0, ...underName))).toBe(true);
	});

	it('should allow a header line that names its kind and says nothing', () => {
		expect(hasOtherText(withLines(messageLines, 1, 0, 'Comment: ', 'Version:'))).toBe(false);
	});

	it('should take for an empty line what the library takes for one', () => {
		// A space of a kind that is not on the library's list, so the library reads on for the empty line
		const oghamSpace = String.fromCodePoint(0x16_80);
		expect(hasOtherText(withLines(messageLines, 1, 1, oghamSpace))).toBe(true);
		const noBreakSpace = String.fromCodePoint(0xa0);
		expect(hasOtherText(withLines(messageLines, 1, 1, noBreakSpace))).toBe(false);
		expect(hasOtherText(withLines(signedLines, 2, 1, noBreakSpace))).toBe(false);
		expect(hasOtherText(withLines(signedLines, SIGNATURE_FIRST_LINE + 1, 1, noBreakSpace))).toBe(
			false
		);
	});

	it('should allow lines that show nothing between the checksum and the last line', () => {
		const noBreakSpace = String.fromCodePoint(0xa0);
		expect(hasOtherText(withLines(messageLines, 5, 0, '', noBreakSpace))).toBe(false);
	});

	it('should find words after the data, even where each stands on a line of its own', () => {
		// As a block looks once the app has laid it out again: every word a line
		const words = ['Please', 'send', '4500', 'EUR'];
		expect(hasOtherText(withLines(messageLines, 4, 1, ...words))).toBe(true);
		expect(hasOtherText(withLines(messageLines, 3, 2, 'efg=', ...words))).toBe(true);
		// The library reads nothing after the padding, so one word there is one too many
		expect(hasOtherText(withLines(messageLines, 3, 2, 'efg=', 'send'))).toBe(true);
		expect(hasOtherText(withLines(messageLines, 3, 2, 'efg='))).toBe(false);
	});

	it('should allow data that a mail program wrapped a second time, but not two short lines in a row', () => {
		const wrappedTwice = ['abcdef', 'gh', 'ijklmn', 'op', 'qrs'];
		expect(hasOtherText(withLines(messageLines, 2, 2, ...wrappedTwice))).toBe(false);
		// Two short lines in a row, with more data to come
		const ragged = ['abcdef', 'gh', 'ij', 'klmnop', 'qrs'];
		expect(hasOtherText(withLines(messageLines, 2, 2, ...ragged))).toBe(true);
	});

	it('should find text above a message', () => {
		expect(hasOtherText(`Hello,\n${message}`)).toBe(true);
		expect(hasOtherText(`Pay Mallory 1000.\n\n${signed}`)).toBe(true);
	});

	it('should find text below a message', () => {
		expect(hasOtherText(`${message}\nRegards`)).toBe(true);
		expect(hasOtherText(`${signed}\nP.S. Pay Mallory 1000.`)).toBe(true);
	});

	it('should not count lines at either end that show nothing', () => {
		expect(hasOtherText(`\n  \n${message}\n\n \t\n`)).toBe(false);
		expect(hasOtherText(`${ZERO_WIDTH_SPACE}\n${signed}\n${LINE_SEPARATOR}`)).toBe(false);
		// The mark that old software ends a file with
		expect(hasOtherText(`${message}\n${String.fromCodePoint(0x1a)}`)).toBe(false);
	});

	it('should read lines that end in a carriage return and a line feed, or in spaces', () => {
		expect(hasOtherText(signed.replaceAll('\n', '\r\n'))).toBe(false);
		expect(hasOtherText(signed.replaceAll('\n', ' \t\n'))).toBe(false);
		expect(hasOtherText(`${signed}\nmore`.replaceAll('\n', '\r\n'))).toBe(true);
	});

	it('should count a second message as other text', () => {
		expect(hasOtherText(`${signed}\n${signed}`)).toBe(true);
		expect(hasOtherText(`${message}\n${message}`)).toBe(true);
	});

	it('should find text among the lines of a message', () => {
		// As a header line of a kind the format does not name, even one that could pass for data
		expect(hasOtherText(withLines(messageLines, 1, 0, 'Pay: Mallory 1000'))).toBe(true);
		expect(hasOtherText(withLines(messageLines, 1, 0, 'PayMallory1000'))).toBe(true);
		expect(
			hasOtherText(withLines(signedLines, SIGNATURE_FIRST_LINE + 1, 0, 'Pay: Mallory 1000'))
		).toBe(true);
		// Among the data, and where the checksum goes
		expect(hasOtherText(withLines(messageLines, 3, 0, 'Pay Mallory 1000.'))).toBe(true);
		expect(hasOtherText(withLines(messageLines, 4, 1, '=Pay Mallory 1000.'))).toBe(true);
		// Between the checksum and the last line
		expect(hasOtherText(withLines(signedLines, SIGNATURE_LAST_LINE, 0, 'Pay Mallory 1000.'))).toBe(
			true
		);
	});

	it('should find text behind a line that only OpenPGP.js takes for the end of a message', () => {
		// For the library two lines of dashes close a message, and so do dashes around words
		const endings = [
			['-----', '-----', 'Pay Mallory 1000.'],
			['-----', 'Pay Mallory 1000.', '-----'],
			['-----Pay Mallory 1000.-----']
		];
		for (const ending of endings) {
			expect(hasOtherText(withLines(signedLines, SIGNATURE_LAST_LINE, 1, ...ending))).toBe(true);
			expect(hasOtherText(withLines(messageLines, 5, 1, ...ending))).toBe(true);
		}
	});

	it('should find a signature that opens under another name', () => {
		const renamed = '-----Pay Mallory 1000.-----';
		expect(hasOtherText(withLines(signedLines, SIGNATURE_FIRST_LINE, 1, renamed))).toBe(true);
	});

	it('should find text that shares a line with the first or the last line', () => {
		expect(hasOtherText(`Pay Mallory 1000. ${signed}`)).toBe(true);
		expect(hasOtherText(`${signed} Pay Mallory 1000.`)).toBe(true);
		// The library also starts and ends a line at a Unicode line separator
		expect(hasOtherText(`Pay Mallory 1000.${LINE_SEPARATOR}${signed}`)).toBe(true);
		expect(hasOtherText(`${signed}${LINE_SEPARATOR}Pay Mallory 1000.`)).toBe(true);
	});

	it('should end the signed text where the library does, at dashes after a line separator', () => {
		// The library takes the first of these lines for the signature's, and stops
		// reading at the true one. Everything from there on only looks like a block.
		const hidden = [`Pay Mallory 1000.${LINE_SEPARATOR}-----X-----`, '', 'abcd'];
		expect(hasOtherText(withLines(signedLines, SIGNATURE_FIRST_LINE, 0, ...hidden))).toBe(true);
	});

	it('should read a first line through a carriage return, as the library does', () => {
		// The library drops every carriage return, wherever in a line it stands
		const broken = signed.replace('SIGNED MESSAGE', 'SIGNED\r MESSAGE');
		expect(hasOtherText(broken)).toBe(false);
		expect(hasOtherText(`Pay Mallory 1000.\n${broken}`)).toBe(true);
	});

	it('should say yes for anything that is not one whole message', () => {
		expect(hasOtherText('')).toBe(true);
		expect(hasOtherText('only some words')).toBe(true);
		expect(hasOtherText(block)).toBe(true);
		expect(hasOtherText(withLines(messageLines, 5, 1))).toBe(true);
		expect(hasOtherText(withLines(signedLines, SIGNATURE_FIRST_LINE, 5))).toBe(true);
	});
});
