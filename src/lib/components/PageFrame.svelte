<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { PageName } from '#lib/pages.ts';
	import { onScreenKeyboard } from '#lib/stores/on-screen-keyboard.svelte.ts';
	import NavBar from './NavBar.svelte';
	import PageFooter from './PageFooter.svelte';

	let {
		currentPage,
		hasActionBar = false,
		overlays,
		children
	}: {
		/** The page being shown; leave out where no entry in the top bar should be marked */
		currentPage?: PageName;
		/** Whether the page has a bar of actions, which on a phone is pinned to the bottom and needs room */
		hasActionBar?: boolean;
		/** Dialogs that cover the page, kept outside its content */
		overlays?: Snippet;
		children: Snippet;
	} = $props();
</script>

<!-- The same frame on every page, so that moving between them changes only the
     content. While a phone's keyboard is over the page, the top bar gives up its
     place (see app.css). -->
<div class={['app', { 'no-actions': !hasActionBar, 'keyboard-open': onScreenKeyboard.isOpen }]}>
	<NavBar {currentPage} />
	{@render overlays?.()}

	<main class="main tool" id="main" tabindex="-1">
		{@render children()}

		<PageFooter />
	</main>
</div>
