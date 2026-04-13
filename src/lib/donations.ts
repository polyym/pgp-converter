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

export const WALLETS: readonly Wallet[] = [
	{
		id: 'sol',
		name: 'Solana',
		ticker: 'SOL',
		address: '7h1mQGWJjATBSuPnULEMKHVu6fdd4VrqDmbCMx6WBSVM',
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
		address: '0x1ACe3863B60e18B1D4B1BCe5a9B6659eede757D5',
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
		address: 'bc1p3lclkuj028nwdnckwe6epch2nnw43aj9pxhg2tj5vvpktww889ds8fz6g7',
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
		address: 'bc1qsnxg720nem0sfnq3n7v0c8rxcyn8mj8p37zvay',
		color: '#F7931A',
		bg: 'rgba(247, 147, 26, 0.1)',
		icon: `<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
			<path d="M5.5 13v1.25c0 .138.112.25.25.25h1a.25.25 0 0 0 .25-.25V13h.5v1.25c0 .138.112.25.25.25h1a.25.25 0 0 0 .25-.25V13h.084c1.992 0 3.416-1.033 3.416-2.82 0-1.502-1.007-2.323-2.186-2.44v-.088c.97-.242 1.683-.974 1.683-2.19C11.997 3.93 10.847 3 9.092 3H9V1.75a.25.25 0 0 0-.25-.25h-1a.25.25 0 0 0-.25.25V3h-.573V1.75a.25.25 0 0 0-.25-.25H5.75a.25.25 0 0 0-.25.25V3l-1.998.011a.25.25 0 0 0-.25.25v.989c0 .137.11.25.248.25l.755-.005a.75.75 0 0 1 .745.75v5.505a.75.75 0 0 1-.75.75l-.748.011a.25.25 0 0 0-.25.25v1c0 .138.112.25.25.25zm1.427-8.513h1.719c.906 0 1.438.498 1.438 1.312 0 .871-.575 1.362-1.877 1.362h-1.28zm0 4.051h1.84c1.137 0 1.756.58 1.756 1.524 0 .953-.626 1.45-2.158 1.45H6.927z"/>
		</svg>`
	}
];

/** Truncates a wallet address for display, showing the first and last characters */
export function truncateAddress(address: string, startChars = 8, endChars = 6): string {
	return address.slice(0, startChars) + '\u2026' + address.slice(-endChars);
}

/** Returns QR code foreground and background colours based on the user's colour scheme */
export function getQrColors(): { dark: string; light: string } {
	const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	return isDark
		? { dark: '#ffffff', light: '#1a1a1a' }
		: { dark: '#111111', light: '#ffffff' };
}

/** Generates QR code data URLs for each wallet address */
export async function generateQrDataUrls(
	wallets: readonly Wallet[]
): Promise<Record<string, string>> {
	const colors = getQrColors();
	const urls: Record<string, string> = {};

	const results = await Promise.allSettled(
		wallets.map(wallet =>
			QRCode.toDataURL(wallet.address, { width: 160, margin: 2, color: colors })
		)
	);

	results.forEach((result, i) => {
		if (result.status === 'fulfilled') {
			urls[wallets[i].id] = result.value;
		} else {
			console.error(`QR generation failed for ${wallets[i].name}:`, result.reason);
		}
	});

	return urls;
}
