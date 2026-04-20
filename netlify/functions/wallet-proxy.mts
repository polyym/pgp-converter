import type { Config, Context } from '@netlify/functions';

const API_URL = process.env.WALLET_API_URL;
const API_KEY = process.env.WALLET_API_KEY;

const PATH_RE = /^[a-zA-Z0-9_\-\/]+$/;

export default async (req: Request, context: Context) => {
  if (!API_URL || !API_KEY) {
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const path = context.params.path || '';
  if (path && !PATH_RE.test(path)) {
    return new Response(JSON.stringify({ error: 'Invalid path' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const apiPath = path ? `/v1/wallets/${path}` : '/v1/wallets';

  try {
    const res = await fetch(`${API_URL}${apiPath}`, {
      headers: {
        'X-API-Key': API_KEY,
      },
    });

    const contentType = res.headers.get('content-type') ?? 'application/json';
    return new Response(await res.text(), {
      status: res.status,
      headers: { 'Content-Type': contentType },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config: Config = {
  path: ['/api/wallets', '/api/wallets/:path*'],
};
