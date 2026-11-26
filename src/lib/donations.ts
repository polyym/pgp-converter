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

/** A coin the Donate page accepts, with its brand colours and its logo as SVG markup */
export interface Coin {
	name: string;
	ticker: string;
	color: string;
	bg: string;
	icon: string;
}

// The address fields of the wallet proxy's JSON response
interface ApiAddresses {
	solana: string;
	ethereum: string;
	bitcoin_taproot: string;
	bitcoin_native_segwit: string;
}

/** One address card: its coin and the response field it reads */
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

// In display order. Bitcoin has two addresses: Taproot and native SegWit.
const WALLET_SLOTS: readonly WalletSlot[] = [
	{ id: 'sol', coin: SOLANA, field: 'solana' },
	{ id: 'eth', coin: ETHEREUM, field: 'ethereum' },
	{ id: 'btc-taproot', coin: BITCOIN, field: 'bitcoin_taproot', badge: 'Taproot' },
	{ id: 'btc-segwit', coin: BITCOIN, field: 'bitcoin_native_segwit', badge: 'Native SegWit' }
];

// Format checks: Base58 for Solana, 0x and 40 hex digits for Ethereum, and the
// Bech32 alphabet for Bitcoin (bc1q with 38 data characters for P2WPKH or 58 for
// P2WSH, bc1p with 58 for Taproot). They stop missing, truncated or garbled values
// reaching a donor, but do not verify checksums.
const ADDRESS_FORMATS: Record<keyof ApiAddresses, RegExp> = {
	solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
	ethereum: /^0x[0-9a-fA-F]{40}$/,
	bitcoin_taproot: /^bc1p[02-9ac-hj-np-z]{58}$/,
	bitcoin_native_segwit: /^bc1q(?:[02-9ac-hj-np-z]{38}|[02-9ac-hj-np-z]{58})$/
};

// Placeholders for test copies. Each is about as long as a real address, so the
// cards keep their layout, and contains hyphens, which no chain's format allows, so
// no wallet will send to it. They must all differ because the page identifies the
// copied address by its text.
const FAKE_ADDRESSES: ApiAddresses = {
	solana: 'FAKE-SOLANA-ADDRESS-FAKE-FAKE-FAKE-FAKE-FAKE',
	ethereum: 'FAKE-ETHEREUM-ADDRESS-FAKE-FAKE-FAKE-FAKE',
	bitcoin_taproot: 'FAKE-BITCOIN-TAPROOT-ADDRESS-FAKE-FAKE-FAKE-FAKE-FAKE-FAKE-FAKE',
	bitcoin_native_segwit: 'FAKE-BITCOIN-SEGWIT-ADDRESS-FAKE-FAKE-FAKE'
};

const FAKE_WALLETS: readonly Wallet[] = WALLET_SLOTS.map((slot) =>
	toWallet(slot, FAKE_ADDRESSES[slot.field])
);

// Netlify's default URL for netlify/functions/wallet-proxy.mts. Read the note at
// the top of that file before giving the function a custom path.
const WALLETS_ENDPOINT = '/.netlify/functions/wallet-proxy';

// Statuses the page retries. The proxy answers 503 while the wallet service wakes and
// never sends 502 or 504, so those can only come from Netlify, in front of the proxy.
const WAKING_STATUSES: ReadonlySet<number> = new Set([502, 503, 504]);
// Dark modules on a light background, whatever the colour scheme. Inverted
// codes look better on a dark page but many wallet scanners cannot read them.
const QR_COLORS = { dark: '#111111', light: '#ffffff' };
// Codes for fake addresses use the yellow that marks test copies (--candidate in app.css)
const FAKE_QR_COLORS = { dark: '#111111', light: '#fde68a' };
const QR_SIZE_PX = 160;
// Quiet zone, in modules
const QR_MARGIN = 2;
const ELLIPSIS = '\u{2026}';

/**
 * The only error the Donate page shows for a failed load. The cause is logged in
 * development only.
 */
export const WALLET_LOAD_ERROR =
	'Wallet addresses could not be loaded right now. Please try again in a few minutes.';

