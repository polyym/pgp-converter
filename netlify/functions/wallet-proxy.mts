// Reached at its default address, /.netlify/functions/wallet-proxy, with no
// custom `path` in a config export. Under `netlify deploy --no-build` every
// function gets the same routing priority, so another function matching "/*"
// can shadow a custom path, but never the default address.
//
// Imports only node: modules, because the deploy jobs bundle this function
// without installing the project's packages (.github/workflows/deploy.yml) and
// any other import would be missing at runtime. src/lib/wallet-proxy.test.ts
// checks both rules.

// Fixed, so no request can make the proxy read another account's record
const ACCOUNT = 'pgp-converter';

// Long enough for a sleeping upstream to cold-start within one request, but
// bounded so an unresponsive one cannot hold the function open. A timeout
// answers 503, and the page retries.
const UPSTREAM_TIMEOUT_MS = 25_000;

const ADDRESS_FIELDS = ['solana', 'ethereum', 'bitcoin_taproot', 'bitcoin_native_segwit'] as const;

// What the upstream returns while it cold-starts
const WAKING_STATUSES: ReadonlySet<number> = new Set([502, 503, 504]);

// Addresses rarely change, so Netlify's CDN caches a good answer for five
// minutes and serves it stale for up to an hour while it revalidates in the
// background, and visitors rarely wait for a cold start. Browsers revalidate
// every time and leave the caching to the CDN.
const SUCCESS_HEADERS = {
	'Content-Type': 'application/json',
	'Cache-Control': 'public, max-age=0, must-revalidate',
	'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=300, stale-while-revalidate=3600'
};

function errorResponse(
	error: string,
	status: number,
	extraHeaders: Record<string, string> = {}
): Response {
	return Response.json(
		{ error },
		{
			status,
			headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders }
		}
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

// Copies the known address fields only, so nothing else in the upstream record
// reaches the browser. Returns null when none of them is present.
function pickAddresses(data: unknown): Record<string, string> | null {
	if (!isRecord(data) || !isRecord(data.addresses)) {
		return null;
	}

	const addresses: Record<string, string> = {};
	for (const field of ADDRESS_FIELDS) {
		const value = data.addresses[field];
		if (typeof value === 'string') {
			addresses[field] = value;
		}
	}
	return Object.keys(addresses).length > 0 ? addresses : null;
}

/**
 * Returns the project's donation addresses from the private wallet API as
 * `{ addresses }` JSON, keeping the API key on the server. Answers 405 to
 * anything but GET, and 503 while the upstream cold-starts, times out or cannot
 * be reached. Answers 500 when the proxy is not configured, the upstream returns
 * any other error, or its body holds no address. Error bodies never include
 * upstream detail.
 */
export default async function walletProxy(req: Request): Promise<Response> {
	if (req.method !== 'GET') {
		return errorResponse('Method not allowed', 405, { Allow: 'GET' });
	}

	const apiUrl = process.env.WALLET_API_URL;
	const apiKey = process.env.WALLET_API_KEY;
	if (!apiUrl || !apiKey) {
		return errorResponse('Service not configured', 500);
	}

	try {
		const res = await fetch(`${apiUrl}/v1/wallets/${ACCOUNT}`, {
			headers: { 'X-API-Key': apiKey },
			signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
		});

		if (!res.ok) {
			// The page retries on 503 and gives up on 500, so only cold-start statuses map to 503
			return WAKING_STATUSES.has(res.status)
				? errorResponse('Service unavailable', 503)
				: errorResponse('Upstream error', 500);
		}

		const data: unknown = await res.json().catch(() => null);
		const addresses = pickAddresses(data);
		if (!addresses) {
			return errorResponse('Unexpected upstream response', 500);
		}

		return Response.json({ addresses }, { status: 200, headers: SUCCESS_HEADERS });
	} catch {
		// Timed out or unreachable: treat it as a cold start so the page retries
		return errorResponse('Service unavailable', 503);
	}
}
