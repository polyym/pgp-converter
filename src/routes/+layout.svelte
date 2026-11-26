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

	// The top bar shows an Update button when a new service worker is waiting
	onMount(watchForUpdates);

	// The top bar unpins while an on-screen keyboard covers the page
	onMount(watchOnScreenKeyboard);

	// Prerendered pages cannot know their hostname, so the layout reads it on mount
	// to tell the released site from a test copy or a self-hosted copy
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
