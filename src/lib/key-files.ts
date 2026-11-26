export type KeyFileKind = 'public' | 'private' | 'keypair';

const WHITESPACE_RUN = /\s+/g;
// Characters Windows forbids in file names, control characters, and the bidi
// marks, embeddings, overrides and isolates, which can make a name display as
// something else (an override can hide a .exe ending, for example)
const NOT_FOR_FILE_NAMES =
	/[\\/:*?"<>|\p{Cc}\u{061C}\u{200E}\u{200F}\u{202A}-\u{202E}\u{2066}-\u{2069}]/gu;
// A leading dot hides the file on macOS and Linux. Leading underscores, left where
// separators were replaced, go too, so "../x" becomes "x".
const LEADING_DOTS = /^[._]+/;
// In UTF-16 code units. Even at three UTF-8 bytes each, plus the longest ending,
// the name fits the 255-byte limit of common file systems.
const MAX_NAME_LENGTH = 80;
const FALLBACK_NAME = 'key';
// A single key is saved as an ASCII-armoured file. The pair is plain text,
// because it holds two blocks under headings and is not one PGP file.
const FILE_ENDINGS: Readonly<Record<KeyFileKind, string>> = {
	public: '_public.asc',
	private: '_private.asc',
	keypair: '_keypair.txt'
};

/**
 * Builds the download file name for a generated key from the owner's name, which
 * is free text. Characters invalid in file names, bidi controls and whitespace
 * become underscores (one for each run), leading dots and underscores are
 * stripped, and the name is cut to MAX_NAME_LENGTH UTF-16 code units without
 * splitting a surrogate pair. Uses "key" when nothing is left.
 */
export function keyFileName(ownerName: string, kind: KeyFileKind): string {
	const cleaned = ownerName
		.replaceAll(NOT_FOR_FILE_NAMES, ' ')
		.trim()
		.replaceAll(WHITESPACE_RUN, '_')
		.replace(LEADING_DOTS, '');
	const cut = cleaned.slice(0, MAX_NAME_LENGTH);
	// Drop the lone high surrogate if the cut split a pair, such as an emoji
	const name = cut.isWellFormed() ? cut : cut.slice(0, -1);
	return `${name || FALLBACK_NAME}${FILE_ENDINGS[kind]}`;
}

/**
 * Joins an armoured public and private key into one text file, each under a
 * heading. The Decrypt page accepts the file as it is and finds the private key in it.
 */
export function combineKeyPair(publicKey: string, privateKey: string): string {
	return `=== PUBLIC KEY ===\n\n${publicKey}\n\n=== PRIVATE KEY ===\n\n${privateKey}`;
}
