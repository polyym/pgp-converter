/**
 * Combined size limit for files read into a text box. Keys and messages are a
 * few kilobytes, and much larger input blocks the page for seconds or minutes.
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
 * First Strong Isolate and Pop Directional Isolate around a file name in a
 * message, so a right-to-left name cannot reorder the rest of the sentence
 */
const ISOLATE_START = '\u{2068}';
const ISOLATE_END = '\u{2069}';
/**
 * Bidi embeddings, overrides and isolates, removed from the name because one
 * could close the isolate early or reverse the rest of the sentence
 */
const DIRECTION_CONTROLS = /[\u{202A}-\u{202E}\u{2066}-\u{2069}]/gu;
/** Invisible characters: default-ignorable code points, controls and the blank Braille pattern */
const DRAWS_NOTHING = /[\p{Default_Ignorable_Code_Point}\p{Cc}\u{2800}]/gu;

/**
 * Returns the error for one of several chosen files that has no PGP block. It
 * names the file, inside bidi isolates, so the visitor can tell which file failed
 * and does not think the others were used. A name that is invisible once bidi
 * controls are removed becomes "One of the files".
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
 * Returns the encoding to decode a text file with: UTF-16 when the bytes start
 * with its byte order mark or, within the first 64 bytes, look like ASCII written
 * as UTF-16, and UTF-8 otherwise. Windows PowerShell writes redirected output as
 * UTF-16, so `gpg --armor --export > key.asc` there gives a UTF-16 file.
 * @param bytes - The start of the file, or all of it
 */
export function detectTextEncoding(bytes: Uint8Array): 'utf-8' | 'utf-16le' | 'utf-16be' {
	// Byte order mark (BOM): FF FE for little-endian, FE FF for big-endian
	if (bytes[0] === 0xff && bytes[1] === 0xfe) {
		return 'utf-16le';
	}
	if (bytes[0] === 0xfe && bytes[1] === 0xff) {
		return 'utf-16be';
	}
	// Without a BOM, armoured text is ASCII, so in UTF-16 every other byte is zero:
	// the odd ones for little-endian, the even ones for big-endian
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
 * Reads dropped or chosen files as text for a key or message box, decoding each
 * with detectTextEncoding, and returns their trimmed contents joined by newlines.
 * Returns an error instead, and uses none of the files, when together they exceed
 * MAX_TEXT_FILE_BYTES, one cannot be read, there are none, or `requiresArmor` is
 * set and one does not contain "-----BEGIN PGP ". The browser reads the files
 * locally; nothing is uploaded.
 */
export async function readTextFiles(
	files: Iterable<File>,
	requiresArmor: boolean
): Promise<TextFilesResult> {
	// Copy the list before the first await: the page clears the file input at once,
	// so the same file can be chosen again, and that empties the live FileList
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
			// TextDecoder strips a leading byte order mark
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
