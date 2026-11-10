const KEY_BLOCK = /-----BEGIN PGP (PUBLIC|PRIVATE) KEY BLOCK-----[\s\S]*?-----END PGP \1 KEY BLOCK-----/g;

/**
 * Cleans up a pasted PGP block so that otherwise valid input still parses.
 * Removes the indentation and email quote markers ("> ") that mail clients,
 * forums and chat apps add to each line, and normalises line endings.
 * @param text - Raw text pasted by the user
 * @returns The text with per-line prefixes and trailing whitespace removed
 */
export function normaliseArmor(text: string): string {
	return text
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.map((line) => line.replace(/^[\s>]+/, '').trimEnd())
		.join('\n')
		.trim();
}

/**
 * Splits pasted text into its individual armored key blocks.
 * OpenPGP.js reads only the first block of a string, so several keys pasted
 * one after another have to be parsed separately.
 * @param text - Normalised text that may contain one or more key blocks
 * @returns Each key block found, or the whole text if no complete block is present
 */
export function splitKeyBlocks(text: string): string[] {
	return text.match(KEY_BLOCK) ?? [text];
}
