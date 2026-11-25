import {
	sign,
	verify,
	createCleartextMessage,
	readCleartextMessage,
	readMessage,
	type Key,
	type KeyID,
	type Signature
} from 'openpgp';
import { getUserFriendlyError, WEAK_KEY_PATTERN, type ErrorStage } from './errors.ts';
import { CLEARTEXT_HEADER, hasOtherText, normaliseArmor } from './armor.ts';
import { KEY_USE_SETTINGS, MESSAGE_READING_LIMITS } from './constants.ts';
import {
	describeKey,
	readPublicKeys,
	readUsablePrivateKey,
	PassphraseRequiredError,
	type KeyInfo
} from './keys.ts';

/**
 * The outcome of checking one signature:
 * - valid: verified against a supplied key
 * - invalid: any failure the other statuses do not cover. Usually the message was
 *   altered or the signature was not made by the key it names, but OpenPGP.js
 *   also rejects some signatures that verify, such as ones made with SHA-1.
 * - unknown-key: the issuer key ID matches no supplied key, so it was not verified
 * - untrusted: verified, but the key is revoked, expired, weak or not flagged for
 *   signing, or the signature has expired, is dated in the future or is older than
 *   every self-signature on the key
 */
export type SignatureStatus = 'valid' | 'invalid' | 'unknown-key' | 'untrusted';

export interface SignatureCheck {
	status: SignatureStatus;
	/** Issuer key ID as 16 upper-case hex digits */
	keyID: string;
	/** The supplied key holding that key ID; undefined when none does */
	signer?: KeyInfo;
	/** When the signature says it was made, as "YYYY-MM-DD HH:MM UTC" */
	signedAt?: string;
	/** User-facing reason for an 'untrusted' status */
	detail?: string;
}

/**
 * One entry of the `signatures` array that OpenPGP.js verify and decrypt
 * return. The library does not export this type.
 */
export interface LibrarySignature {
	keyID: KeyID;
	verified: Promise<true>;
	signature: Promise<Signature>;
}

export interface SigningResult {
	success: boolean;
	/** The cleartext signed message, armoured, with LF line endings */
	data?: string;
	signer?: KeyInfo;
	error?: string;
	/** The input the error is about, when it is about one in particular */
	errorField?: 'privateKey' | 'passphrase';
}

export interface VerificationOutcome {
	success: boolean;
	/** The text that was signed */
	data?: string;
	/** One entry for each signature on the message; empty if it carries none */
	signatures?: SignatureCheck[];
	/** True when the paste held text besides the message OpenPGP.js read, which no verdict covers */
	hasOtherText?: boolean;
	error?: string;
	/** The input the error is about, when it is about one in particular */
	errorField?: 'signedMessage' | 'publicKey';
}

export const SIGNING_PASSPHRASE_REQUIRED_ERROR =
	'This private key is protected by a passphrase. Enter the passphrase to sign.';
export const PRIVATE_KEY_AS_SENDER_ERROR =
	"That is a private key. Checking a signature needs the sender's public key; never paste or share a private key.";
export const ENCRYPTED_NOT_SIGNED_ERROR =
	'This message is encrypted. Decrypt it on the Decrypt page, which can check its signature at the same time.';
export const DETACHED_SIGNATURE_ERROR =
	'This is a detached signature, which belongs with a separate file. PGP Converter checks signed text only; a program such as GnuPG can check a file against its signature.';
export const WEAK_SIGNING_KEY_DETAIL =
	'The key that made this signature is of an old kind that is no longer considered safe (DSA, or RSA under 2048 bits), so its signatures cannot be relied on.';
export const FUTURE_SIGNATURE_DETAIL =
	"The signature is dated in the future. Check that this device's clock is right.";
export const UNFIT_SIGNING_KEY_DETAIL =
	'The key that made this signature is not set up for signing, so do not rely on its signatures.';
export const REISSUED_KEY_DETAIL =
	'The key you provided was updated by its owner after this message was signed, and this copy of it holds no record from before then. The signature cannot be confirmed against this copy; an older copy of the key would confirm it.';

/**
 * The OpenPGP.js error when no key or subkey is flagged for signing. That
 * message ends with the key ID; for other faults the library appends a cause
 * after the ID, which the `$` rules out.
 */
