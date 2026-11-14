import { describe, it, expect } from 'vitest';
import { selectPrecache, isKeptOnceUsed } from './offline.ts';

const app = {
	build: ['/_app/immutable/entry/start.abc.js', '/_app/immutable/assets/0.def.css'],
	files: [
		'/fonts/inter-latin.woff2',
		'/fonts/inter-latin-ext.woff2',
		'/fonts/inter-cyrillic.woff2',
		'/fonts/plex-mono-400-latin.woff2',
		'/fonts/plex-mono-500-latin.woff2',
		'/fonts/plex-mono-500-vietnamese.woff2',
		'/icons/icon-192.png',
		'/icons/icon-512.png',
		'/manifest.webmanifest',
		'/pgp_key_icon.png',
		'/og-image.png',
		'/robots.txt',
		'/archive/old_pgp_key_icon_v2.png'
	],
	prerendered: [
		'/',
		'/encrypt',
		'/decrypt',
		'/sign',
		'/verify',
		'/generate',
		'/about',
		'/donate',
		'/sitemap.xml'
	]
};

describe('selectPrecache', () => {
	const kept = selectPrecache(app);

	it('should keep all of the built code and styles', () => {
		for (const path of app.build) {
			expect(kept).toContain(path);
		}
	});

	it('should keep every page', () => {
		for (const page of [
			'/',
			'/encrypt',
			'/decrypt',
			'/sign',
			'/verify',
			'/generate',
			'/about',
			'/donate'
		]) {
			expect(kept).toContain(page);
		}
	});

	it('should keep the Latin fonts and leave other alphabets to be fetched when needed', () => {
		expect(kept).toContain('/fonts/inter-latin.woff2');
		expect(kept).toContain('/fonts/plex-mono-400-latin.woff2');
		expect(kept).toContain('/fonts/plex-mono-500-latin.woff2');
		expect(kept).not.toContain('/fonts/inter-latin-ext.woff2');
		expect(kept).not.toContain('/fonts/inter-cyrillic.woff2');
		expect(kept).not.toContain('/fonts/plex-mono-500-vietnamese.woff2');
	});

	it('should keep what installing the app needs', () => {
		expect(kept).toContain('/manifest.webmanifest');
		expect(kept).toContain('/icons/icon-192.png');
		expect(kept).toContain('/icons/icon-512.png');
		expect(kept).toContain('/pgp_key_icon.png');
	});

	it('should leave out files the app itself never shows', () => {
		expect(kept).not.toContain('/sitemap.xml');
		expect(kept).not.toContain('/robots.txt');
		// Only apps that preview a shared link ever fetch this
		expect(kept).not.toContain('/og-image.png');
		expect(kept).not.toContain('/archive/old_pgp_key_icon_v2.png');
	});

	it('should list each file once', () => {
		const twice = selectPrecache({ ...app, build: [...app.build, ...app.build] });
		expect(twice).toHaveLength(new Set(twice).size);
	});
});

describe('isKeptOnceUsed', () => {
	it('should allow the fonts for other alphabets', () => {
		expect(isKeptOnceUsed('/fonts/inter-cyrillic.woff2')).toBe(true);
		expect(isKeptOnceUsed('/fonts/plex-mono-400-latin-ext.woff2')).toBe(true);
	});

	it('should never allow the wallet service or anything else', () => {
		expect(isKeptOnceUsed('/.netlify/functions/wallet-proxy')).toBe(false);
		expect(isKeptOnceUsed('/_app/version.json')).toBe(false);
		expect(isKeptOnceUsed('/fonts/../secret.woff2')).toBe(false);
		expect(isKeptOnceUsed('/anything-else')).toBe(false);
	});
});
