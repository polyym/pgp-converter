import { SITE_URL } from './constants.ts';

// A "<" inside the data could end the script element early. Written as an
// escape it means the same to whoever reads the JSON.
const ESCAPED_LESS_THAN = '\\u003c';

/** What the homepage tells search engines about the app, in schema.org's vocabulary */
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
 * Writes structured data as the script element that carries it in a page's
 * head. The element holds data, not code: browsers do not run it.
 * @param data - The data, as schema.org describes it
 * @returns The element as HTML, safe to place in the page as it is
 */
export function toStructuredDataScript(data: object): string {
	const json = JSON.stringify(data).replaceAll('<', () => ESCAPED_LESS_THAN);
	return `<script type="application/ld+json">${json}</script>`;
}
