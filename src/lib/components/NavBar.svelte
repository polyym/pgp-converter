<script lang="ts">
	import { TOOL_LINKS, type PageName } from '#lib/pages.ts';
	import { appUpdate } from '#lib/stores/app-update.svelte.ts';
	import Icon from './Icon.svelte';

	let {
		currentPage
	}: {
		/** Its link gets aria-current="page". Omit on pages with no link here, such as the error page. */
		currentPage?: PageName;
	} = $props();

	// Focus <main> from script instead of relying on the #main fragment, so a
	// repeat press still works and the URL gains no fragment. Without JavaScript
	// the href still jumps to the content.
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

	// The sticky bar wraps to two rows on phones, so its height varies. app.css
	// reads --nav-height for scroll-padding-top, the toast and the sticky result
	// column, so that none of them ends up underneath the bar.
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

		<!-- Shown once a new service worker is waiting. Activating it reloads the
		     page, so the switch waits for a click. -->
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
