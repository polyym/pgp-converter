const SITE_URL = 'https://pgp-converter.com';

const pages = [
	{ path: '/', priority: '1.0', changefreq: 'monthly' },
	{ path: '/encrypt', priority: '0.9', changefreq: 'monthly' },
	{ path: '/decrypt', priority: '0.9', changefreq: 'monthly' },
	{ path: '/generate', priority: '0.9', changefreq: 'monthly' },
	{ path: '/about', priority: '0.7', changefreq: 'monthly' },
	{ path: '/donate', priority: '0.5', changefreq: 'monthly' }
];

export async function GET() {
	const urlEntries = pages
		.map(
			(page) => `
  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
		)
		.join('');

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntries}
</urlset>`.trim();

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
}
