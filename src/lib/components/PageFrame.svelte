<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { PageName } from '#lib/pages.ts';
	import { onScreenKeyboard } from '#lib/stores/on-screen-keyboard.svelte.ts';
	import NavBar from './NavBar.svelte';
	import PageFooter from './PageFooter.svelte';
	import TestAddressNotice from './TestAddressNotice.svelte';

	let {
		currentPage,
		hasActionBar = false,
		overlays,
		children
	}: {
		/** Passed to NavBar. Omit on pages with no link in the top bar, such as the error page. */
		currentPage?: PageName;
		/** Reserves bottom padding for the action bar, which is fixed to the bottom on phones */
		hasActionBar?: boolean;
		/** Modal dialogs, rendered outside <main> */
		overlays?: Snippet;
		children: Snippet;
	} = $props();
</script>

<!-- keyboard-open un-sticks the top bar while an on-screen keyboard is up (see .app.keyboard-open in app.css) -->
<div class={['app', { 'no-actions': !hasActionBar, 'keyboard-open': onScreenKeyboard.isOpen }]}>
	<NavBar {currentPage} />
	<TestAddressNotice />
	{@render overlays?.()}

	<main class="main tool" id="main" tabindex="-1">
		{@render children()}

		<PageFooter />
	</main>
</div>
