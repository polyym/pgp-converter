import QRCode from 'qrcode';

export interface Wallet {
	id: string;
	name: string;
	ticker: string;
	badge?: string;
	address: string;
	color: string;
	bg: string;
	icon: string;
}

interface ApiAddresses {
	solana: string;
	ethereum: string;
	bitcoin_taproot: string;
	bitcoin_native_segwit: string;
}

/** Static UI config for each chain; everything except the address */
const WALLET_UI: Omit<Wallet, 'address'>[] = [
	{
		id: 'sol',
		name: 'Solana',
		ticker: 'SOL',
		color: '#9945FF',
		bg: 'rgba(153, 69, 255, 0.1)',
		icon: `<svg width="20" height="20" viewBox="0 0 397.7 311.7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
			<path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/>
			<path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/>
			<path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/>
		</svg>`
	},
	{
		id: 'eth',
		name: 'Ethereum',
		ticker: 'ETH',
		color: '#627EEA',
		bg: 'rgba(98, 126, 234, 0.1)',
		icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M12 2L5 12.5l7 4 7-4L12 2Z" fill="currentColor" opacity="0.9"/>
			<path d="M5 12.5l7 4 7-4-7-4-7 4Z" fill="currentColor" opacity="0.5"/>
			<path d="M12 22l7-6.5-7 4-7-4L12 22Z" fill="currentColor" opacity="0.8"/>
		</svg>`
	},
	{
		id: 'btc-taproot',
		name: 'Bitcoin',
		ticker: 'BTC',
		badge: 'Taproot',
		color: '#F7931A',
		bg: 'rgba(247, 147, 26, 0.1)',
		icon: `<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
			<path d="M5.5 13v1.25c0 .138.112.25.25.25h1a.25.25 0 0 0 .25-.25V13h.5v1.25c0 .138.112.25.25.25h1a.25.25 0 0 0 .25-.25V13h.084c1.992 0 3.416-1.033 3.416-2.82 0-1.502-1.007-2.323-2.186-2.44v-.088c.97-.242 1.683-.974 1.683-2.19C11.997 3.93 10.847 3 9.092 3H9V1.75a.25.25 0 0 0-.25-.25h-1a.25.25 0 0 0-.25.25V3h-.573V1.75a.25.25 0 0 0-.25-.25H5.75a.25.25 0 0 0-.25.25V3l-1.998.011a.25.25 0 0 0-.25.25v.989c0 .137.11.25.248.25l.755-.005a.75.75 0 0 1 .745.75v5.505a.75.75 0 0 1-.75.75l-.748.011a.25.25 0 0 0-.25.25v1c0 .138.112.25.25.25zm1.427-8.513h1.719c.906 0 1.438.498 1.438 1.312 0 .871-.575 1.362-1.877 1.362h-1.28zm0 4.051h1.84c1.137 0 1.756.58 1.756 1.524 0 .953-.626 1.45-2.158 1.45H6.927z"/>
		</svg>`
	},
	{
		id: 'btc-segwit',
		name: 'Bitcoin',
		ticker: 'BTC',
		badge: 'Native SegWit',
		color: '#F7931A',
		bg: 'rgba(247, 147, 26, 0.1)',
		icon: `<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
			<path d="M5.5 13v1.25c0 .138.112.25.25.25h1a.25.25 0 0 0 .25-.25V13h.5v1.25c0 .138.112.25.25.25h1a.25.25 0 0 0 .25-.25V13h.084c1.992 0 3.416-1.033 3.416-2.82 0-1.502-1.007-2.323-2.186-2.44v-.088c.97-.242 1.683-.974 1.683-2.19C11.997 3.93 10.847 3 9.092 3H9V1.75a.25.25 0 0 0-.25-.25h-1a.25.25 0 0 0-.25.25V3h-.573V1.75a.25.25 0 0 0-.25-.25H5.75a.25.25 0 0 0-.25.25V3l-1.998.011a.25.25 0 0 0-.25.25v.989c0 .137.11.25.248.25l.755-.005a.75.75 0 0 1 .745.75v5.505a.75.75 0 0 1-.75.75l-.748.011a.25.25 0 0 0-.25.25v1c0 .138.112.25.25.25zm1.427-8.513h1.719c.906 0 1.438.498 1.438 1.312 0 .871-.575 1.362-1.877 1.362h-1.28zm0 4.051h1.84c1.137 0 1.756.58 1.756 1.524 0 .953-.626 1.45-2.158 1.45H6.927z"/>
		</svg>`
	}
];

/** Maps wallet id to API address field name */
const ADDRESS_MAP: Record<string, keyof ApiAddresses> = {
	'sol': 'solana',
	'eth': 'ethereum',
	'btc-taproot': 'bitcoin_taproot',
	'btc-segwit': 'bitcoin_native_segwit',
};

/** Shape checks for each chain. They reject missing, truncated or garbled values
 *  before anything is shown to a donor; they are not checksum validation. */
const ADDRESS_FORMATS: Record<keyof ApiAddresses, RegExp> = {
	solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
	ethereum: /^0x[0-9a-fA-F]{40}$/,
	bitcoin_taproot: /^bc1p[02-9ac-hj-np-z]{58}$/,
	bitcoin_native_segwit: /^bc1q(?:[02-9ac-hj-np-z]{38}|[02-9ac-hj-np-z]{58})$/,
};

/** The wallet proxy function at its default Netlify address: /.netlify/functions/
 *  followed by the name of its file in netlify/functions. The proxy is locked to
 *  this project's own wallet record. See the note in that file before moving it
 *  to a custom path. */
const WALLETS_ENDPOINT = '/.netlify/functions/wallet-proxy';

const MAX_RETRIES = 15;
const RETRY_DELAY_MS = 10_000;

/** The one message donors see when addresses cannot be shown; internal errors stay internal */
export const WALLET_LOAD_ERROR =
	'Wallet addresses could not be loaded right now. Please try again in a few minutes.';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/** Waits for the given time, or rejects as soon as the signal is aborted */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(signal.reason);
			return;
		}
		const onAbort = () => {
			clearTimeout(timer);
			reject(signal?.reason);
		};
		const timer = setTimeout(() => {
			signal?.removeEventListener('abort', onAbort);
			resolve();
		}, ms);
		signal?.addEventListener('abort', onAbort, { once: true });
	});
}

/**
 * Turns an API response into the wallets to display.
 * A wallet is included only if its address is present and has the expected
 * shape for its chain, so one bad value never hides the others.
 * @param data - The parsed JSON body returned by the wallet API
 * @returns The wallets whose addresses passed validation, in display order
 */
export function parseWallets(data: unknown): Wallet[] {
	const addresses = isRecord(data) && isRecord(data.addresses) ? data.addresses : {};
	const wallets: Wallet[] = [];
	for (const ui of WALLET_UI) {
		const field = ADDRESS_MAP[ui.id];
		const address = addresses[field];
		if (typeof address === 'string' && ADDRESS_FORMATS[field].test(address)) {
			wallets.push({ ...ui, address });
		}
	}
	return wallets;
}

/**
 * Fetches addresses from the API and merges them with the static UI config.
 * Retries for up to ~2.5 minutes if the Render service is waking up, and stops
 * at once when the signal is aborted (for example when the visitor leaves the page).
 * @param options - signal cancels the request and any pending retries; onWaking is
 *   called on the first retry so the UI can show a loading message
 * @returns The wallets with valid addresses
 * @throws An Error carrying WALLET_LOAD_ERROR if no valid address could be loaded
 */
export async function fetchWallets(
	options: { signal?: AbortSignal; onWaking?: () => void } = {}
): Promise<Wallet[]> {
	const { signal, onWaking } = options;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		let res: Response;
		try {
			res = await fetch(WALLETS_ENDPOINT, { signal });
		} catch (e: unknown) {
			if (signal?.aborted) throw e;
			throw new Error(WALLET_LOAD_ERROR);
		}

		if (res.ok) {
			const data: unknown = await res.json().catch(() => null);
			const wallets = parseWallets(data);
			if (wallets.length === 0) throw new Error(WALLET_LOAD_ERROR);
			return wallets;
		}

		// 502/503/504 = Render is waking up, retry
		const isWaking = res.status === 502 || res.status === 503 || res.status === 504;
		if (isWaking && attempt < MAX_RETRIES) {
			if (attempt === 0) onWaking?.();
			await wait(RETRY_DELAY_MS, signal);
			continue;
		}

		throw new Error(WALLET_LOAD_ERROR);
	}

	throw new Error(WALLET_LOAD_ERROR);
}

/** Truncates a wallet address for display, showing the first and last characters */
export function truncateAddress(address: string, startChars = 8, endChars = 6): string {
	return address.slice(0, startChars) + '\u2026' + address.slice(-endChars);
}

/** Dark modules on a light background, whatever the colour scheme. Inverted
 *  codes look better on a dark page but many wallet scanners cannot read them. */
const QR_COLORS = { dark: '#111111', light: '#ffffff' };

/**
 * Generates QR code data URLs for each wallet address
 * @param wallets - The wallets to generate codes for
 * @returns Data URLs keyed by wallet id; a wallet whose code failed is left out
 */
export async function generateQrDataUrls(
	wallets: readonly Wallet[]
): Promise<Record<string, string>> {
	const urls: Record<string, string> = {};

	// The async wrapper turns a synchronous throw for one wallet into a rejection,
	// so the others are still generated
	const results = await Promise.allSettled(
		wallets.map(async wallet =>
			QRCode.toDataURL(wallet.address, { width: 160, margin: 2, color: QR_COLORS })
		)
	);

	results.forEach((result, i) => {
		if (result.status === 'fulfilled') {
			urls[wallets[i].id] = result.value;
		} else if (import.meta.env.DEV) {
			console.error(`QR generation failed for ${wallets[i].name}:`, result.reason);
		}
	});

	return urls;
}
