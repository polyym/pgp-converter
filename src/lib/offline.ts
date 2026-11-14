// Only files that are part of the app are ever kept: nothing a visitor types,
// pastes or generates goes near this.

/** What the page sends the waiting version of the app when the visitor presses Update */
export const ACTIVATE_UPDATE_MESSAGE = 'activate-update';

export interface AppFiles {
	/** Code and styles produced by the build */
	build: readonly string[];
	/** Everything in the static folder */
	files: readonly string[];
	/** Pages and endpoints rendered at build time */
	prerendered: readonly string[];
}

/** Fonts for the Latin alphabet, which every page uses */
const CORE_FONT = /^\/fonts\/[a-z0-9-]+-latin\.woff2$/;
/** Any of the app's font files */
const ANY_FONT = /^\/fonts\/[a-z0-9-]+\.woff2$/;
/** Static files the app needs to look right and to be installed */
const CORE_STATIC = /^\/(?:icons\/[a-z0-9-]+\.png|manifest\.webmanifest|pgp_key_icon\.png)$/;
/** A page address: no file extension */
const PAGE = /^\/[a-z0-9/-]*$/;

/**
 * Lists the files to fetch and keep when the app is first opened
 * @param app - The app's files, as SvelteKit reports them to the service worker
 * @returns The paths needed to run every page offline, without duplicates
 */
export function selectPrecache(app: AppFiles): string[] {
	const pages = app.prerendered.filter((path) => PAGE.test(path));
	// Left out: fonts for other alphabets (fetched if a page ever needs them),
	// old icons kept for the record, and files only search engines read
	const statics = app.files.filter((path) => CORE_FONT.test(path) || CORE_STATIC.test(path));
	return [...new Set([...app.build, ...pages, ...statics])];
}

/**
 * Says whether a file that was not fetched up front may be kept once it has been used
 * @param pathname - The path of a request to this site
 * @returns True for the app's remaining font files and nothing else
 */
export function isKeptOnceUsed(pathname: string): boolean {
	return ANY_FONT.test(pathname);
}
