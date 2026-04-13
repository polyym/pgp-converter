<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>Error - PGP Converter</title>
</svelte:head>

<div class="error-page">
	<div class="error-container">
		<div class="error-code">
			<span>{page.status}</span>
		</div>
		<h1>
			{#if page.status === 404}
				Page Not Found
			{:else}
				Something went wrong
			{/if}
		</h1>
		<p>
			{#if page.error?.message}
				{page.error.message}
			{:else if page.status === 404}
				The page you're looking for doesn't exist.
			{:else}
				An unexpected error occurred.
			{/if}
		</p>
		<a href="/" class="home-btn">Go Home</a>
	</div>
</div>

<style>
	.error-page {
		min-height: 100vh;
		background: var(--bg, #09090b);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	}

	.error-container {
		max-width: 420px;
		width: 100%;
		text-align: center;
	}

	.error-code {
		margin-bottom: 32px;
	}

	.error-code span {
		font-size: 3.75rem;
		font-weight: 700;
		color: var(--error, #ef4444);
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text, #fafafa);
		margin: 0 0 16px;
	}

	p {
		color: var(--text-secondary, #71717a);
		margin: 0 0 32px;
		font-size: 15px;
		line-height: 1.5;
	}

	.home-btn {
		display: inline-block;
		padding: 12px 24px;
		background: var(--surface-2, #16161a);
		color: var(--text, #fafafa);
		font-weight: 500;
		font-size: 14px;
		border-radius: 10px;
		text-decoration: none;
		border: 1px solid var(--border, #1f1f24);
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.home-btn:hover {
		background: var(--border, #1f1f24);
		border-color: var(--border-hover, #2a2a30);
	}

	.home-btn:active {
		transform: scale(0.98);
	}
</style>
