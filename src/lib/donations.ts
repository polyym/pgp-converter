import QRCode from 'qrcode';
import { WALLET_MAX_RETRIES, WALLET_RETRY_DELAY_MS } from './constants.ts';

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

/** A coin that donations are taken in: its name, its colours and its logo */
export interface Coin {
	name: string;
	ticker: string;
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

/** One address to show: the coin it is for, and the field of the API's answer that carries it */
interface WalletSlot {
	id: string;
	coin: Coin;
	field: keyof ApiAddresses;
	badge?: string;
}

const SOLANA: Coin = {
	name: 'Solana',
	ticker: 'SOL',
	color: '#9945FF',
	bg: 'rgba(153, 69, 255, 0.1)',
	icon: `<svg width="20" height="20" viewBox="0 0 397.7 311.7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
			<path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/>
			<path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/>
			<path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/>
		</svg>`
};

const ETHEREUM: Coin = {
	name: 'Ethereum',
	ticker: 'ETH',
	color: '#627EEA',
	bg: 'rgba(98, 126, 234, 0.1)',
	icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M12 2L5 12.5l7 4 7-4L12 2Z" fill="currentColor" opacity="0.9"/>
			<path d="M5 12.5l7 4 7-4-7-4-7 4Z" fill="currentColor" opacity="0.5"/>
			<path d="M12 22l7-6.5-7 4-7-4L12 22Z" fill="currentColor" opacity="0.8"/>
		</svg>`
};

const BITCOIN: Coin = {
	name: 'Bitcoin',
	ticker: 'BTC',
	color: '#F7931A',
	bg: 'rgba(247, 147, 26, 0.1)',
	icon: `<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
			<path d="M5.5 13v1.25c0 .138.112.25.25.25h1a.25.25 0 0 0 .25-.25V13h.5v1.25c0 .138.112.25.25.25h1a.25.25 0 0 0 .25-.25V13h.084c1.992 0 3.416-1.033 3.416-2.82 0-1.502-1.007-2.323-2.186-2.44v-.088c.97-.242 1.683-.974 1.683-2.19C11.997 3.93 10.847 3 9.092 3H9V1.75a.25.25 0 0 0-.25-.25h-1a.25.25 0 0 0-.25.25V3h-.573V1.75a.25.25 0 0 0-.25-.25H5.75a.25.25 0 0 0-.25.25V3l-1.998.011a.25.25 0 0 0-.25.25v.989c0 .137.11.25.248.25l.755-.005a.75.75 0 0 1 .745.75v5.505a.75.75 0 0 1-.75.75l-.748.011a.25.25 0 0 0-.25.25v1c0 .138.112.25.25.25zm1.427-8.513h1.719c.906 0 1.438.498 1.438 1.312 0 .871-.575 1.362-1.877 1.362h-1.28zm0 4.051h1.84c1.137 0 1.756.58 1.756 1.524 0 .953-.626 1.45-2.158 1.45H6.927z"/>
		</svg>`
};

/** The coins, in the order the Donate page lists them */
export const COINS: readonly Coin[] = [SOLANA, ETHEREUM, BITCOIN];

// The addresses to show, in display order. Bitcoin has two, in different formats.
const WALLET_SLOTS: readonly WalletSlot[] = [
	{ id: 'sol', coin: SOLANA, field: 'solana' },
	{ id: 'eth', coin: ETHEREUM, field: 'ethereum' },
	{ id: 'btc-taproot', coin: BITCOIN, field: 'bitcoin_taproot', badge: 'Taproot' },
	{ id: 'btc-segwit', coin: BITCOIN, field: 'bitcoin_native_segwit', badge: 'Native SegWit' }
];

// Shape checks for each chain. They reject missing, truncated or garbled values
// before anything is shown to a donor; they are not checksum validation.
const ADDRESS_FORMATS: Record<keyof ApiAddresses, RegExp> = {
	solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
	ethereum: /^0x[0-9a-fA-F]{40}$/,
	bitcoin_taproot: /^bc1p[02-9ac-hj-np-z]{58}$/,
	bitcoin_native_segwit: /^bc1q(?:[02-9ac-hj-np-z]{38}|[02-9ac-hj-np-z]{58})$/
};

// The wallet proxy function at its default Netlify address: /.netlify/functions/
// followed by the name of its file in netlify/functions. The proxy is locked to
// this project's own wallet record. See the note in that file before moving it
// to a custom path.
const WALLETS_ENDPOINT = '/.netlify/functions/wallet-proxy';

// The statuses the host answers with while the wallet service is waking up
const WAKING_STATUSES: ReadonlySet<number> = new Set([502, 503, 504]);
// Dark modules on a light background, whatever the colour scheme. Inverted
// codes look better on a dark page but many wallet scanners cannot read them.
const QR_COLORS = { dark: '#111111', light: '#ffffff' };
const QR_SIZE_PX = 160;
// The quiet border around a code, in modules
const QR_MARGIN = 2;
const ELLIPSIS = '\u{2026}';

/** The one message donors see when addresses cannot be shown; internal errors stay internal */
export const WALLET_LOAD_ERROR =
	'Wallet addresses could not be loaded right now. Please try again in a few minutes.';

export interface FetchWalletsOptions {
	/** Cancels the request and any retries still to come */
	signal?: AbortSignal;
	/** Called on the first retry, so the page can say that the service is waking up */
	onWaking?: () => void;
}

export interface WalletsResult {
	success: boolean;
	/** The wallets with valid addresses, in display order */
	data?: Wallet[];
	error?: string;
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
	for (const { id, coin, field, badge } of WALLET_SLOTS) {
		const address = addresses[field];
		if (typeof address === 'string' && ADDRESS_FORMATS[field].test(address)) {
			wallets.push(badge ? { ...coin, id, badge, address } : { ...coin, id, address });
		}
	}
	return wallets;
}

/**
 * Fetches addresses from the API and merges them with the static UI config.
 * Retries for up to about 2.5 minutes if the service is waking up, and stops
 * at once when the signal is aborted (for example when the visitor leaves the page).
 * @param options - How to cancel, and what to call when the service is waking
 * @returns The wallets with valid addresses, or the message to show in their place
 */
export async function fetchWallets(options: FetchWalletsOptions = {}): Promise<WalletsResult> {
	try {
		return { success: true, data: await requestWallets(options) };
	} catch (e: unknown) {
		if (import.meta.env.DEV && !options.signal?.aborted) {
			console.error(e);
		}
		return { success: false, error: WALLET_LOAD_ERROR };
	}
}

/**
 * Truncates a wallet address for display, showing the first and last characters.
 * @param address - The full address
 * @param startChars - How many characters to keep from the start
 * @param endChars - How many characters to keep from the end
 * @returns The shortened address, with an ellipsis in the middle
 */
export function truncateAddress(address: string, startChars = 8, endChars = 6): string {
	return `${address.slice(0, startChars)}${ELLIPSIS}${address.slice(-endChars)}`;
}

/**
 * Generates QR code data URLs for each wallet address.
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
		wallets.map(async (wallet) =>
			QRCode.toDataURL(wallet.address, { width: QR_SIZE_PX, margin: QR_MARGIN, color: QR_COLORS })
		)
	);

	for (const [index, result] of results.entries()) {
		const wallet = wallets[index];
		if (result.status === 'fulfilled') {
			urls[wallet.id] = result.value;
		} else if (import.meta.env.DEV) {
			console.error(`QR generation failed for ${wallet.name}:`, result.reason);
		}
	}

	return urls;
}

/** Asks the wallet service for its addresses, waiting and asking again while it wakes up */
async function requestWallets({ signal, onWaking }: FetchWalletsOptions): Promise<Wallet[]> {
	for (let attempt = 0; attempt <= WALLET_MAX_RETRIES; attempt++) {
		const res = await fetch(WALLETS_ENDPOINT, { signal });

		if (res.ok) {
			// A body that is not JSON is treated like one with no addresses in it
			const data: unknown = await res.json().catch(() => null);
			const wallets = parseWallets(data);
			if (wallets.length === 0) {
				throw new Error('The wallet service returned no valid address');
			}
			return wallets;
		}

		const isWaking = WAKING_STATUSES.has(res.status);
		if (!isWaking || attempt === WALLET_MAX_RETRIES) {
			throw new Error(`The wallet service answered HTTP ${String(res.status)}`);
		}
		if (attempt === 0) {
			onWaking?.();
		}
		await wait(WALLET_RETRY_DELAY_MS, signal);
	}

	throw new Error('The wallet service did not answer');
}

/** Waits for the given time, or rejects as soon as the signal is aborted */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new Error('Cancelled before the wait began'));
			return;
		}
		const timer = setTimeout(() => {
			signal?.removeEventListener('abort', onAbort);
			resolve();
		}, ms);
		function onAbort(): void {
			clearTimeout(timer);
			reject(new Error('Cancelled during the wait'));
		}
		signal?.addEventListener('abort', onAbort, { once: true });
	});
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
