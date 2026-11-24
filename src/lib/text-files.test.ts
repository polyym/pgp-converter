import { describe, it, expect } from 'vitest';
import {
	readTextFiles,
	detectTextEncoding,
	fileNotArmoredErrorFor,
	MAX_TEXT_FILE_BYTES,
	FILE_TOO_LARGE_ERROR,
	FILES_TOO_LARGE_ERROR,
	FILE_NOT_ARMORED_ERROR,
	FILE_UNREADABLE_ERROR
} from './text-files.ts';

const KEY = '-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nabc\n-----END PGP PUBLIC KEY BLOCK-----';

/** The text as UTF-16, low byte first (the kind Windows writes) or high byte first */
function utf16(text: string, lowByteFirst: boolean, mark: boolean): Uint8Array<ArrayBuffer> {
	const marked = mark ? String.fromCodePoint(0xfe_ff) + text : text;
	const bytes = Buffer.from(marked, 'utf16le');
	return new Uint8Array(lowByteFirst ? bytes : bytes.swap16());
}

describe('readTextFiles', () => {
	it('should return the text of a key file', async () => {
		const result = await readTextFiles([new File([`${KEY}\n`], 'alice.asc')], true);
		expect(result.error).toBeUndefined();
		expect(result.text).toBe(KEY);
	});

	it('should join several files, so several recipients can be dropped at once', async () => {
		const result = await readTextFiles(
			[new File([KEY], 'alice.asc'), new File([KEY], 'bob.asc')],
			true
		);
		expect(result.text).toBe(`${KEY}\n${KEY}`);
	});

	it('should read every chosen file, though the list is emptied once reading has begun', async () => {
		const chosen = [new File([KEY], 'alice.asc'), new File([KEY], 'bob.asc')];

		const reading = readTextFiles(chosen, true);
		// What clearing the file input does to the list the browser handed over
		chosen.length = 0;
		expect((await reading).text).toBe(`${KEY}\n${KEY}`);
	});

	it('should name the file with no PGP block when several were chosen, and use none of them', async () => {
		const result = await readTextFiles(
			[new File(['shopping list'], 'notes.txt'), new File([KEY], 'alice.asc')],
			true
		);
		expect(result.text).toBeUndefined();
		expect(result.error).toBe(fileNotArmoredErrorFor('notes.txt'));
	});

	it('should name such a file so that its name cannot turn the sentence round', () => {
		const names = [
			// A right-to-left override, as in "report<RLO>txt.exe.asc"
			'report\u{202E}txt.exe.asc',
			// The name's own end of an isolate, then an override
			'notes\u{2069}\u{202E}.txt',
			// A Hebrew name that leaves an isolate open
			'\u{5E9}\u{5DC}\u{5D5}\u{5DD}\u{2067}.txt'
		];
		for (const name of names) {
			const note = fileNotArmoredErrorFor(name);
			expect(note).toMatch(/^The file "\u{2068}[^\u{2068}\u{2069}]+\u{2069}" does not contain/u);
			expect(note).not.toMatch(/[\u{202A}-\u{202E}]/u);
		}
	});

	it('should say "one of the files" when a name draws nothing', () => {
		for (const name of [' '.repeat(3), '\u{200B}'.repeat(3), '\u{2800}', '\u{202E}']) {
			expect(fileNotArmoredErrorFor(name)).toMatch(/^One of the files /);
		}
	});

	it('should refuse files that are too large together, though each alone is not', async () => {
		const half = new Uint8Array(MAX_TEXT_FILE_BYTES / 2 + 1);
		const result = await readTextFiles(
			[new File([half], 'one.asc'), new File([half], 'two.asc')],
			true
		);
		expect(result.text).toBeUndefined();
		expect(result.error).toBe(FILES_TOO_LARGE_ERROR);
	});

	it('should refuse a file with no PGP block where one is required', async () => {
		const result = await readTextFiles([new File(['holiday photo bytes'], 'photo.jpg')], true);
		expect(result.text).toBeUndefined();
		expect(result.error).toBe(FILE_NOT_ARMORED_ERROR);
	});

	it('should accept any text where no PGP block is required', async () => {
		const result = await readTextFiles([new File(['plain words'], 'note.txt')], false);
		expect(result.text).toBe('plain words');
	});

	it('should refuse a file that is far too large to be a key or message', async () => {
		const big = new File([new Uint8Array(MAX_TEXT_FILE_BYTES + 1)], 'video.mp4');
		expect((await readTextFiles([big], false)).error).toBe(FILE_TOO_LARGE_ERROR);
	});

	it('should report an empty selection instead of clearing the box', async () => {
		expect((await readTextFiles([], true)).error).toBe(FILE_UNREADABLE_ERROR);
	});
});

describe('files that are not written in UTF-8', () => {
	it('should read a key that Windows PowerShell wrote to a file', async () => {
		// gpg --armor --export > key.asc, in Windows PowerShell, writes UTF-16 with a mark in front
		const result = await readTextFiles(
			[new File([utf16(`${KEY}\r\n`, true, true)], 'key.asc')],
			true
		);
		expect(result.error).toBeUndefined();
		expect(result.text).toBe(KEY);
	});

	it('should read UTF-16 written the other way round', async () => {
		const result = await readTextFiles([new File([utf16(KEY, false, true)], 'key.asc')], true);
		expect(result.text).toBe(KEY);
	});

	it('should read UTF-16 that has no mark in front', async () => {
		const lowByteFirst = new File([utf16(KEY, true, false)], 'key.asc');
		const highByteFirst = new File([utf16(KEY, false, false)], 'key.asc');
		expect((await readTextFiles([lowByteFirst], true)).text).toBe(KEY);
		expect((await readTextFiles([highByteFirst], true)).text).toBe(KEY);
	});

	it('should drop the mark that some editors put in front of UTF-8', async () => {
		const marked = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(KEY)]);
		expect((await readTextFiles([new File([marked], 'key.asc')], true)).text).toBe(KEY);
	});

	it('should take ordinary text for what it is', () => {
		expect(detectTextEncoding(new TextEncoder().encode(KEY))).toBe('utf-8');
		expect(
			detectTextEncoding(
				new TextEncoder().encode('naïve café, 日本語, and more words to fill the sample')
			)
		).toBe('utf-8');
		expect(detectTextEncoding(new Uint8Array(0))).toBe('utf-8');
	});

	it('should still refuse a file that is not text at all', async () => {
		const photo = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1]);
		expect((await readTextFiles([new File([photo], 'photo.jpg')], true)).error).toBe(
			FILE_NOT_ARMORED_ERROR
		);
	});
});
