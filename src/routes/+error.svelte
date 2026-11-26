<script lang="ts">
	import { page } from '$app/state';
	import { PageFrame } from '#lib/components/index.ts';
</script>

<svelte:head>
	<title>PGP Converter: Error</title>
</svelte:head>

<PageFrame>
	<p class="status">{page.status}</p>
	<h1>
		{#if page.status === 404}
			There is no page at this address
		{:else}
			Something went wrong
		{/if}
	</h1>
	<!-- Chosen by status: with no handleError hook, page.error.message holds only
	     SvelteKit's defaults ("Not Found", "Internal Error") -->
	<p class="explanation">
		{#if page.status === 404}
			The link may be out of date, or the address may have been mistyped. The tools are all in the
			bar at the top.
		{:else}
			An unexpected error occurred. Nothing you typed was sent anywhere. Try again, or go back to
			the start.
		{/if}
	</p>
	<a href="/" class="home-btn">Go to the homepage</a>
</PageFrame>

<style>
	.status {
		margin: 0 0 12px;
		font-family: var(--mono);
		font-size: 13px;
		color: var(--text-dim);
	}

	h1 {
		margin: 0 0 16px;
		font-size: 32px;
		font-weight: 600;
		line-height: 1.2;
		letter-spacing: -1px;
		color: var(--text);
	}

	.explanation {
		margin: 0 0 28px;
		max-width: 520px;
		font-size: 16px;
		line-height: 1.65;
		color: var(--text-secondary);
	}

	.home-btn {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		padding: 12px 20px;
		font-size: 15px;
		font-weight: 600;
		color: #000;
		background: var(--text);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: background 0.15s ease;
	}

	.home-btn:hover {
		background: #e4e4e7;
	}
</style>