const UNFIT_SIGNING_KEY_PATTERN = /could not find valid signing key packet in key [0-9a-f]+$/i;
const SIGNATURE_HEADER = '-----BEGIN PGP SIGNATURE-----';
const MESSAGE_HEADER = '-----BEGIN PGP MESSAGE-----';

/**
 * Awaits each OpenPGP.js verification result and classifies it by the error it
 * rejects with, since the error message is the only place the library gives a reason.
 * @param keys - The supplied public keys, used to name the signer
 * @returns One check per signature, in the same order
 */
export async function checkSignatures(
	results: LibrarySignature[],
	keys: Key[]
): Promise<SignatureCheck[]> {
	return Promise.all(
		results.map(async (result) => {
			const owner = keys.find((key) => key.getKeys(result.keyID).length > 0);
			const check: SignatureCheck = {
				status: 'valid',
				keyID: result.keyID.toHex().toUpperCase(),
				signer: owner ? await describeKey(owner, 'verify') : undefined
			};
			let signedOn: Date | undefined;
			try {
				const signature = await result.signature;
				signedOn = signature.packets.at(0)?.created ?? undefined;
				check.signedAt = formatSignedAt(signedOn);
			} catch {
				// The date is only shown and used to word one detail below, so it may be missing
			}
			try {
				await result.verified;
			} catch (e: unknown) {
				const message = e instanceof Error ? e.message : String(e);
				if (/could not find signing key/i.test(message)) {
					check.status = 'unknown-key';
				} else if (/revoked/i.test(message)) {
					check.status = 'untrusted';
					check.detail = 'The key that made this signature has been revoked by its owner.';
				} else if (/expired/i.test(message)) {
					check.status = 'untrusted';
					check.detail = 'The key that made this signature had expired when it was made.';
				} else if (WEAK_KEY_PATTERN.test(message)) {
					// OpenPGP.js checks key strength only after the signature has verified, so
					// 'invalid' here would call an unaltered message forged.
					check.status = 'untrusted';
					check.detail = WEAK_SIGNING_KEY_DETAIL;
				} else if (/in the future/i.test(message)) {
					check.status = 'untrusted';
					// OpenPGP.js says "in the future" when the signature's creation time is ahead
					// of this device's clock, and also when every self-signature on the key is
					// newer than the signature, as after the owner reformats the key. The second
					// case has nothing to do with the clock.
					const isAheadOfClock = !signedOn || signedOn.getTime() > Date.now();
					check.detail = isAheadOfClock ? FUTURE_SIGNATURE_DETAIL : REISSUED_KEY_DETAIL;
				} else if (UNFIT_SIGNING_KEY_PATTERN.test(message)) {
					// The signature verified, but the key flags exclude signing. Other signing
					// key failures, such as a subkey with no valid binding signature, stay 'invalid'.
					check.status = 'untrusted';
					check.detail = UNFIT_SIGNING_KEY_DETAIL;
				} else {
					check.status = 'invalid';
				}
			}
			return check;
		})
	);
}

/**
 * Creates a cleartext signed message from `text` (RFC 9580 section 7). Never
 * throws: a failure comes back as a user-facing `error`, with `errorField`
 * naming the input at fault.
 * @param armoredPrivateKey - May also hold the public key; the private key block is used
 * @param passphrase - Ignored when the key is not protected
 */
export async function signMessage(
	text: string,
	armoredPrivateKey: string,
	passphrase: string
): Promise<SigningResult> {
	let stage: ErrorStage = 'private-key';
	try {
		const privateKey = await readUsablePrivateKey(
			armoredPrivateKey,
			passphrase,
			(s) => (stage = s)
		);

		stage = 'operation';
		const message = await createCleartextMessage({ text });
		const signed = await sign({ message, signingKeys: privateKey, config: KEY_USE_SETTINGS });

		// OpenPGP.js writes the signed text with CRLF and the armour with LF. Use LF
		// throughout: the signature covers the text with line endings canonicalised to
		// CRLF, so it still verifies.
		const data = signed.replaceAll('\r\n', '\n');
		return { success: true, data, signer: await describeKey(privateKey, 'sign') };
	} catch (e: unknown) {
		if (e instanceof PassphraseRequiredError) {
			return { success: false, error: SIGNING_PASSPHRASE_REQUIRED_ERROR, errorField: 'passphrase' };
		}
		if (import.meta.env.DEV) {
			console.error(e);
		}
		const message = e instanceof Error ? e.message : String(e);
		// TypeScript does not see the assignment in the onStage callback and narrows
		// `stage` to the values assigned in this function, so widen it again
		const failedAt = stage as ErrorStage;
		return {
			success: false,
			error: getUserFriendlyError(message, 'sign', failedAt),
			errorField: failedAt === 'passphrase' ? 'passphrase' : 'privateKey'
		};
	}
}

