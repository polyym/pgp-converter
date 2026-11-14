import { SITE_URL } from '#lib/constants.ts';
import { getBuildTime } from '#lib/server/build-time.ts';

export const prerender = true;

interface SitemapPage {
	path: string;
	priority: string;
	changefreq: string;
}

const PAGES: readonly SitemapPage[] = [
	{ path: '/', priority: '1.0', changefreq: 'monthly' },
	{ path: '/encrypt', priority: '0.9', changefreq: 'monthly' },
	{ path: '/decrypt', priority: '0.9', changefreq: 'monthly' },
	{ path: '/sign', priority: '0.9', changefreq: 'monthly' },
	{ path: '/verify', priority: '0.9', changefreq: 'monthly' },
	{ path: '/generate', priority: '0.9', changefreq: 'monthly' },
	{ path: '/about', priority: '0.7', changefreq: 'monthly' },
	{ path: '/donate', priority: '0.5', changefreq: 'monthly' }
];

/**
 * Writes the sitemap. Crawlers use the date on each page to decide what to
 * read again; it is the time of the build.
 * @returns The sitemap, as XML
 */
export function GET(): Response {
	const lastModified = new Date(getBuildTime()).toISOString();
	const urlEntries = PAGES.map(
		(page) => `
  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
	).join('');

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
