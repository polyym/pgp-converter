export type PassphraseStrength = 'weak' | 'fair' | 'strong';

export interface PassphraseRating {
	strength: PassphraseStrength;
	/** How many of the three bars to fill */
	bars: 1 | 2 | 3;
	/** One short line of advice */
	advice: string;
}

const ADVICE: Record<PassphraseStrength, string> = {
	weak: 'Easy to guess. Make it longer: four or more unrelated words work well.',
	fair: 'Reasonable. A few more characters or another word would make it strong.',
	strong: 'Strong. Make sure you can remember it: it cannot be reset.'
};
const BARS: Record<PassphraseStrength, 1 | 2 | 3> = { weak: 1, fair: 2, strong: 3 };
// Shorter words add little, so they are not counted as words
const MIN_WORD_LENGTH = 3;
// What makes a passphrase strong: this many characters that vary, or this many words
const STRONG_LENGTH = 20;
const STRONG_WORDS = 4;
// What makes one fair. A passphrase of digits alone has to be longer.
const FAIR_LENGTH = 12;
const FAIR_LENGTH_FOR_DIGITS = 16;

/**
 * Gives a rough idea of how hard a passphrase is to guess.
 * Length counts for most, because that is what slows down guessing; repeated
 * characters and a single run of digits count for little. This is guidance
 * for the person typing, not a measurement.
 * @param passphrase - The passphrase as typed
 * @returns A rating, how many bars to fill, and a line of advice
 */
export function ratePassphrase(passphrase: string): PassphraseRating {
	// Counted by character, so that one written with two code units counts once
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
	// What actually varies: a long run of one character is no better than a short one
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
