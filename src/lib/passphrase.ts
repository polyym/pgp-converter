export type PassphraseStrength = 'weak' | 'fair' | 'strong';

export interface PassphraseRating {
	strength: PassphraseStrength;
	/** How many of the three bars to fill */
	bars: 1 | 2 | 3;
	/** One short line of advice */
	advice: string;
}

const ADVICE: Record<PassphraseStrength, string> = {
	// "four" is STRONG_WORDS written out, so change the two together
	weak: 'Easy to guess. Make it longer: four or more unrelated words work well.',
	fair: 'Reasonable. A few more characters or another word would make it strong.',
	strong: 'Strong. Make sure you can remember it: it cannot be reset.'
};
const BARS: Record<PassphraseStrength, 1 | 2 | 3> = { weak: 1, fair: 2, strong: 3 };
// Shorter words add little, so they do not count towards STRONG_WORDS
const MIN_WORD_LENGTH = 3;
const STRONG_LENGTH = 20;
const STRONG_WORDS = 4;
const FAIR_LENGTH = 12;
const FAIR_LENGTH_FOR_DIGITS = 16;

/**
 * Rates a passphrase for the strength meter. This is a length heuristic for the
 * person typing, not an entropy estimate: repeated characters add little, and a
 * passphrase of digits alone needs more length to be fair and is never strong.
 */
export function ratePassphrase(passphrase: string): PassphraseRating {
	// Iterate by code point, so a character outside the BMP, such as most emoji, counts once
	const distinct = new Set<string>();
	let length = 0;
	for (const character of passphrase) {
		distinct.add(character);
		length++;
	}
	const words = passphrase
		.trim()
		.split(/\s+/)
		.filter((word) => word.length >= MIN_WORD_LENGTH).length;
	// Cap the length at twice the number of distinct characters, so a long run of
	// one character scores like a short one
	const effectiveLength = Math.min(length, distinct.size * 2);
	const isOnlyDigits = /^\d+$/.test(passphrase);

	let strength: PassphraseStrength = 'weak';
	if (!isOnlyDigits && (effectiveLength >= STRONG_LENGTH || words >= STRONG_WORDS)) {
		strength = 'strong';
	} else if (
		effectiveLength >= FAIR_LENGTH &&
		(!isOnlyDigits || effectiveLength >= FAIR_LENGTH_FOR_DIGITS)
	) {
		strength = 'fair';
	}

	return { strength, bars: BARS[strength], advice: ADVICE[strength] };
}
