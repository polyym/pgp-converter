export type KeyFileKind = 'public' | 'private' | 'keypair';

const WHITESPACE_RUN = /\s+/g;
// What no file name may hold on Windows, macOS or Linux, and the invisible
// characters that reverse the direction of text, which can make a name read
// as something it is not
const NOT_FOR_FILE_NAMES =
	/[\\/:*?"<>|\p{Cc}\u{061C}\u{200E}\u{200F}\u{202A}-\u{202E}\u{2066}-\u{2069}]/gu;
// A name that starts with a dot is a hidden file on macOS and Linux
const LEADING_DOTS = /^[._]+/;
// Long enough for any name, and well inside what file systems allow once the ending is added
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
 * Names the file a generated key is saved as, after the key's owner. The name
 * is whatever was typed, so anything a file name cannot hold is left out.
 * @param ownerName - The name on the key
 * @param kind - Which key the file holds, or both
 * @returns The file name, with the spaces in the owner's name as underscores
 */
export function keyFileName(ownerName: string, kind: KeyFileKind): string {
	const cleaned = ownerName
		.replaceAll(NOT_FOR_FILE_NAMES, ' ')
		.trim()
		.replaceAll(WHITESPACE_RUN, '_')
		.replace(LEADING_DOTS, '');
	const cut = cleaned.slice(0, MAX_NAME_LENGTH);
	// The cut may fall between the two halves of a character such as an emoji;
	// the half that is left goes too
	const name = cut.isWellFormed() ? cut : cut.slice(0, -1);
	return `${name || FALLBACK_NAME}${FILE_ENDINGS[kind]}`;
}

/**
 * Lays out both keys of a pair as one text file, each under a heading. The
 * Decrypt page reads the private key out of such a file.
 * @param publicKey - The armoured public key
 * @param privateKey - The armoured private key
 * @returns The contents of the file
 */
export function combineKeyPair(publicKey: string, privateKey: string): string {
	return `=== PUBLIC KEY ===\n\n${publicKey}\n\n=== PRIVATE KEY ===\n\n${privateKey}`;
}
