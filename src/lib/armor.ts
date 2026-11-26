const FIRST_LINE_OPENING = '-----BEGIN PGP ';
const LAST_LINE_OPENING = '-----END PGP ';
const LINE_CLOSING = '-----';
/** A character of the block type in a BEGIN or END line, such as "PUBLIC KEY BLOCK" */
const KIND_CHARACTER = /[A-Z ]/;
const KEY_KINDS: ReadonlySet<string> = new Set(['PUBLIC KEY BLOCK', 'PRIVATE KEY BLOCK']);
/** BEGIN line of a cleartext signed message (RFC 9580 section 7) */
export const CLEARTEXT_HEADER = '-----BEGIN PGP SIGNED MESSAGE-----';
/** An armour header such as "Comment: made with GnuPG" */
const HEADER_LINE = /^[A-Za-z][A-Za-z-]*: \S/;
/** A KNOWN_HEADER key as one word, for finding the headers of a block flattened onto one line */
const HEADER_NAME = /^(?:Version|Comment|Hash|Charset|MessageID):$/i;
/**
 * 32 Base64 characters in a row, taken as the start of the data. A header value
 * rarely holds a word that long, but one can: rebuildBlock misreads a Comment
 * holding a fingerprint written without spaces as data.
 */
const DATA_START = /^[A-Za-z0-9+/]{32}/;
const MESSAGE_FIRST_LINE = '-----BEGIN PGP MESSAGE-----';
const MESSAGE_LAST_LINE = '-----END PGP MESSAGE-----';
const SIGNATURE_FIRST_LINE = '-----BEGIN PGP SIGNATURE-----';
const SIGNATURE_LAST_LINE = '-----END PGP SIGNATURE-----';
/**
 * The regex that OpenPGP.js's unarmor() uses to find BEGIN and END lines. With
 * the m flag, ^ and $ also match at U+2028 and U+2029, so the library can find
 * a boundary in what a text box shows as one line with other text.
 */
const LIBRARY_BOUNDARY = /^-----[^-]+-----$/m;
/**
 * An armour header with a key from RFC 9580 section 6.2.2, or MessageID, which
 * RFC 4880 section 6.2 also defined and OpenPGP.js still recognises. An empty
 * value holds no text, so it is allowed.
 */
const KNOWN_HEADER = /^(?:Version|Comment|MessageID|Hash|Charset):(?: |$)/;
/** A Base64 data line with no padding, as every line but the last must be */
const DATA_LINE = /^[A-Za-z0-9+/]+$/;
/**
 * The last data line, which may end in padding. A block whose line breaks were
 * removed outright, not turned into spaces, is restored with its checksum on the
 * end of this line. Every other data line matches too, so hasOtherText uses it to
 * skip the whole data section and leaves the stricter checks to isEvenlyWrapped.
 */
const LAST_DATA_LINE = /^[A-Za-z0-9+/]+={0,2}(?:=[A-Za-z0-9+/]{4})?$/;
/** The optional CRC-24 checksum line (RFC 9580 section 6.1) */
const CHECKSUM_LINE = /^=[A-Za-z0-9+/]{4}$/;
/** OpenPGP.js's blank-line class without \r, which readAsLibraryDoes removes. Keep in sync with the library. */
const BLANK_LINE = /^[ \f\t\u{A0}\u{2000}-\u{200A}\u{202F}\u{205F}\u{3000}]*$/u;
/** Invisible characters, such as U+200B ZERO WIDTH SPACE and the DOS end-of-file marker U+001A */
const INVISIBLE = /[\p{Default_Ignorable_Code_Point}\p{Cc}]/gu;

/** A BEGIN or END line, as string offsets into the text (end exclusive) */
interface BlockLine {
	/** Block type, such as "PUBLIC KEY BLOCK" */
	kind: string;
	start: number;
	end: number;
}

/**
 * One armoured block, as string offsets with exclusive ends. The body lies
 * between the BEGIN and END lines.
 */
interface ArmorBlock {
	kind: string;
	start: number;
	bodyStart: number;
	bodyEnd: number;
	end: number;
}

/**
 * Cleans up pasted armour so that OpenPGP.js can parse it. Converts CRLF and CR
 * to LF, strips the indentation and "> " quote marks that mail clients and
 * forums add to each line, strips trailing whitespace, and restores the line
 * breaks of any block that lost them (see restoreArmorLines). Returns the
 * result trimmed.
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
 * Returns each public or private key block in the text, BEGIN to END line, or
 * the whole text as the only element when it holds no complete key block.
 * OpenPGP.js reads only the first armoured block of a string, so keys pasted
 * one after another have to be parsed separately.
 */
export function splitKeyBlocks(text: string): string[] {
	const blocks = findBlocks(text, KEY_KINDS);
	return blocks.length > 0 ? blocks.map((block) => text.slice(block.start, block.end)) : [text];
}