/**
 * Verifies a cleartext signed message, or a signed PGP MESSAGE block, against
 * the supplied public keys. Never throws. A private key, a detached signature
 * and an encrypted message are each refused with their own error.
 * @param signedMessage - Pasted text; email quoting and indentation are tolerated
 * @param armoredPublicKeys - One or more armoured public keys
 */
export async function verifyMessage(
	signedMessage: string,
	armoredPublicKeys: string
): Promise<VerificationOutcome> {
	let stage: ErrorStage = 'public-key';
	try {
		const publicKeys = await readPublicKeys(armoredPublicKeys);
		if (publicKeys.some((key) => key.isPrivate())) {
			return { success: false, error: PRIVATE_KEY_AS_SENDER_ERROR, errorField: 'publicKey' };
		}

		stage = 'message';
		if (isDetachedSignature(signedMessage)) {
			return { success: false, error: DETACHED_SIGNATURE_ERROR, errorField: 'signedMessage' };
		}
		// Try the text as pasted first: normaliseArmor strips leading whitespace and
		// '>' from every line, which changes signed cleartext. The normalised text is
		// the fallback for a message quoted by an email client.
		const candidates = [signedMessage.trim(), normaliseArmor(signedMessage)];
		let result: { data: unknown; signatures: LibrarySignature[] } | undefined;
		// hasOtherText must inspect the candidate OpenPGP.js accepted, not the raw paste
		let accepted = '';
		let firstError: unknown;
		for (const candidate of candidates) {
			try {
				result = candidate.includes(CLEARTEXT_HEADER)
					? await verify({
							message: await readCleartextMessage({ cleartextMessage: candidate }),
							verificationKeys: publicKeys,
							config: KEY_USE_SETTINGS
						})
					: await verify({
							message: await readMessage({
								armoredMessage: candidate,
								config: MESSAGE_READING_LIMITS
							}),
							verificationKeys: publicKeys,
							config: { ...KEY_USE_SETTINGS, ...MESSAGE_READING_LIMITS }
						});
				accepted = candidate;
				break;
			} catch (e: unknown) {
				firstError ??= e;
			}
		}
		if (!result) {
			throw firstError;
		}

		return {
			success: true,
			data: String(result.data),
			signatures: await checkSignatures(result.signatures, publicKeys),
			hasOtherText: hasOtherText(accepted)
		};
	} catch (e: unknown) {
		if (import.meta.env.DEV) {
			console.error(e);
		}
		const message = e instanceof Error ? e.message : String(e);
		// OpenPGP.js rejects an encrypted message this way: it has no literal data
		// packet until it is decrypted
		if (/one literal data packet/i.test(message)) {
			return { success: false, error: ENCRYPTED_NOT_SIGNED_ERROR, errorField: 'signedMessage' };
		}
		return {
			success: false,
			error: getUserFriendlyError(message, 'verify', stage),
			errorField: stage === 'public-key' ? 'publicKey' : 'signedMessage'
		};
	}
}

/** True for a signature block on its own, with no signed text or message around it */
function isDetachedSignature(text: string): boolean {
	return (
		text.includes(SIGNATURE_HEADER) &&
		!text.includes(CLEARTEXT_HEADER) &&
		!text.includes(MESSAGE_HEADER)
	);
}

/** Formats a signature's timestamp without seconds, in UTC so it reads the same everywhere */
function formatSignedAt(date: Date | null | undefined): string | undefined {
	if (!date || Number.isNaN(date.getTime())) {
		return undefined;
	}
	return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}
