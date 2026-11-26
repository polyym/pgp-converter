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

/** Joins `lines` with `count` lines at `from` replaced by `others` */
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
	// Full-length lines, as real armour has, so they are not mistaken for header words
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

	it('should put a restored block on its own lines when text surrounds it', () => {
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

	it('should not join the lines under an empty header onto it', () => {
		// Joined onto "Comment:" they would read as its value, which hasOtherText does not flag
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

	it('should keep a wrapped header value on two lines', () => {
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

	it('should leave a block alone when its body is not armoured data', () => {
		const odd =
			'-----BEGIN PGP PUBLIC KEY BLOCK----- this is not a key -----END PGP PUBLIC KEY BLOCK-----';
		expect(normaliseArmor(odd)).toBe(odd);
	});

	it('should never reflow a cleartext signed message', () => {
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

/** Milliseconds that normaliseArmor and splitKeyBlocks take on the text */
function timeOf(text: string): number {
	const start = performance.now();
	splitKeyBlocks(normaliseArmor(text));
	return performance.now() - start;
}

describe('normaliseArmor and splitKeyBlocks, on input built to be slow', () => {
	// Quadratic code takes seconds to minutes on these inputs. The limit is far
	// above the linear time, so a slow machine does not fail the test.
	const LIMIT_MS = 3000;
	const SIZE = 1_000_000;
	const data = 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5';
	const flattened = `-----BEGIN PGP MESSAGE----- ${data} ${data} =abcd -----END PGP MESSAGE-----`;

	it('should stay fast on BEGIN lines with no END line', () => {
		const text = '-----BEGIN PGP MESSAGE-----\n'.repeat(SIZE / 28);
		expect(timeOf(text)).toBeLessThan(LIMIT_MS);
		expect(normaliseArmor(text)).toBe(text.trim());
	});

	it('should stay fast on key BEGIN lines with no END line', () => {
		const text = '-----BEGIN PGP PUBLIC KEY BLOCK-----\n'.repeat(SIZE / 37);
		expect(timeOf(text)).toBeLessThan(LIMIT_MS);
		expect(splitKeyBlocks(text)).toEqual([text]);
	});

	it('should stay fast on a long run of spaces after a restored block', () => {
		const text = `${flattened}\nbefore${' '.repeat(SIZE)}after`;
		expect(timeOf(text)).toBeLessThan(LIMIT_MS);
		const cleaned = normaliseArmor(text);
		expect(cleaned).toContain(`\n\n${data}\n${data}\n=abcd\n-----END PGP MESSAGE-----`);
		expect(cleaned.endsWith(`before${' '.repeat(SIZE)}after`)).toBe(true);
	});

	it('should stay fast on thousands of flattened headers', () => {
		const text = `-----BEGIN PGP MESSAGE----- ${'Comment: abc '.repeat(SIZE / 13)}${data} =abcd -----END PGP MESSAGE-----`;
		expect(timeOf(text)).toBeLessThan(LIMIT_MS);
		expect(
			normaliseArmor(text)
				.split('\n')
				.filter((line) => line === 'Comment: abc')
		).toHaveLength(Math.floor(SIZE / 13));
	});
});

describe('splitKeyBlocks, where blocks meet', () => {
	it('should pair a BEGIN line with the nearest END line of the same type', () => {
		const message = '-----BEGIN PGP MESSAGE-----\n\nabcd\n-----END PGP MESSAGE-----';
		const text = `${block}\n${message}\n${block}`;
		expect(splitKeyBlocks(text)).toEqual([block, block]);
	});

	it('should skip an unmatched BEGIN line and find the block after it', () => {
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
	// The signed text holds a dash-escaped BEGIN line (RFC 9580 section 7.2), which is no boundary
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

	it('should find nothing else in a lone message', () => {
		expect(hasOtherText(message)).toBe(false);
		expect(hasOtherText(signed)).toBe(false);
	});

	it('should allow known armour headers and a missing checksum', () => {
		const headers = ['Version: Example 1.0', 'Comment: made here'];
		expect(hasOtherText(withLines(messageLines, 1, 0, ...headers))).toBe(false);
		expect(hasOtherText(withLines(signedLines, SIGNATURE_FIRST_LINE + 1, 0, ...headers))).toBe(
			false
		);
		expect(hasOtherText(withLines(messageLines, 4, 1))).toBe(false);
	});

	it('should allow a checksum on the end of the last data line', () => {
		expect(hasOtherText(withLines(messageLines, 2, 3, 'abcdefgh=abcd'))).toBe(false);
		expect(hasOtherText(withLines(messageLines, 2, 3, 'abcdefg===abcd'))).toBe(false);
		expect(hasOtherText(withLines(messageLines, 2, 3, 'abcdefgh=abcd Pay Mallory'))).toBe(true);
		// Only the last line of the data can carry it
		expect(hasOtherText(withLines(messageLines, 2, 3, 'abcdefgh=abcd', 'ijkl'))).toBe(true);
	});

	it('should find a line that normaliseArmor kept below an empty header', () => {
		const underName = ['Comment:', 'Pay Mallory 1000.'];
		expect(hasOtherText(withLines(messageLines, 1, 0, ...underName))).toBe(true);
	});

	it('should allow a known header with an empty value', () => {
		expect(hasOtherText(withLines(messageLines, 1, 0, 'Comment: ', 'Version:'))).toBe(false);
	});

	it('should read as blank exactly what OpenPGP.js reads as blank', () => {
		// U+1680 OGHAM SPACE MARK is whitespace, but not in the library's blank-line class
		const oghamSpace = String.fromCodePoint(0x16_80);
		expect(hasOtherText(withLines(messageLines, 1, 1, oghamSpace))).toBe(true);
		const noBreakSpace = String.fromCodePoint(0xa0);
		expect(hasOtherText(withLines(messageLines, 1, 1, noBreakSpace))).toBe(false);
		expect(hasOtherText(withLines(signedLines, 2, 1, noBreakSpace))).toBe(false);
		expect(hasOtherText(withLines(signedLines, SIGNATURE_FIRST_LINE + 1, 1, noBreakSpace))).toBe(
			false
		);
	});

	it('should allow invisible lines between the checksum and the END line', () => {
		const noBreakSpace = String.fromCodePoint(0xa0);
		expect(hasOtherText(withLines(messageLines, 5, 0, '', noBreakSpace))).toBe(false);
	});

	it('should find words after the data, even one per line', () => {
		// As rebuildBlock lays out a sentence that was flattened into the data
		const words = ['Please', 'send', '4500', 'EUR'];
		expect(hasOtherText(withLines(messageLines, 4, 1, ...words))).toBe(true);
		expect(hasOtherText(withLines(messageLines, 3, 2, 'efg=', ...words))).toBe(true);
		// OpenPGP.js reads nothing after the padding, so even one word there is other text
		expect(hasOtherText(withLines(messageLines, 3, 2, 'efg=', 'send'))).toBe(true);
		expect(hasOtherText(withLines(messageLines, 3, 2, 'efg='))).toBe(false);
	});

	it('should allow rewrapped data but not two short lines in a row', () => {
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

	it('should ignore invisible lines at either end', () => {
		expect(hasOtherText(`\n  \n${message}\n\n \t\n`)).toBe(false);
		expect(hasOtherText(`${ZERO_WIDTH_SPACE}\n${signed}\n${LINE_SEPARATOR}`)).toBe(false);
		// U+001A, the DOS end-of-file marker
		expect(hasOtherText(`${message}\n${String.fromCodePoint(0x1a)}`)).toBe(false);
	});

	it('should accept CRLF line endings and trailing whitespace', () => {
		expect(hasOtherText(signed.replaceAll('\n', '\r\n'))).toBe(false);
		expect(hasOtherText(signed.replaceAll('\n', ' \t\n'))).toBe(false);
		expect(hasOtherText(`${signed}\nmore`.replaceAll('\n', '\r\n'))).toBe(true);
	});

	it('should count a second message as other text', () => {
		expect(hasOtherText(`${signed}\n${signed}`)).toBe(true);
		expect(hasOtherText(`${message}\n${message}`)).toBe(true);
	});

	it('should find text among the lines of a message', () => {
		// Among the headers: an unknown header key, or a word that could pass for data
		expect(hasOtherText(withLines(messageLines, 1, 0, 'Pay: Mallory 1000'))).toBe(true);
		expect(hasOtherText(withLines(messageLines, 1, 0, 'PayMallory1000'))).toBe(true);
		expect(
			hasOtherText(withLines(signedLines, SIGNATURE_FIRST_LINE + 1, 0, 'Pay: Mallory 1000'))
		).toBe(true);
		// Among the data, and where the checksum goes
		expect(hasOtherText(withLines(messageLines, 3, 0, 'Pay Mallory 1000.'))).toBe(true);
		expect(hasOtherText(withLines(messageLines, 4, 1, '=Pay Mallory 1000.'))).toBe(true);
		// Between the checksum and the END line
		expect(hasOtherText(withLines(signedLines, SIGNATURE_LAST_LINE, 0, 'Pay Mallory 1000.'))).toBe(
			true
		);
	});

	it('should find text after a line that only OpenPGP.js reads as an END line', () => {
		// In the library's boundary regex [^-]+ can span line breaks, so two lines of
		// dashes, or dashes around any text, end the message for it
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

	it('should find a signature with a different BEGIN line', () => {
		const renamed = '-----Pay Mallory 1000.-----';
		expect(hasOtherText(withLines(signedLines, SIGNATURE_FIRST_LINE, 1, renamed))).toBe(true);
	});

	it('should find text on the same line as the BEGIN or END line', () => {
		expect(hasOtherText(`Pay Mallory 1000. ${signed}`)).toBe(true);
		expect(hasOtherText(`${signed} Pay Mallory 1000.`)).toBe(true);
		// The library's m-flag regex also breaks lines at U+2028
		expect(hasOtherText(`Pay Mallory 1000.${LINE_SEPARATOR}${signed}`)).toBe(true);
		expect(hasOtherText(`${signed}${LINE_SEPARATOR}Pay Mallory 1000.`)).toBe(true);
	});

	it('should end the signed text where OpenPGP.js does, at dashes after U+2028', () => {
		// The library reads "-----X-----" as the signature's BEGIN line and stops at the
		// real one, so the signature block that follows only looks like one
		const hidden = [`Pay Mallory 1000.${LINE_SEPARATOR}-----X-----`, '', 'abcd'];
		expect(hasOtherText(withLines(signedLines, SIGNATURE_FIRST_LINE, 0, ...hidden))).toBe(true);
	});

	it('should ignore a carriage return inside the BEGIN line, as OpenPGP.js does', () => {
		// The library removes every \r, not only those at the end of a line
		const broken = signed.replace('SIGNED MESSAGE', 'SIGNED\r MESSAGE');
		expect(hasOtherText(broken)).toBe(false);
		expect(hasOtherText(`Pay Mallory 1000.\n${broken}`)).toBe(true);
	});

	it('should return true for anything but one whole message', () => {
		expect(hasOtherText('')).toBe(true);
		expect(hasOtherText('only some words')).toBe(true);
		expect(hasOtherText(block)).toBe(true);
		expect(hasOtherText(withLines(messageLines, 5, 1))).toBe(true);
		expect(hasOtherText(withLines(signedLines, SIGNATURE_FIRST_LINE, 5))).toBe(true);
	});
});
