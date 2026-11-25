import { redirect } from '@sveltejs/kit';

/**
 * Redirects /help to /about, which was called Help until v3.0. Prerendering
 * writes this as a help.html that forwards old links on hosts without the
 * netlify.toml redirect, such as the Docker image.
 */
export function load() {
	redirect(301, '/about');
}
