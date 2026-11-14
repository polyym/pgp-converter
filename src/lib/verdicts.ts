import type { SignatureCheck } from './signatures.ts';

export type VerdictTone = 'good' | 'bad' | 'caution' | 'neutral';

/** What the page says about one signature, or about a message that has none */
export interface Verdict {
	tone: VerdictTone;
	title: string;
	body: string;
	/** The signature the verdict is about, where its key and date are worth showing */
	check?: SignatureCheck;
}

export interface VerdictContext {
	/** Whether the user supplied a public key to check against */
	wereKeysSupplied: boolean;
	/** What to do to get a signature checked, said when no key was supplied */
	howToCheck?: string;
}

/** What a set of signatures amounts to as a whole */
export interface VerdictSummary {
	tone: 'good' | 'bad' | 'caution';
	/** A few words for the message that reports the result */
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
 * Puts one signature's result into words.
 * @param check - The result for the signature
 * @param context - Whether a key was supplied to check it against
 * @returns The verdict to show
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
 * Puts the result for every signature on a message into words.
 * @param signatures - The result for each signature; empty if the message carries none
 * @param context - Whether a key was supplied to check them against
 * @returns One verdict for each signature, or a single one saying the message is not signed
 */
export function describeSignatures(
	signatures: readonly SignatureCheck[],
	context: VerdictContext
): Verdict[] {
	if (signatures.length === 0) {
		return [NOT_SIGNED];
	}
	return signatures.map((check) => describeSignature(check, context));
}

/**
 * Says what a message's signatures amount to. The text is only as good as its
 * weakest signature: one that does not match outweighs any that do.
 * @param signatures - The result for each signature on the message
 * @returns The overall tone and a few words for it
 */
export function summariseSignatures(signatures: readonly SignatureCheck[]): VerdictSummary {
	if (signatures.some((check) => check.status === 'invalid')) {
		return { tone: 'bad', message: 'Signature does not match' };
	}
	if (signatures.length > 0 && signatures.every((check) => check.status === 'valid')) {
		return { tone: 'good', message: 'Signature valid' };
	}
	return { tone: 'caution', message: 'Signature not confirmed' };
}

/**
 * Writes a key ID in groups of four characters, which is easier to compare by eye.
 * @param keyId - The key ID as one run of hexadecimal characters
 * @returns The same characters in groups
 */
export function formatKeyId(keyId: string): string {
	return (keyId.match(KEY_ID_GROUP) ?? []).join(' ');
}

/** A signature whose key was not among those supplied, or was not looked for at all */
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
