/** Largest file the app will read into a text box. Keys and messages are a few kilobytes. */
export const MAX_TEXT_FILE_BYTES = 1_000_000;

export const FILE_TOO_LARGE_ERROR =
	'That file is too large. Keys and messages are small text files.';
export const FILE_NOT_ARMORED_ERROR =
	'That file does not contain a PGP block in text form. Export it as text (ASCII armour), usually a .asc file.';
export const FILE_UNREADABLE_ERROR = 'That file could not be read.';

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
	const parts: string[] = [];
	for (const file of files) {
		if (file.size > MAX_TEXT_FILE_BYTES) {
			return { error: FILE_TOO_LARGE_ERROR };
		}
		let text: string;
		try {
			const bytes = new Uint8Array(await file.arrayBuffer());
			// The decoder drops the mark at the start of the file, if there is one
			text = new TextDecoder(detectTextEncoding(bytes)).decode(bytes);
		} catch {
			return { error: FILE_UNREADABLE_ERROR };
		}
		if (requiresArmor && !text.includes('-----BEGIN PGP ')) {
			return { error: FILE_NOT_ARMORED_ERROR };
		}
		parts.push(text.trim());
	}
	if (parts.length === 0) {
		return { error: FILE_UNREADABLE_ERROR };
	}
	return { text: parts.join('\n') };
}