/**
 * Returns false only when the text is one cleanly laid-out armoured message or
 * cleartext signed message, and true for anything else. OpenPGP.js parses the
 * first block it finds and silently skips text around it, a second block and
 * some text inside it, so a signature verdict does not cover that text and the
 * page has to warn about it.
 *
 * It accepts a clean layout instead of imitating the library's parser, because
 * a false positive only adds a warning, while a false negative shows a valid
 * signature beside unsigned text. It does not flag the values of known armour
 * headers, or words made only of Base64 characters placed among the data
 * lines, which cannot be told apart from data.
 * @param text - Exactly the text that OpenPGP.js accepted
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
		// The signed text ends at the first line OpenPGP.js reads as a BEGIN or END
		// line (dash-escaped lines do not match), and that must be the signature's.
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
 * Pairs each BEGIN line with the nearest END line of the same type after it,
 * skipping BEGIN lines inside a block already found, so blocks never overlap.
 * Runs in one pass: searching forward from every BEGIN line is quadratic, and
 * a pasted megabyte of unmatched BEGIN lines would freeze the page for seconds.
 * @param kinds - Block types to look for; all types when omitted
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

	// Per type, the index of the first END line not yet passed. BEGIN lines come
	// in text order, so this index only moves forward.
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

/** Finds every BEGIN or END line, depending on `opening`, in text order. A match need not start a line. */
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
 * True when a block body still has its line breaks: the BEGIN and END lines on
 * lines of their own, then any armour headers, then a blank line before the data.
 */
function isLaidOut(body: string): boolean {
	if (!body.startsWith('\n') || !body.endsWith('\n')) {
		return false;
	}
	const lines = body.slice(1, -1).split('\n');
	const afterHeaders = lines.findIndex((line) => !HEADER_LINE.test(line));
	return afterHeaders !== -1 && lines[afterHeaders] === '';
}

/**
 * Rebuilds a block whose line breaks were lost or turned into spaces: armour
 * headers one per line, a blank line, then each remaining word on a line of its
 * own. Returns undefined when the body is not headers followed by Base64 data,
 * so the caller leaves the text as it was.
 * @param type - Block type from the BEGIN line, such as "PUBLIC KEY BLOCK"
 */
function rebuildBlock(type: string, body: string): string | undefined {
	const lines = body.split('\n').filter((line) => line !== '');
	const headers: string[] = [];

	// When only the blank line was lost, headers are still whole lines. A line that
	// also holds data is split up word by word below.
	const isWholeHeader = (line: string) =>
		HEADER_LINE.test(line) && line.split(/\s+/).every((word) => !DATA_START.test(word));
	let wholeHeaders = 0;
	while (wholeHeaders < lines.length - 1 && isWholeHeader(lines[wholeHeaders])) {
		headers.push(lines[wholeHeaders]);
		wholeHeaders++;
	}

	// lineOf[i] is the source line that words[i] came from
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
	// In a flattened block, a header is a known key plus the words up to the next
	// key or the data. Words from a later source line stay on a line of their own:
	// joined onto the header they would read as its value, which hasOtherText does
	// not flag.
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

	// The rest must be Base64 data opening with a long word. Anything else is not
	// a block that lost its line breaks, so it is left alone.
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
 * Restores the line breaks of every block that lost them, for example armour
 * that a web page shows as one line, that went through a single-line input, or
 * that lacks the blank line before the data. Blocks that are already laid out,
 * or that cannot be rebuilt, are left as they are.
 * @param text - Text whose lines are already trimmed
 */
function restoreArmorLines(text: string): string {
	// The signature covers the text of a cleartext signed message, so never reflow it
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
		// The BEGIN and END lines must stand on lines of their own
		const before = block.start > 0 && text.charAt(block.start - 1) !== '\n' ? '\n' : '';
		const after = block.end < text.length && text.charAt(block.end) !== '\n' ? '\n' : '';
		pieces.push(text.slice(copiedTo, block.start), before, rebuilt, after);
		copiedTo = block.end;
	}
	if (pieces.length === 0) {
		return text;
	}
	pieces.push(text.slice(copiedTo));
	// Text that shared a line with a block is left with a space beside the inserted
	// line break, so trim it
	return trimAroundLineBreaks(pieces.join(''));
}

/**
 * Removes the spaces and tabs on either side of every line break. A regex such
 * as /[ \t]+\n/ would be quadratic on a long run of spaces with no line break
 * after it, so this scans by hand.
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
 * Splits text into lines as OpenPGP.js's unarmor() does: it removes every \r,
 * not only those before \n, and trailing spaces and tabs, and keeps all other
 * whitespace.
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
 * True when Base64 data lines are wrapped at a fixed width, as an encoder writes
 * them. Every line but the last has the full width, except that a short line may
 * come before a full line or the last one, which is what a mail client leaves
 * when it wraps armour again. Only the last line may have padding.
 *
 * This catches a sentence after the data, which rebuildBlock turns into a run of
 * short lines, one word each. Words made of Base64 characters can be chosen to
 * decode to a packet that OpenPGP.js skips, such as a trust packet, so the
 * message still verifies. A sentence after padding fails the padding rule instead.
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

/** Drops lines at either end that showsNothing matches, a looser test than isBlank */
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

/** True when OpenPGP.js would read the line as blank. Undefined, past the last line, is not blank. */
function isBlank(line: string | undefined): boolean {
	return line !== undefined && BLANK_LINE.test(line);
}

function showsNothing(line: string): boolean {
	return line.replaceAll(INVISIBLE, '').trim() === '';
}

/** Returns the index of the first line from `from` on that fails `passes`, or lines.length */
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
