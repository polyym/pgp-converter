import { MAX_UNPACKED_MESSAGE_MB } from './constants.ts';

export type ErrorContext = 'encrypt' | 'decrypt' | 'keygen' | 'sign' | 'verify';

/**
 * The step of an operation that failed. OpenPGP.js reports the same error for
 * a malformed key and a malformed message, so the step is what tells us which
 * input to point the user at.
 */
export type ErrorStage = 'public-key' | 'private-key' | 'passphrase' | 'message' | 'operation';

interface ErrorMapping {
	pattern: RegExp;
	message: string;
	contexts?: readonly ErrorContext[];
	stages?: readonly ErrorStage[];
}

const ARMOR_ERROR =
	/misformed armored text|ascii armor integrity check failed|could not find armored text/i;

const INVALID_PUBLIC_KEY =
	'The public key appears to be invalid or incomplete. Check that you copied the whole key, including the BEGIN and END lines.';
const INVALID_PRIVATE_KEY =
	'The private key appears to be invalid or incomplete. Check that you copied the whole key, including the BEGIN and END lines.';
const INVALID_MESSAGE =
	'The encrypted message appears to be invalid or incomplete. Check that you copied the whole message, including the BEGIN and END lines.';
const INVALID_SIGNED_MESSAGE =
	"This doesn't appear to be a signed PGP message. Paste the whole message, from -----BEGIN PGP SIGNED MESSAGE----- to -----END PGP SIGNATURE-----.";
const UNLOCK_FAILED =
	'Could not unlock your private key. Please check your passphrase and try again.';

/** OpenPGP.js refuses DSA and ElGamal keys, and RSA keys under 2047 bits, with this wording */
export const WEAK_KEY_PATTERN = /considered too weak/i;

export const PASSWORD_ONLY_MESSAGE_ERROR =
	'This message is protected with a password, not with a key. PGP Converter cannot open those; a program such as GnuPG can.';
export const NOT_ENCRYPTED_MESSAGE_ERROR =
	'This message is not encrypted, so there is nothing to decrypt. If it is signed, check it on the Verify page.';
export const OVERSIZED_MESSAGE_ERROR = `This message unpacks to more than ${String(MAX_UNPACKED_MESSAGE_MB)} MB, which PGP Converter will not open. A small message that unpacks to that much is usually made to overload the page.`;
export const WEAK_RECIPIENT_KEY_ERROR =
	'This public key is of an old kind that is no longer considered safe (DSA, ElGamal, or RSA under 2048 bits). Ask the recipient for a newer key.';
export const WEAK_SIGNING_KEY_ERROR =
	'Your key is of an old kind that is no longer considered safe (DSA, or RSA under 2048 bits), so it cannot sign here. Make a new key on the Generate page.';
const GENERIC_ERROR = 'Something went wrong. Please check your inputs and try again.';

