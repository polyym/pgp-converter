/**
 * Most the app will read into a text box from files, all the chosen files
 * together. Keys and messages are a few kilobytes; much more than this holds
 * the page up for seconds or minutes while it is read.
 */
export const MAX_TEXT_FILE_BYTES = 1_000_000;

export const FILE_TOO_LARGE_ERROR =
	'That file is too large. Keys and messages are small text files.';
export const FILES_TOO_LARGE_ERROR =
	'Those files are too large together. Keys and messages are small text files.';
export const FILE_NOT_ARMORED_ERROR =
	'That file does not contain a PGP block in text form. Export it as text (ASCII armour), usually a .asc file.';
export const FILE_UNREADABLE_ERROR = 'That file could not be read.';

/**
 * Marks around a file's name in a sentence, so that a name in a script written
 * right to left keeps to itself and leaves the sentence as it is
 */
const ISOLATE_START = '\u{2068}';
const ISOLATE_END = '\u{2069}';
/**
 * Characters that turn the text after them round: embeddings, overrides and
 * isolates. Left in a name, they could end the marks around it early, or turn
 * the rest of the sentence.
 */
const DIRECTION_CONTROLS = /[\u{202A}-\u{202E}\u{2066}-\u{2069}]/gu;
/** Characters that draw nothing, and the blank that Braille text uses */
const DRAWS_NOTHING = /[\p{Default_Ignorable_Code_Point}\p{Cc}\u{2800}]/gu;

/**
 * Says which of several chosen files held no PGP block. "That file" would not
 * say which, and a key file chosen with it would seem to have been read.
 * @param name - The name of the file
 * @returns The note to show
 */
export function fileNotArmoredErrorFor(name: string): string {
	const shown = name.replaceAll(DIRECTION_CONTROLS, '');
	const which = shown.replaceAll(DRAWS_NOTHING, '').trim()
		? `The file "${ISOLATE_START}${shown}${ISOLATE_END}"`
		: 'One of the files';
	return `${which} does not contain a PGP block in text form, so none of the files was used.`;
}

export interface TextFilesResult {
	/** The contents of the files, one after another */
	text?: string;
	error?: string;
}

/**
 * Works out how a text file's bytes are written down. Most are UTF-8, but
 * Windows PowerShell writes UTF-16 when a command's output is sent to a file
 * (gpg --armor --export > key.asc), and such a file read as UTF-8 is gibberish.
 * @param bytes - The start of the file, or all of it
 * @returns The name of the encoding to read it with
 */
export function detectTextEncoding(bytes: Uint8Array): 'utf-8' | 'utf-16le' | 'utf-16be' {
	// UTF-16 files normally open with a two-byte mark that says which way round each pair is
	if (bytes[0] === 0xff && bytes[1] === 0xfe) {
		return 'utf-16le';
	}
	if (bytes[0] === 0xfe && bytes[1] === 0xff) {
		return 'utf-16be';
	}
	// Without the mark: a key or message is plain letters and digits, and in
	// UTF-16 every one of those is a letter's byte beside a zero byte
	const sample = bytes.subarray(0, 64);
	if (sample.length >= 8 && sample.length % 2 === 0) {
		const zeroAt = (parity: 0 | 1) =>
			sample.every((byte, i) => (i % 2 === parity ? byte === 0 : byte !== 0));
		if (zeroAt(1)) {
			return 'utf-16le';
		}
		if (zeroAt(0)) {
			return 'utf-16be';
		}
	}
	return 'utf-8';
}

/**
 * Reads dropped or chosen files as text for a key or message box.
 * Nothing is uploaded: the files are read by the browser, on this device.
 * @param files - The files the user dropped or picked
 * @param requiresArmor - Refuse files that hold no armored PGP block, such as a binary key or a photo
 * @returns The text of all the files joined together, or why they could not be used
 */
export async function readTextFiles(
	files: Iterable<File>,
	requiresArmor: boolean
): Promise<TextFilesResult> {
	// The browser's list of chosen files is emptied when the file input is
	// cleared, which the page does straight away so that the same file can be
	// chosen again. Taken before the first wait, every file is still in it.
	const chosen = [...files];
	const totalBytes = chosen.reduce((total, file) => total + file.size, 0);
	if (totalBytes > MAX_TEXT_FILE_BYTES) {
		return { error: chosen.length > 1 ? FILES_TOO_LARGE_ERROR : FILE_TOO_LARGE_ERROR };
	}
	const parts: string[] = [];
	for (const file of chosen) {
		let text: string;
		try {
			const bytes = new Uint8Array(await file.arrayBuffer());
			// The decoder drops the mark at the start of the file, if there is one
			text = new TextDecoder(detectTextEncoding(bytes)).decode(bytes);
		} catch {
			return { error: FILE_UNREADABLE_ERROR };
		}
		if (requiresArmor && !text.includes('-----BEGIN PGP ')) {
			return {
				error: chosen.length > 1 ? fileNotArmoredErrorFor(file.name) : FILE_NOT_ARMORED_ERROR
			};
		}
		parts.push(text.trim());
	}
	if (parts.length === 0) {
		return { error: FILE_UNREADABLE_ERROR };
	}
	return { text: parts.join('\n') };
}
