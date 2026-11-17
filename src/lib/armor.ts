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
/** The lines that open and close a message, and the signature inside a signed message that anyone can read */
const MESSAGE_FIRST_LINE = '-----BEGIN PGP MESSAGE-----';
const MESSAGE_LAST_LINE = '-----END PGP MESSAGE-----';
const SIGNATURE_FIRST_LINE = '-----BEGIN PGP SIGNATURE-----';
const SIGNATURE_LAST_LINE = '-----END PGP SIGNATURE-----';
/**
 * OpenPGP.js's own test for the first or the last line of a block, flag and
 * all. With that flag a line also starts and ends at the two Unicode line
 * separators, so text can share a line of the box with what the library reads
 * as a boundary.
 */
const LIBRARY_BOUNDARY = /^-----[^-]+-----$/m;
/** A header line of one of the kinds the format names. One with nothing after its name holds no words. */
const KNOWN_HEADER = /^(?:Version|Comment|MessageID|Hash|Charset):(?: |$)/;
/** A line of the data that is not the last */
const DATA_LINE = /^[A-Za-z0-9+/]+$/;
/**
 * The last line of the data, which may end in padding. In a block that had
 * lost every line break and was laid out again, the checksum follows on the
 * same line.
 */
const LAST_DATA_LINE = /^[A-Za-z0-9+/]+={0,2}(?:=[A-Za-z0-9+/]{4})?$/;
/** The checksum that may follow the data on a line of its own */
const CHECKSUM_LINE = /^=[A-Za-z0-9+/]{4}$/;
/** What the library takes for an empty line: its own list of spaces, less the carriage return, which is gone by then */
const BLANK_LINE = /^[ \f\t\u{A0}\u{2000}-\u{200A}\u{202F}\u{205F}\u{3000}]*$/u;
/** Characters that draw nothing, such as a zero-width space or the mark old software ends a file with */
const INVISIBLE = /[\p{Default_Ignorable_Code_Point}\p{Cc}]/gu;

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
 * Says whether a message that OpenPGP.js accepted came with anything else.
 * The library reads the first block it finds and passes over the rest without
 * a word: text above or below it, a second message, and text slipped in among
 * the block's own lines. None of that is part of the message, and no verdict
 * on the message is about it, so the page has to say that it was there.
 *
 * The answer is "no" only for text that is one message laid out as the format
 * describes, and "yes" for everything else. Following how the library finds a
 * block would have to be right about every text anyone can build. Describing
 * a clean message only has to be right about honest ones, and a wrong "yes"
 * costs a caution where a wrong "no" costs a green verdict beside unsigned
 * text.
 *
 * Three things are not seen. Words in a header line of a kind the format
 * names, such as a Comment: honest messages have those. White space and ">"
 * marks at the start of a line: that is how email programs quote. And text
 * among the data that is written in the data's own characters, which are
 * letters, digits, "+" and "/": OpenPGP.js can be made to pass over it, and
 * nothing tells it from data.
 * @param text - The message as it was handed to OpenPGP.js, which accepted it
 * @returns False if the text is one plainly laid-out message and nothing more
 */
