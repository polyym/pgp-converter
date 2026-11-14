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
import { CLEARTEXT_HEADER, normaliseArmor } from './armor.ts';
import { MESSAGE_READING_LIMITS } from './constants.ts';
import {
	describeKey,
	readPublicKeys,
	readUsablePrivateKey,
	PassphraseRequiredError,
	type KeyInfo
} from './keys.ts';

/**
 * The outcome of checking one signature:
 * - valid: made by a key that was supplied, and the message is unchanged
 * - invalid: does not match the message, which was altered or carries a forged signature
 * - unknown-key: made by a key that was not supplied, so it could not be checked
 * - untrusted: belongs to a supplied key, but that key or the signature's date cannot be relied on
 */
export type SignatureStatus = 'valid' | 'invalid' | 'unknown-key' | 'untrusted';

export interface SignatureCheck {
	status: SignatureStatus;
	/** ID of the key that made the signature, in upper-case hexadecimal */
	keyID: string;
	/** The supplied key that the signature belongs to, when there is one */
	signer?: KeyInfo;
	/** When the signature says it was made, as "YYYY-MM-DD HH:MM UTC" */
	signedAt?: string;
	/** Why a signature that matches its key is still not to be relied on */
	detail?: string;
}

/** One signature as OpenPGP.js reports it; the library does not export this type */
export interface LibrarySignature {
	keyID: KeyID;
	verified: Promise<true>;
	signature: Promise<Signature>;
}

export interface SigningResult {
	success: boolean;
	/** The signed message, readable by anyone, with the signature underneath */
	data?: string;
	/** The key that signed */
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
export const REISSUED_KEY_DETAIL =
	'The key you provided was updated by its owner after this message was signed, and this copy of it holds no record from before then. The signature cannot be confirmed against this copy; an older copy of the key would confirm it.';

const SIGNATURE_HEADER = '-----BEGIN PGP SIGNATURE-----';
const MESSAGE_HEADER = '-----BEGIN PGP MESSAGE-----';

/**
 * Turns the library's verification results into plain outcomes
 * @param results - The signatures found on a message, as returned by OpenPGP.js
 * @param keys - The public keys that were supplied to check them
 * @returns One outcome for each signature
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
				// The date is a courtesy; a verdict below only reads it to choose its wording
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
					// Turned away because of the key's kind, before the signature was looked at.
					// Calling that "does not match" would accuse an honest message of being altered.
					check.status = 'untrusted';
					check.detail = WEAK_SIGNING_KEY_DETAIL;
				} else if (/in the future/i.test(message)) {
					check.status = 'untrusted';
					// The library says "in the future" in two cases. Either the signature is
					// dated ahead of this device's clock, or the key's own record of itself is
					// dated after the signature: its owner changed something about the key,
					// an expiry date for instance, with a tool that kept only the new record.
					// The second has nothing to do with anyone's clock.
					const isAheadOfClock = !signedOn || signedOn.getTime() > Date.now();
					check.detail = isAheadOfClock ? FUTURE_SIGNATURE_DETAIL : REISSUED_KEY_DETAIL;
				} else {
					check.status = 'invalid';
				}
			}
			return check;
		})
	);
}

/**
 * Signs a message so that anyone can read it and check who wrote it
 * @param text - The message to sign
 * @param armoredPrivateKey - The signer's armored PGP private key
 * @param passphrase - The passphrase to unlock the private key; ignored if the key is not protected
 * @returns SigningResult with the signed message or an error
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
		const signed = await sign({ message, signingKeys: privateKey });

		// The library joins the lines of the text with CRLF and the rest with LF. One
		// kind of line ending pastes more predictably, and verification treats both alike.
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
		// The step is updated from inside a callback, which the compiler cannot follow
		const failedAt = stage as ErrorStage;
		return {
			success: false,
			error: getUserFriendlyError(message, 'sign', failedAt),
			errorField: failedAt === 'passphrase' ? 'passphrase' : 'privateKey'
		};
	}
}

/**
 * Checks the signature on a signed message against the sender's public key
 * @param signedMessage - A message that begins with BEGIN PGP SIGNED MESSAGE, or a signed BEGIN PGP MESSAGE block
 * @param armoredPublicKeys - One or more armored PGP public keys that may have signed it
 * @returns VerificationOutcome with the signed text and the result for each signature, or an error
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
		// The text of a cleartext message is part of what was signed, so it is read as
		// pasted. Only if that fails is it cleaned up, to undo quoting by an email client.
		const candidates = [signedMessage.trim(), normaliseArmor(signedMessage)];
		let result: { data: unknown; signatures: LibrarySignature[] } | undefined;
		let firstError: unknown;
		for (const candidate of candidates) {
			try {
				result = candidate.includes(CLEARTEXT_HEADER)
					? await verify({
							message: await readCleartextMessage({ cleartextMessage: candidate }),
							verificationKeys: publicKeys
						})
					: await verify({
							message: await readMessage({
								armoredMessage: candidate,
								config: MESSAGE_READING_LIMITS
							}),
							verificationKeys: publicKeys,
							config: MESSAGE_READING_LIMITS
						});
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
			signatures: await checkSignatures(result.signatures, publicKeys)
		};
	} catch (e: unknown) {
		if (import.meta.env.DEV) {
			console.error(e);
		}
		const message = e instanceof Error ? e.message : String(e);
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