const errorMappings: readonly ErrorMapping[] = [
	// First, because it is about the message whatever step reports it
	{ pattern: /maximum decompressed message size exceeded/i, message: OVERSIZED_MESSAGE_ERROR },
	// Whatever else the library says about the text in the signed message box, the advice is the same
	{ pattern: /./, message: INVALID_SIGNED_MESSAGE, contexts: ['verify'], stages: ['message'] },
	{
		pattern: /not a valid.*public key|armored text not of type.*(public|key)/i,
		message:
			"This doesn't appear to be a valid PGP public key. Make sure you're using the sender's public key, not a message.",
		contexts: ['verify']
	},
	// Before the other signing-key mappings: the library words this as a failure to find a signing key
	{ pattern: WEAK_KEY_PATTERN, message: WEAK_SIGNING_KEY_ERROR, contexts: ['sign'] },
	{ pattern: WEAK_KEY_PATTERN, message: WEAK_RECIPIENT_KEY_ERROR, contexts: ['encrypt'] },
	{
		pattern: /no public key encrypted session key packet found/i,
		message: PASSWORD_ONLY_MESSAGE_ERROR,
		contexts: ['decrypt']
	},
	{
		pattern: /no encrypted data found/i,
		message: NOT_ENCRYPTED_MESSAGE_ERROR,
		contexts: ['decrypt']
	},
	{
		pattern: /expired/i,
		message: 'Your key has expired, so it can no longer sign. Use a key that is still valid.',
		contexts: ['sign'],
		stages: ['operation']
	},
	{
		pattern: /revoked/i,
		message: 'Your key has been revoked, so it can no longer sign. Use a key that is still valid.',
		contexts: ['sign'],
		stages: ['operation']
	},
	{
		pattern: /could not find valid signing key|signing key/i,
		message: 'This private key cannot be used for signing. Use a key that supports it.',
		contexts: ['sign'],
		stages: ['operation']
	},
	{
		pattern: /armored text not of type message/i,
		message:
			"This doesn't appear to be a PGP message. Paste the encrypted message, which begins with -----BEGIN PGP MESSAGE-----.",
		contexts: ['decrypt']
	},
	{
		pattern: /not a valid.*private key|armored text not of type.*private/i,
		message:
			"This doesn't appear to be a valid PGP private key. Make sure you're using your private key, not a public key or a message.",
		contexts: ['decrypt', 'sign']
	},
	{
		pattern: /not a valid.*public key|armored text not of type.*(public|key)/i,
		message:
			"This doesn't appear to be a valid PGP public key. Make sure you're using the recipient's public key, not a message.",
		contexts: ['encrypt']
	},
	{ pattern: ARMOR_ERROR, message: INVALID_PUBLIC_KEY, stages: ['public-key'] },
	{ pattern: ARMOR_ERROR, message: INVALID_PRIVATE_KEY, stages: ['private-key'] },
	{ pattern: ARMOR_ERROR, message: INVALID_MESSAGE, stages: ['message'] },
	{
		pattern: ARMOR_ERROR,
		message:
			'The key you provided appears to be invalid or corrupted. Please check that you copied the entire key, including the header and footer lines.'
	},
	{
		pattern: /incorrect key passphrase/i,
		message: 'Incorrect passphrase. Please check your passphrase and try again.',
		contexts: ['decrypt', 'sign']
	},
	{
		pattern:
			/session key decryption failed|no matching private key|no decryption key packets found/i,
		message: 'This message was not encrypted with the private key you provided.',
		contexts: ['decrypt']
	},
	{
		pattern: /modification detected|authentication tag mismatch|unexpected end of packet/i,
		message:
			'The encrypted message is incomplete or has been altered. Copy the whole message again and retry.',
		contexts: ['decrypt']
	},
	{
		pattern: /private key.*not decrypted/i,
		message: 'Could not unlock your private key. Please verify your passphrase.',
		contexts: ['decrypt', 'sign']
	},
	{
		pattern: /expired/i,
		message: 'This public key has expired. Ask the recipient for an up-to-date key.',
		contexts: ['encrypt']
	},
	{
		pattern: /revoked/i,
		message:
			'This public key has been revoked by its owner. Ask the recipient for their current key.',
		contexts: ['encrypt']
	},
	{
		pattern: /could not find valid encryption key/i,
		message:
			'This public key cannot be used for encryption. Ask the recipient for a key that supports it.',
		contexts: ['encrypt']
	},
	{
		pattern: /invalid enum value|invalid curve|unsupported curve/i,
		message: 'The selected key type or curve is not supported. Please try a different option.',
		contexts: ['keygen']
	}
];

/** What to say when no specific mapping matches, based on the input being processed */
const stageFallbacks: Partial<Record<ErrorStage, string>> = {
	'public-key': INVALID_PUBLIC_KEY,
	'private-key': INVALID_PRIVATE_KEY,
	message: INVALID_MESSAGE,
	passphrase: UNLOCK_FAILED
};

/**
 * Maps a raw OpenPGP.js error message to a user-friendly string
 * @param rawMessage - The raw error message from the library
 * @param context - The operation context (encrypt, decrypt, keygen, sign or verify)
 * @param stage - The step that failed, used to name the input that caused the error
 * @returns A plain-language error message suitable for display
 */
export function getUserFriendlyError(
	rawMessage: string,
	context: ErrorContext,
	stage?: ErrorStage
): string {
	for (const mapping of errorMappings) {
		if (mapping.contexts && !mapping.contexts.includes(context)) {
			continue;
		}
		if (mapping.stages && (!stage || !mapping.stages.includes(stage))) {
			continue;
		}
		if (mapping.pattern.test(rawMessage)) {
			return mapping.message;
		}
	}
	return (stage && stageFallbacks[stage]) ?? GENERIC_ERROR;
}