export function hasOtherText(text: string): boolean {
	const lines = dropBlankEnds(readAsLibraryDoes(text));
	const isCleartext = lines.at(0) === CLEARTEXT_HEADER;
	if (!isCleartext && lines.at(0) !== MESSAGE_FIRST_LINE) {
		return true;
	}
	let index = 1;
	if (isCleartext) {
		index = skipWhile(lines, index, (line) => line.startsWith('Hash: '));
		if (!isBlank(lines.at(index))) {
			return true;
		}
		// The signed text runs to the first line the library takes for a boundary, which must be the signature's
		index = skipWhile(lines, index + 1, (line) => !LIBRARY_BOUNDARY.test(line));
		if (lines.at(index) !== SIGNATURE_FIRST_LINE) {
			return true;
		}
		index++;
	}
	index = skipWhile(lines, index, (line) => KNOWN_HEADER.test(line));
	if (!isBlank(lines.at(index))) {
		return true;
	}
	const dataStart = index + 1;
	index = skipWhile(lines, dataStart, (line) => line === '' || LAST_DATA_LINE.test(line));
	if (!isEvenlyWrapped(lines.slice(dataStart, index))) {
		return true;
	}
	if (CHECKSUM_LINE.test(lines.at(index) ?? '')) {
		index++;
	}
	index = skipWhile(lines, index, showsNothing);
	const lastLine = isCleartext ? SIGNATURE_LAST_LINE : MESSAGE_LAST_LINE;
	return !(index === lines.length - 1 && lines.at(index) === lastLine);
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

	// Every word that is left, and the number of the line it stood on
	const words: string[] = [];
	const lineOf: number[] = [];
	for (const [lineNumber, line] of lines.slice(wholeHeaders).entries()) {
		for (const word of line.split(/\s+/)) {
			if (word === '') {
				continue;
			}
			words.push(word);
			lineOf.push(lineNumber);
		}
	}
	// Where everything ran together, a header is its name and the words up to the
	// next name or the data. Words from the lines below the name stay on lines of
	// their own: joined to it, they would pass for a header that somebody wrote,
	// and hasOtherText could no longer see them.
	let next = 0;
	while (next < words.length && HEADER_NAME.test(words[next])) {
		const nameAt = next;
		let line = [words[next]];
		const headerLines = [line];
		next++;
		while (next < words.length && !HEADER_NAME.test(words[next]) && !DATA_START.test(words[next])) {
			if (lineOf[next] !== lineOf[next - 1]) {
				line = [];
				headerLines.push(line);
			}
			line.push(words[next]);
			next++;
		}
		if (next === nameAt + 1) {
			return undefined;
		}
		for (const headerLine of headerLines) {
			headers.push(headerLine.join(' '));
		}
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

/**
 * Splits a text into lines as OpenPGP.js does when it reads a block: every
 * carriage return gone, and no spaces or tabs at the end of a line. Other
 * white space stays, because the library keeps it.
 */
function readAsLibraryDoes(text: string): string[] {
	return text
		.replaceAll('\r', '')
		.split('\n')
		.map((line) => {
			let end = line.length;
			while (end > 0 && isSpaceOrTab(line.charAt(end - 1))) {
				end--;
			}
			return line.slice(0, end);
		});
}

/**
 * Says whether lines of data are wrapped as software wraps them. Every line
 * but the last is as long as the longest. A shorter one is allowed where the
 * next is full again or is the last, which is what a mail program leaves when
 * it wraps a block a second time. Only the last line may end in padding.
 *
 * A sentence fails this: where a block was laid out again, each of its words
 * has become a line, and they come one after another. The rule is needed
 * because such a sentence need not spoil the message. OpenPGP.js reads nothing
 * after the padding, and a sentence can be built for it to skip. Words in the
 * data's own characters that are set between full lines still pass, as
 * hasOtherText says.
 */
function isEvenlyWrapped(lines: readonly string[]): boolean {
	const allButLast = lines.filter((line) => line !== '').slice(0, -1);
	let fullLength = 0;
	for (const line of allButLast) {
		fullLength = Math.max(fullLength, line.length);
	}
	return allButLast.every(
		(line, index) =>
			DATA_LINE.test(line) &&
			(line.length === fullLength ||
				index === allButLast.length - 1 ||
				allButLast[index + 1].length === fullLength)
	);
}

/** Leaves out the lines at either end that show nothing */
function dropBlankEnds(lines: readonly string[]): string[] {
	let start = 0;
	while (start < lines.length && showsNothing(lines[start])) {
		start++;
	}
	let end = lines.length;
	while (end > start && showsNothing(lines[end - 1])) {
		end--;
	}
	return lines.slice(start, end);
}

/** True for a line that the library reads as an empty one. A line that is not there is not one. */
function isBlank(line: string | undefined): boolean {
	return line !== undefined && BLANK_LINE.test(line);
}

/** True for a line that is empty, or holds only white space and characters that draw nothing */
function showsNothing(line: string): boolean {
	return line.replaceAll(INVISIBLE, '').trim() === '';
}

/** Moves on from a line for as long as the lines pass a test, and says where it stopped */
function skipWhile(
	lines: readonly string[],
	from: number,
	passes: (line: string) => boolean
): number {
	let index = from;
	while (index < lines.length && passes(lines[index])) {
		index++;
	}
	return index;
}
