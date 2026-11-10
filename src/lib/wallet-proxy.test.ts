import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as walletProxy from '../../netlify/functions/wallet-proxy.mjs';

const handler = walletProxy.default;
const DEFAULT_ADDRESS = '/.netlify/functions/wallet-proxy';

const API_URL = 'https://wallets.example';
const upstreamBody = {
	name: 'PGP-Converter',
	internal_note: 'must not be forwarded',
	addresses: {
		solana: 'So11111111111111111111111111111111111111112',
		ethereum: '0x000000000000000000000000000000000000dEaD',
		bitcoin_taproot: 'bc1p' + 'q'.repeat(58),
		bitcoin_native_segwit: 'bc1q' + 'q'.repeat(38),
		unexpected_chain: 'must not be forwarded'
	}
};

function upstream(body: unknown, status = 200): Response {
	return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
}

const request = (path = DEFAULT_ADDRESS, method = 'GET') =>
	new Request(`https://pgp-converter.com${path}`, { method });

beforeEach(() => {
	vi.stubEnv('WALLET_API_URL', API_URL);
	vi.stubEnv('WALLET_API_KEY', 'test-key');
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('wallet proxy', () => {
	it('should keep its default address by declaring no custom path', () => {
		// A custom path is shadowed by the page-rendering function's "/*" when the
		// site is deployed with --no-build; see the note in the function's file
		const { config } = walletProxy as { config?: { path?: unknown } };
		expect(config?.path).toBeUndefined();
	});

	it('should always read the same upstream record, whatever was requested', async () => {
		const fetchMock = vi.fn().mockResolvedValue(upstream(upstreamBody));
		vi.stubGlobal('fetch', fetchMock);

		await handler(request(`${DEFAULT_ADDRESS}/someone-else`));
		await handler(request(`${DEFAULT_ADDRESS}?account=someone-else`));

		for (const call of fetchMock.mock.calls) {
			expect(call[0]).toBe(`${API_URL}/v1/wallets/pgp-converter`);
			expect(call[1].headers['X-API-Key']).toBe('test-key');
		}
	});

	it('should forward only the four expected addresses', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstream(upstreamBody)));

		const res = await handler(request());
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			addresses: {
				solana: upstreamBody.addresses.solana,
				ethereum: upstreamBody.addresses.ethereum,
				bitcoin_taproot: upstreamBody.addresses.bitcoin_taproot,
				bitcoin_native_segwit: upstreamBody.addresses.bitcoin_native_segwit
			}
		});
	});

	it('should let the CDN cache a good answer but never an error', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstream(upstreamBody)));
		const ok = await handler(request());
		expect(ok.headers.get('Netlify-CDN-Cache-Control')).toContain('s-maxage=');

		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstream({ error: 'nope' }, 500)));
		const failed = await handler(request());
		expect(failed.headers.get('Cache-Control')).toBe('no-store');
		expect(failed.headers.get('Netlify-CDN-Cache-Control')).toBeNull();
	});

	it('should reject anything but GET without calling the upstream', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		const res = await handler(request(DEFAULT_ADDRESS, 'POST'));
		expect(res.status).toBe(405);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('should answer 500 when it is not configured', async () => {
		vi.stubEnv('WALLET_API_KEY', '');
		const res = await handler(request());
		expect(res.status).toBe(500);
	});

	it('should answer 503 while the upstream is waking so the page retries', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstream('waking', 503)));
		expect((await handler(request())).status).toBe(503);

		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timed out')));
		expect((await handler(request())).status).toBe(503);
	});

	it('should answer 500, without the upstream body, for errors that will not fix themselves', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstream('secret upstream detail', 401)));

		const res = await handler(request());
		expect(res.status).toBe(500);
		expect(await res.text()).not.toContain('secret upstream detail');
	});

	it('should answer 500 when the upstream response is not the expected shape', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstream('<html>not json</html>')));
		expect((await handler(request())).status).toBe(500);

		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstream({ name: 'x' })));
		expect((await handler(request())).status).toBe(500);
	});
});
