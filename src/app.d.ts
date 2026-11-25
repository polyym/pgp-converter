declare global {
	/**
	 * The full commit hash the build was made from, replaced at build time by
	 * Vite's `define` (vite.config.ts). Empty unless GITHUB_SHA held a full hash.
	 */
	const __BUILD_COMMIT__: string;

	/** The installed OpenPGP.js version, replaced at build time by Vite's `define` */
	const __OPENPGP_VERSION__: string;
}

declare module 'svelte/elements' {
	// The HTML standard allows autocorrect on any editable element, but Svelte's
	// types declare it only on <input>.
	interface HTMLTextareaAttributes {
		autocorrect?: 'on' | 'off' | '' | undefined | null;
	}
}

export {};
