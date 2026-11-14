<script lang="ts">
	import { TOOL_LINKS, type PageName } from '#lib/pages.ts';
	import { appUpdate } from '#lib/stores/app-update.svelte.ts';
	import Icon from './Icon.svelte';

	let {
		currentPage
	}: {
		/** The page being shown; leave out where no entry should be marked */
		currentPage?: PageName;
	} = $props();

	// Moves keyboard focus to the page's content. Done here, not left to the
	// link's address alone, so that it works every time it is used and leaves the
	// address bar as it was. Without scripts the link still jumps to the content.
	function skipToContent(e: MouseEvent) {
		const main = document.getElementById('main');
		if (!main) {
			return;
		}
		e.preventDefault();
		main.focus();
		main.scrollIntoView();
	}

	let height = $state(0);

	// The bar is pinned to the top and is taller on phones, where it has two rows.
	// Publishing its real height lets anchor jumps, floating messages and the
	// sticky result panel stop below it instead of underneath it.
	$effect(() => {
		if (height) {
			document.documentElement.style.setProperty('--nav-height', `${String(height)}px`);
		}
	});
</script>

<a class="skip-link" href="#main" onclick={skipToContent}>Skip to content</a>

<header class="nav" bind:offsetHeight={height}>
	<div class="nav-inner">
		<a href="/" class="nav-brand" aria-current={currentPage === 'home' ? 'page' : undefined}>
			<span class="nav-logo"><Icon name="generate" size={16} /></span>
			PGP Converter
		</a>

		<nav class="nav-tools" aria-label="Tools">
			{#each TOOL_LINKS as item (item.href)}
				<a
					href={item.href}
					class="nav-link"
					aria-current={currentPage === item.page ? 'page' : undefined}
				>
					<Icon name={item.page} size={15} />
					{item.label}
				</a>
			{/each}
		</nav>

		<!-- Appears only when a newer version of the app has been fetched. Switching
         reloads the page, so it waits for the visitor to ask. -->
		{#if appUpdate.isReady}
			<button
				type="button"
				class="nav-update"
				onclick={() => {
					appUpdate.apply();
				}}
				disabled={appUpdate.isBusy}
				aria-busy={appUpdate.isBusy}
				title="A new version is ready. Updating reloads the page and clears anything on it."
			>
				<Icon name="refresh" size={14} strokeWidth={2} />
				<span class="nav-update-short">{appUpdate.isBusy ? 'Updating…' : 'Update'}</span>
				<span class="nav-update-long"
					>{appUpdate.isBusy ? 'Updating…' : 'A new version is ready. Update'}</span
				>
				<span class="sr-only">Updating reloads the page and clears anything on it.</span>
			</button>
		{/if}

		<nav class="nav-more" aria-label="About this site">
			<a href="/about" class="nav-link" aria-current={currentPage === 'about' ? 'page' : undefined}
				>About</a
			>
			<a
				href="/donate"
				class="nav-link"
				aria-current={currentPage === 'donate' ? 'page' : undefined}>Donate</a
			>
		</nav>
	</div>
</header>
