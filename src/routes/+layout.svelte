<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { watchForUpdates } from '#lib/stores/app-update.svelte.ts';
	import { watchOnScreenKeyboard } from '#lib/stores/on-screen-keyboard.svelte.ts';
	import { readSiteAddress } from '#lib/stores/site-address.svelte.ts';
	import { crossFade } from '#lib/page-transition.ts';

	let { children }: { children: Snippet } = $props();

	// The app keeps a copy of itself on the device so it opens offline. When a
	// newer version has been fetched, the top bar offers to switch to it.
	onMount(watchForUpdates);

	// A phone's keyboard leaves little of the page in view. While it is open,
	// the top bar scrolls away with the page instead of staying pinned.
	onMount(watchOnScreenKeyboard);

	// On a test copy (the staging address, a preview, the development server)
	// the app says so under the top bar and shows its version as a candidate's.
	// Only the browser knows which address it was opened at.
	onMount(readSiteAddress);

	onNavigate(crossFade);
</script>

{@render children()}

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		background: #09090b;
	}
</style>
