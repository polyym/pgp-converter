type ErrorContext = 'encrypt' | 'decrypt' | 'keygen';

interface ErrorMapping {
	pattern: RegExp;
	message: string;
	contexts?: ErrorContext[];
}

const errorMappings: readonly ErrorMapping[] = [
	{
		pattern: /misformed armored text|ascii armor integrity check failed|could not find armored text/i,
		message: 'The key you provided appears to be invalid or corrupted. Please check that you copied the entire key, including the header and footer lines.'
	},
	{
		pattern: /incorrect key passphrase|error decrypting private key/i,
		message: 'Incorrect passphrase. Please check your passphrase and try again.',
		contexts: ['decrypt']
	},
	{
		pattern: /session key decryption failed|no matching private key/i,
		message: 'This message was not encrypted with the private key you provided.',
		contexts: ['decrypt']
	},
	{
		pattern: /private key.*not decrypted/i,
		message: 'Could not unlock your private key. Please verify your passphrase.',
		contexts: ['decrypt']
	},
	{
		pattern: /not a valid.*public key|armored text not of type.*public/i,
		message: "This doesn't appear to be a valid PGP public key. Make sure you're using the public key, not the private key.",
		contexts: ['encrypt']
	},
	{
		pattern: /not a valid.*private key|armored text not of type.*private/i,
		message: "This doesn't appear to be a valid PGP private key. Make sure you're using the private key, not the public key.",
		contexts: ['decrypt']
	},
	{
		pattern: /invalid enum value|invalid curve|unsupported curve/i,
		message: 'The selected key type or curve is not supported. Please try a different option.',
		contexts: ['keygen']
	}
];

/**
 * Maps a raw OpenPGP.js error message to a user-friendly string
 * @param rawMessage - The raw error message from the library
 * @param context - The operation context (encrypt, decrypt, or keygen)
 * @returns A plain-language error message suitable for display
 */
export function getUserFriendlyError(rawMessage: string, context: ErrorContext): string {
	for (const mapping of errorMappings) {
		if (mapping.contexts && !mapping.contexts.includes(context)) continue;
		if (mapping.pattern.test(rawMessage)) return mapping.message;
	}
	return 'Something went wrong. Please check your inputs and try again.';
}
