// Precache rules for the service worker. It caches only the app's own files,
// never anything a visitor types, pastes or generates.

/**
 * Posted to the waiting service worker when the visitor presses Update; the
 * worker then calls skipWaiting()
 */
export const ACTIVATE_UPDATE_MESSAGE = 'activate-update';

/** The app's file lists as SvelteKit gives them to the service worker, as paths from the root */
export interface AppFiles {
	/** Code and styles produced by the build */
	build: readonly string[];
	/** Everything in the static folder */
	files: readonly string[];
	/** Pages and endpoints rendered at build time */
	prerendered: readonly string[];
}

/** Latin font subsets, which every page uses */
const CORE_FONT = /^\/fonts\/[a-z0-9-]+-latin\.woff2$/;
const ANY_FONT = /^\/fonts\/[a-z0-9-]+\.woff2$/;
/** Icons and the web app manifest, needed to render the app and to install it */
const CORE_STATIC = /^\/(?:icons\/[a-z0-9-]+\.png|manifest\.webmanifest|pgp_key_icon\.png)$/;
/** A page path has no file extension, unlike /sitemap.xml */
const PAGE = /^\/[a-z0-9/-]*$/;

/**
 * Returns the paths the service worker precaches on install, without
 * duplicates: all build output, every prerendered page, the Latin fonts, the
 * icons and the manifest. That is enough to run every page offline.
 */
export function selectPrecache(app: AppFiles): string[] {
	const pages = app.prerendered.filter((path) => PAGE.test(path));
	// Leaves out non-Latin font subsets (cached on first use instead), archived
	// icons and files that only crawlers read
	const statics = app.files.filter((path) => CORE_FONT.test(path) || CORE_STATIC.test(path));
	return [...new Set([...app.build, ...pages, ...statics])];
}

/**
 * Returns true for the paths the service worker may also cache on first use,
 * beyond those it precaches: the app's font files, and nothing else.
 */
export function isKeptOnceUsed(pathname: string): boolean {
	return ANY_FONT.test(pathname);
}