export interface FetchWalletsOptions {
	/** Cancels the request and any retries still to come */
	signal?: AbortSignal;
	/** Called once, before the first retry, so the page can say that the service is starting up */
	onWaking?: () => void;
}

export interface LoadWalletsOptions extends FetchWalletsOptions {
	/** True on a test copy, which shows fake addresses */
	isFake: boolean;
}

export interface QrOptions {
	/** True for fake addresses, whose codes are drawn on yellow */
	isFake?: boolean;
}

export interface WalletsResult {
	success: boolean;
	/** The wallets with valid addresses, in display order */
	data?: Wallet[];
	error?: string;
}

/**
 * Returns the wallets for the Donate page: fake placeholders when `isFake` is
 * set, otherwise whatever fetchWallets returns. Test copies get placeholders
 * because they have no API key for the wallet service and must not look like a
 * real place to send money. Never rejects.
 */
export function loadWallets({ isFake, ...options }: LoadWalletsOptions): Promise<WalletsResult> {
	return isFake
		? Promise.resolve({ success: true, data: [...FAKE_WALLETS] })
		: fetchWallets(options);
}

/**
 * Returns a wallet for each address in the parsed response body that is present
 * and matches its chain's format, in display order. Accepts any value: a body of
 * the wrong shape gives an empty list, and one bad address does not hide the others.
 */
export function parseWallets(data: unknown): Wallet[] {
	const addresses = isRecord(data) && isRecord(data.addresses) ? data.addresses : {};
	const wallets: Wallet[] = [];
	for (const slot of WALLET_SLOTS) {
		const address = addresses[slot.field];
		if (typeof address === 'string' && ADDRESS_FORMATS[slot.field].test(address)) {
			wallets.push(toWallet(slot, address));
		}
	}
	return wallets;
}

/**
 * Fetches the addresses from the wallet proxy. On a 502, 503 or 504 it retries
 * every WALLET_RETRY_DELAY_MS, up to WALLET_MAX_RETRIES times, and aborting
 * `signal` stops it at once. Never rejects: every failure, including a successful
 * response with no valid address, returns WALLET_LOAD_ERROR.
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
 * Shortens an address for display to its first `startChars` and last `endChars`
 * characters, joined by an ellipsis. Expects an address longer than the two
 * parts together; a shorter one comes back with characters repeated.
 */
export function truncateAddress(address: string, startChars = 8, endChars = 6): string {
	return `${address.slice(0, startChars)}${ELLIPSIS}${address.slice(-endChars)}`;
}

/**
 * Returns a PNG data URL of each wallet's address as a QR code, keyed by wallet
 * id. A wallet whose code fails to render is left out. With `isFake`, codes are
 * drawn on the yellow that marks test copies.
 */
export async function generateQrDataUrls(
	wallets: readonly Wallet[],
	{ isFake = false }: QrOptions = {}
): Promise<Record<string, string>> {
	const urls: Record<string, string> = {};
	const color = isFake ? FAKE_QR_COLORS : QR_COLORS;

	// The async arrow turns a synchronous throw from toDataURL into a rejection,
	// so allSettled still renders the other codes
	const results = await Promise.allSettled(
		wallets.map(async (wallet) =>
			QRCode.toDataURL(wallet.address, { width: QR_SIZE_PX, margin: QR_MARGIN, color })
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

function toWallet({ id, coin, badge }: WalletSlot, address: string): Wallet {
	return badge ? { ...coin, id, badge, address } : { ...coin, id, address };
}

/** Throws on any failure, including an abort. fetchWallets turns that into WALLET_LOAD_ERROR. */
async function requestWallets({ signal, onWaking }: FetchWalletsOptions): Promise<Wallet[]> {
	for (let attempt = 0; attempt <= WALLET_MAX_RETRIES; attempt++) {
		const res = await fetch(WALLETS_ENDPOINT, { signal });

		if (res.ok) {
			// A body that is not JSON counts as one with no addresses
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

	// Not reached: the last attempt returns or throws, which TypeScript cannot tell
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
