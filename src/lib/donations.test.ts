import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseWallets, fetchWallets, generateQrDataUrls, truncateAddress, WALLET_LOAD_ERROR } from './donations';

// Correctly shaped but made-up addresses
const addresses = {
	solana: 'So11111111111111111111111111111111111111112',
	ethereum: '0x000000000000000000000000000000000000dEaD',
	bitcoin_taproot: 'bc1p' + 'q'.repeat(58),
	bitcoin_native_segwit: 'bc1q' + 'q'.repeat(38)
};

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('parseWallets', () => {
	it('should return every wallet when all addresses are valid', () => {
		const wallets = parseWallets({ addresses });

		expect(wallets.map((wallet) => wallet.id)).toEqual(['sol', 'eth', 'btc-taproot', 'btc-segwit']);
		expect(wallets[0].address).toBe(addresses.solana);
	});

	it('should leave out a missing address and keep the others', () => {
		const { bitcoin_taproot: _missing, ...rest } = addresses;
		const wallets = parseWallets({ addresses: rest });

		expect(wallets.map((wallet) => wallet.id)).toEqual(['sol', 'eth', 'btc-segwit']);
	});

	it('should leave out an address with the wrong shape', () => {
		const wallets = parseWallets({
			addresses: { ...addresses, ethereum: '0x1234', solana: '<html>error</html>' }
		});

		expect(wallets.map((wallet) => wallet.id)).toEqual(['btc-taproot', 'btc-segwit']);
	});

	it('should return nothing for a response that is not the expected shape', () => {
		expect(parseWallets(null)).toEqual([]);
		expect(parseWallets('oops')).toEqual([]);
		expect(parseWallets({})).toEqual([]);
		expect(parseWallets({ addresses: 'oops' })).toEqual([]);
		expect(parseWallets({ addresses: { solana: 42 } })).toEqual([]);
	});
});

describe('fetchWallets', () => {
	it('should request this project only and return its wallets', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ addresses }));
		vi.stubGlobal('fetch', fetchMock);

		const wallets = await fetchWallets();
		expect(wallets).toHaveLength(4);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0][0]).toBe('/api/wallets/pgp-converter');
	});

	it('should retry while the service is waking and report it once', async () => {
		vi.useFakeTimers();
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ error: 'Service unavailable' }, 503))
			.mockResolvedValueOnce(jsonResponse({ error: 'Service unavailable' }, 503))
			.mockResolvedValueOnce(jsonResponse({ addresses }));
		vi.stubGlobal('fetch', fetchMock);
		const onWaking = vi.fn();

		const pending = fetchWallets({ onWaking });
		await vi.advanceTimersByTimeAsync(20_000);

		expect(await pending).toHaveLength(4);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(onWaking).toHaveBeenCalledTimes(1);
	});

	it('should stop retrying as soon as the request is aborted', async () => {
		vi.useFakeTimers();
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'Service unavailable' }, 503));
		vi.stubGlobal('fetch', fetchMock);
		const controller = new AbortController();

		const pending = fetchWallets({ signal: controller.signal });
		const outcome = pending.catch((e: unknown) => e);
		await vi.advanceTimersByTimeAsync(1_000);
		controller.abort();
		await vi.advanceTimersByTimeAsync(60_000);

		expect(await outcome).toBeInstanceOf(Error);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('should give up at once on an error that will not fix itself', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'Upstream error' }, 500));
		vi.stubGlobal('fetch', fetchMock);

		await expect(fetchWallets()).rejects.toThrow(WALLET_LOAD_ERROR);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('should show the friendly error when no address is valid', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ addresses: { solana: 'nope' } })));
		await expect(fetchWallets()).rejects.toThrow(WALLET_LOAD_ERROR);
	});

	it('should show the friendly error when the response is not JSON', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 200 })));
		await expect(fetchWallets()).rejects.toThrow(WALLET_LOAD_ERROR);
	});

	it('should show the friendly error, not the browser one, when the network fails', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
		await expect(fetchWallets()).rejects.toThrow(WALLET_LOAD_ERROR);
	});
});

describe('generateQrDataUrls', () => {
	it('should draw dark codes on a light background', async () => {
		const wallets = parseWallets({ addresses });
		const urls = await generateQrDataUrls(wallets);

		expect(Object.keys(urls)).toEqual(['sol', 'eth', 'btc-taproot', 'btc-segwit']);
		expect(urls.sol).toMatch(/^data:image\/png;base64,/);
	});

	it('should skip a wallet whose code cannot be drawn and keep the rest', async () => {
		const [first, second] = parseWallets({ addresses });
		const broken = { ...second, address: undefined as unknown as string };
		const urls = await generateQrDataUrls([first, broken]);

		expect(Object.keys(urls)).toEqual(['sol']);
	});
});

describe('truncateAddress', () => {
	it('should keep the start and end of the address', () => {
		expect(truncateAddress('0x000000000000000000000000000000000000dEaD')).toBe('0x000000…00dEaD');
	});
});
