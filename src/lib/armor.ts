/** How the first and the last line of an armored block open, and how both close */
const FIRST_LINE_OPENING = '-----BEGIN PGP ';
const LAST_LINE_OPENING = '-----END PGP ';
const LINE_CLOSING = '-----';
/** What the name of a block's kind is written in: "PUBLIC KEY BLOCK", "MESSAGE" */
const KIND_CHARACTER = /[A-Z ]/;
const KEY_KINDS: ReadonlySet<string> = new Set(['PUBLIC KEY BLOCK', 'PRIVATE KEY BLOCK']);
/** A signed message that anyone can read. Its text is part of what was signed, so it is never rearranged. */
export const CLEARTEXT_HEADER = '-----BEGIN PGP SIGNED MESSAGE-----';
/** A line such as "Comment: made with GnuPG", which may sit between the first line and the data */
const HEADER_LINE = /^[A-Za-z][A-Za-z-]*: \S/;
/** The names such lines can have, used to find them again once they have run into the data */
const HEADER_NAME = /^(?:Version|Comment|Hash|Charset|MessageID):$/i;
/** How the data itself begins: letters, digits, "+" and "/" only, for longer than any word of a comment runs */
const DATA_START = /^[A-Za-z0-9+/]{32}/;

/** The first or the last line of a block, as found in a text */
interface BlockLine {
	/** The kind of block the line names */
	kind: string;
	/** Where the line starts in the text, and where it ends */
	start: number;
	end: number;
}

/** One armored block in a text: a key, a message or a signature */
interface ArmorBlock {
	kind: string;
	/** Where the block's first line starts */
	start: number;
	/** Where what lies between its first and last lines starts, and where that ends */
	bodyStart: number;
	bodyEnd: number;
	/** Where the block's last line ends */
	end: number;
}

/**
 * Cleans up a pasted PGP block so that otherwise valid input still parses.
 * Removes the indentation and email quote markers ("> ") that mail clients,
 * forums and chat apps add to each line, normalises line endings, and puts
 * back line breaks that were turned into spaces or lost altogether.
 * @param text - Raw text pasted by the user
 * @returns The text with per-line prefixes and trailing whitespace removed, and each block on lines of its own
 */
export function normaliseArmor(text: string): string {
	const cleaned = text
		.replaceAll(/\r\n?/g, '\n')
		.split('\n')
		.map((line) => line.replace(/^[\s>]+/, '').trimEnd())
		.join('\n')
		.trim();
	return restoreArmorLines(cleaned).trim();
}

/**
 * Splits pasted text into its individual armored key blocks.
 * OpenPGP.js reads only the first block of a string, so several keys pasted
 * one after another have to be parsed separately.
 * @param text - Normalised text that may contain one or more key blocks
 * @returns Each key block found, or the whole text if no complete block is present
 */
export function splitKeyBlocks(text: string): string[] {
	const blocks = findBlocks(text, KEY_KINDS);
	return blocks.length > 0 ? blocks.map((block) => text.slice(block.start, block.end)) : [text];
}

/**
 * Finds every complete block in a text: a first line, and the nearest last
 * line of the same kind after it. Blocks do not overlap.
 *
 * The text is read through once. Searching onwards from each first line for
 * its last line would read the rest of the text again for every first line
 * that has none, and a pasted megabyte of those would hold the page up for
 * seconds.
 * @param text - The text to search
 * @param kinds - The kinds of block to look for; every kind if left out
 * @returns The blocks, in the order they appear
 */
function findBlocks(text: string, kinds?: ReadonlySet<string>): ArmorBlock[] {
	const lastLines = new Map<string, BlockLine[]>();
	for (const line of findBlockLines(text, LAST_LINE_OPENING)) {
		const ofKind = lastLines.get(line.kind);
		if (ofKind) {
			ofKind.push(line);
		} else {
			lastLines.set(line.kind, [line]);
		}
	}

	// How far into each kind's last lines the search has come. First lines are
	// taken in order, so it never has to go back.
	const reached = new Map<string, number>();
	const blocks: ArmorBlock[] = [];
	let afterLastBlock = 0;
	for (const first of findBlockLines(text, FIRST_LINE_OPENING)) {
		if (first.start < afterLastBlock || (kinds && !kinds.has(first.kind))) {
			continue;
		}
		const candidates = lastLines.get(first.kind) ?? [];
		let index = reached.get(first.kind) ?? 0;
		let last = candidates.at(index);
		while (last && last.start < first.end) {
			index++;
			last = candidates.at(index);
		}
		reached.set(first.kind, index);
		if (!last) {
			continue;
		}
		blocks.push({
			kind: first.kind,
			start: first.start,
			bodyStart: first.end,
			bodyEnd: last.start,
			end: last.end
		});
		afterLastBlock = last.end;
	}
	return blocks;
}

/**
 * Lists the first lines, or the last lines, of the blocks in a text
 * @param text - The text to search
 * @param opening - How such a line opens
 * @returns Each line found, in order, with the kind of block it names
 */
