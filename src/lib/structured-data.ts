import { SITE_URL } from './constants.ts';

// Every "<" is written as \u003c, so a string such as "</script>" cannot close the
// element early. JSON parsers read the escape as the same character.
const ESCAPED_LESS_THAN = '\\u003c';

/** The homepage's schema.org WebApplication data for search engines */
export const WEB_APPLICATION_DATA = {
	'@context': 'https://schema.org',
	'@type': 'WebApplication',
	name: 'PGP Converter',
	url: SITE_URL,
	description:
		'Free, open-source PGP tool. Encrypt, decrypt, sign and verify messages, and generate ECC or RSA key pairs, all in your browser.',
	applicationCategory: 'SecurityApplication',
	operatingSystem: 'Any',
	offers: {
		'@type': 'Offer',
		price: '0'
	},
	browserRequirements: 'Requires a modern web browser with JavaScript enabled',
	featureList: [
		'PGP Message Encryption',
		'PGP Message Decryption',
		'PGP Message Signing',
		'PGP Signature Verification',
		'ECC Key Pair Generation (Curve25519, NIST P-256/384/521)',
		'RSA Key Pair Generation (2048/3072/4096-bit)',
		'Key Export (.asc and .txt)',
		'Client-Side Only Processing',
		'Keyboard Shortcuts'
	],
	softwareHelp: {
		'@type': 'WebPage',
		url: `${SITE_URL}/about`
	},
	isAccessibleForFree: true,
	inLanguage: 'en-GB'
} as const;

/**
 * Serialises JSON-LD data into a script element of type application/ld+json,
 * which browsers do not execute. With every "<" escaped, the result is safe to
 * insert into the page with {@html}.
 */
export function toStructuredDataScript(data: object): string {
	const json = JSON.stringify(data).replaceAll('<', () => ESCAPED_LESS_THAN);
	return `<script type="application/ld+json">${json}</script>`;
}
