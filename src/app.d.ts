// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	/**
	 * The full hash of the commit this build was made from, written in by the
	 * build (see vite.config.ts). Empty for a build that was not given one.
	 */
	const __BUILD_COMMIT__: string;

	/** The version of OpenPGP.js in this build, written in by the build */
	const __OPENPGP_VERSION__: string;

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
}

declare module 'svelte/elements' {
	// The HTML standard allows autocorrect on every element that takes text;
	// Svelte's types know it on <input> only
	interface HTMLTextareaAttributes {
		autocorrect?: 'on' | 'off' | '' | undefined | null;
	}
}

export {};