function findBlockLines(text: string, opening: string): BlockLine[] {
	const lines: BlockLine[] = [];
	let start = text.indexOf(opening);
	while (start !== -1) {
		const kindStart = start + opening.length;
		let kindEnd = kindStart;
		while (KIND_CHARACTER.test(text.charAt(kindEnd))) {
			kindEnd++;
		}
		if (kindEnd > kindStart && text.startsWith(LINE_CLOSING, kindEnd)) {
			lines.push({
				kind: text.slice(kindStart, kindEnd),
				start,
				end: kindEnd + LINE_CLOSING.length
			});
		}
		start = text.indexOf(opening, start + 1);
	}
	return lines;
}

/**
 * Says whether the inside of a block is laid out as the format requires: any
 * header lines first, then an empty line, then the data.
 */
function isLaidOut(body: string): boolean {
	// The first and last lines of a block stand alone, so its inside starts and ends with a line break
	if (!body.startsWith('\n') || !body.endsWith('\n')) {
		return false;
	}
	const lines = body.slice(1, -1).split('\n');
	const afterHeaders = lines.findIndex((line) => !HEADER_LINE.test(line));
	return afterHeaders !== -1 && lines[afterHeaders] === '';
}

/**
 * Lays one block out again from whatever is left of it
 * @param type - What the block is, as its first line says: "PUBLIC KEY BLOCK", "MESSAGE"
 * @param body - Everything between the block's first and last lines
 * @returns The block with its lines restored, or undefined if it cannot be worked out
 */
function rebuildBlock(type: string, body: string): string | undefined {
	const lines = body.split('\n').filter((line) => line !== '');
	const headers: string[] = [];

	// Where the lines survived and only the empty one went missing, headers are still
	// whole lines. One that has run into the data is taken apart below instead.
	const isWholeHeader = (line: string) =>
		HEADER_LINE.test(line) && line.split(/\s+/).every((word) => !DATA_START.test(word));
	let wholeHeaders = 0;
	while (wholeHeaders < lines.length - 1 && isWholeHeader(lines[wholeHeaders])) {
		headers.push(lines[wholeHeaders]);
		wholeHeaders++;
	}

	const words = lines
		.slice(wholeHeaders)
		.join(' ')
		.split(/\s+/)
		.filter((word) => word !== '');
	// Where everything ran together, a header is its name and the words up to the next name or the data
	let next = 0;
	while (next < words.length && HEADER_NAME.test(words[next])) {
		const name = words[next];
		next++;
		const value: string[] = [];
		while (next < words.length && !HEADER_NAME.test(words[next]) && !DATA_START.test(words[next])) {
			value.push(words[next]);
			next++;
		}
		if (value.length === 0) {
			return undefined;
		}
		headers.push(`${name} ${value.join(' ')}`);
	}

	// What is left must be the data, and data opens with a long unbroken run.
	// Anything else means this is not a block that lost its lines, and it is left as it was.
	const data = words.slice(next);
	if (data.length === 0 || !DATA_START.test(data[0])) {
		return undefined;
	}
	if (data.some((word) => !/^[A-Za-z0-9+/=]+$/.test(word))) {
		return undefined;
	}

	return [`-----BEGIN PGP ${type}-----`, ...headers, '', ...data, `-----END PGP ${type}-----`].join(
		'\n'
	);
}

/**
 * Puts back the line breaks of a PGP block that has lost them: shown by a web
 * page as one long line, pasted through a single-line box, or missing the
 * empty line after its first line. Nothing is missing from such a block.
 * @param text - Text whose lines have already been trimmed
 * @returns The text with every such block laid out again; blocks that were fine are untouched
 */
function restoreArmorLines(text: string): string {
	if (text.includes(CLEARTEXT_HEADER)) {
		return text;
	}
	const pieces: string[] = [];
	let copiedTo = 0;
	for (const block of findBlocks(text)) {
		const body = text.slice(block.bodyStart, block.bodyEnd);
		const rebuilt = isLaidOut(body) ? undefined : rebuildBlock(block.kind, body);
		if (rebuilt === undefined) {
			continue;
		}
		// The block's first and last lines must not share a line with anything else
		const before = block.start > 0 && text.charAt(block.start - 1) !== '\n' ? '\n' : '';
		const after = block.end < text.length && text.charAt(block.end) !== '\n' ? '\n' : '';
		pieces.push(text.slice(copiedTo, block.start), before, rebuilt, after);
		copiedTo = block.end;
	}
	if (pieces.length === 0) {
		return text;
	}
	pieces.push(text.slice(copiedTo));
	// Words that shared a line with a block are left with a space where the block was
	return trimAroundLineBreaks(pieces.join(''));
}

/**
 * Removes the spaces and tabs on either side of every line break. Done by
 * hand: a pattern for "spaces before a line break" tries again from every
 * space of a long run that no line break follows.
 * @param text - The text to tidy
 * @returns The text with no space or tab next to a line break
 */
function trimAroundLineBreaks(text: string): string {
	const lines = text.split('\n');
	const lastIndex = lines.length - 1;
	return lines
		.map((line, index) => {
			let start = 0;
			let end = line.length;
			while (index > 0 && start < end && isSpaceOrTab(line.charAt(start))) {
				start++;
			}
			while (index < lastIndex && end > start && isSpaceOrTab(line.charAt(end - 1))) {
				end--;
			}
			return line.slice(start, end);
		})
		.join('\n');
}

function isSpaceOrTab(character: string): boolean {
	return character === ' ' || character === '\t';
}
