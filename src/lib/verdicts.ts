import type { SignatureCheck } from './signatures.ts';

export type VerdictTone = 'good' | 'bad' | 'caution' | 'neutral';

/** What the page says about one signature, or about a message that has none */
export interface Verdict {
	tone: VerdictTone;
	title: string;
	body: string;
	/** Set for valid, invalid and untrusted signatures, so the page can show the signer and date */
	check?: SignatureCheck;
}

export interface VerdictContext {
	/** Whether the user supplied a public key to check against */
	wereKeysSupplied: boolean;
	/** User-facing hint appended to an unknown-key verdict when no key was supplied */
	howToCheck?: string;
	/** True when the pasted text held more than the message (see hasOtherText in armor.ts) */
	hasOtherText?: boolean;
}

/** The overall result for all the signatures on a message */
export interface VerdictSummary {
	tone: 'good' | 'bad' | 'caution';
	/** Short user-facing status text */
	message: string;
}

const KEY_ID_GROUP = /.{1,4}/g;
const NAMELESS_KEY = 'a key with no name';

const NOT_SIGNED: Verdict = {
	tone: 'neutral',
	title: 'Not signed',
	body: 'Nothing in this message confirms who sent it.'
};

/**
 * Added after the verdicts on a signed message so they are not read as covering
 * the whole paste. The wording must stay true for any verdict and any extra
 * text, including a second signed message.
 */
const OTHER_TEXT: Verdict = {
	tone: 'caution',
	title: 'The box holds more than the message',
	body: 'Only the text in the result belongs to the message. Text above the message, below it or inside it does not, and this page says nothing about it.'
};

/**
 * Returns the user-facing verdict for one signature check. `context` matters
 * only for unknown-key, where the wording depends on whether any key was supplied.
 */
export function describeSignature(check: SignatureCheck, context: VerdictContext): Verdict {
	switch (check.status) {
		case 'valid': {
			return {
				tone: 'good',
				title: `Signed by ${nameOf(check)}`,
				body: 'The message has not changed since this key signed it. That confirms the sender only if the fingerprint below is really theirs.',
				check
			};
		}
		case 'invalid': {
			return {
				tone: 'bad',
				title: 'Signature does not match',
				body: `The message was changed after it was signed, or the signature was not made by the key it names (${nameOf(check)}). Do not rely on it.`,
				check
			};
		}
		case 'untrusted': {
			return {
				tone: 'caution',
				title: 'Signature not trusted',
				body: check.detail ?? 'This signature cannot be relied on.',
				check
			};
		}
		default: {
			return describeUncheckedSignature(check, context);
		}
	}
}

/**
 * Returns one verdict per signature, in order, followed by a caution about the
 * other text when `context.hasOtherText` is set. A message with no signatures
 * gets a single "Not signed" verdict and no caution.
 */
export function describeSignatures(
	signatures: readonly SignatureCheck[],
	context: VerdictContext
): Verdict[] {
	if (signatures.length === 0) {
		return [NOT_SIGNED];
	}
	const verdicts = signatures.map((check) => describeSignature(check, context));
	return context.hasOtherText ? [...verdicts, OTHER_TEXT] : verdicts;
}

/**
 * Reduces the signatures on a message to one tone: 'bad' if any is invalid,
 * 'good' only if there is at least one and every one is valid, otherwise
 * 'caution'. A good summary mentions other text when `hasOtherText` is set,
 * because it is read before the individual verdicts.
 */
export function summariseSignatures(
	signatures: readonly SignatureCheck[],
	hasOtherText = false
): VerdictSummary {
	if (signatures.some((check) => check.status === 'invalid')) {
		return { tone: 'bad', message: 'Signature does not match' };
	}
	if (signatures.length > 0 && signatures.every((check) => check.status === 'valid')) {
		return {
			tone: 'good',
			message: hasOtherText ? 'Signature valid, but the box holds other text' : 'Signature valid'
		};
	}
	return { tone: 'caution', message: 'Signature not confirmed' };
}

/** Splits a hex key ID into space-separated groups of four, keeping its case. */
export function formatKeyId(keyId: string): string {
	return (keyId.match(KEY_ID_GROUP) ?? []).join(' ');
}

/** Verdict for an unknown-key check, worded by whether any keys were supplied */
function describeUncheckedSignature(check: SignatureCheck, context: VerdictContext): Verdict {
	const keyId = formatKeyId(check.keyID);
	if (context.wereKeysSupplied) {
		return {
			tone: 'caution',
			title: 'Signed by a different key',
			body: `The signature comes from key ID ${keyId}, which is not a key you provided. It could not be checked.`
		};
	}
	return {
		tone: 'caution',
		title: 'Signed, but not checked',
		body: `This message carries a signature from key ID ${keyId}. ${context.howToCheck ?? ''}`.trim()
	};
}

function nameOf(check: SignatureCheck): string {
	const names = check.signer?.userIDs.join(', ') ?? '';
	return names === '' ? NAMELESS_KEY : names;
}
