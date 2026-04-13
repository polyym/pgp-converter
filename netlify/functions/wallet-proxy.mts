import type { Config, Context } from '@netlify/functions';

const API_URL = process.env.WALLET_API_URL;
const API_KEY = process.env.WALLET_API_KEY;

export default async (req: Request, context: Context) => {
  const path = context.params.path || '';
  const apiPath = path ? `/v1/wallets/${path}` : '/v1/wallets';

  try {
    const res = await fetch(`${API_URL}${apiPath}`, {
      headers: {
        'X-API-Key': API_KEY!,
        'Origin': req.headers.get('origin') || '',
      },
    });

    return new Response(await res.text(), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
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
