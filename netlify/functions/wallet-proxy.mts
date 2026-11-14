// Served at its default address, /.netlify/functions/wallet-proxy, and
// deliberately declares no custom `path`. The site is deployed with
// `netlify deploy --no-build`, where every function gets the same routing
// priority, and a function that claims "/*" then wins over a custom path here.
// That took the Donate page down in v3.3.1. The default address is always
// this function's alone.

/** The only upstream record this site may read; the proxy cannot be pointed anywhere else */
const ACCOUNT = 'pgp-converter';

/** Long enough for a sleeping upstream to wake within one request, short enough
 *  that a dead one cannot hold the function open; the page retries after a timeout */
const UPSTREAM_TIMEOUT_MS = 25_000;

const ADDRESS_FIELDS = ['solana', 'ethereum', 'bitcoin_taproot', 'bitcoin_native_segwit'] as const;

/** What the upstream answers while it is still waking up */
const WAKING_STATUSES: ReadonlySet<number> = new Set([502, 503, 504]);

/** Addresses change rarely, so the CDN may answer for five minutes and keep
 *  serving the previous answer for up to an hour while it refreshes in the
 *  background. Visitors then almost never wait for the upstream to wake up. */
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

/** Copies only the expected address fields out of the upstream response */
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
 * Returns this project's donation wallet addresses from the private wallet API.
 * The API key stays on the server, and the upstream record is fixed, so the
 * endpoint cannot be used to read anything else.
 * @param req - The incoming request; only GET is accepted
 * @returns The four addresses as JSON, or a JSON error with no upstream detail
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
			// While the upstream wakes, 503 tells the page to retry. Anything else will
			// not fix itself, so the page is told to stop.
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
		// Timed out or unreachable: treat as waking so the page retries
		return errorResponse('Service unavailable', 503);
	}
}
