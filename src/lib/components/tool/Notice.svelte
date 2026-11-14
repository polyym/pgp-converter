<script lang="ts">
	import Icon from '../Icon.svelte';

	let {
		message,
		onDismiss
	}: {
		/** What to tell the user; nothing is shown while this is empty */
		message: string;
		onDismiss: () => void;
	} = $props();
</script>

<!-- Stays until it is dismissed: it explains something that happened while the
     user was away, so it must still be there when they come back -->
<div role="status">
	{#if message}
		<div class="notice">
			<Icon name="clock" strokeWidth={1.75} />
			<p>{message}</p>
			<button type="button" onclick={onDismiss}>Dismiss</button>
		</div>
	{/if}
</div>

<style>
	.notice {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 20px;
		padding: 12px 14px;
		color: var(--text-secondary);
		background: var(--surface);
		border: 1px solid var(--border-hover);
		border-radius: var(--radius-lg);
	}

	.notice :global(svg) {
		flex-shrink: 0;
	}

	p {
		flex: 1;
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
		color: var(--text);
	}

	button {
		min-height: 32px;
		padding: 4px 12px;
		font-family: var(--font);
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary);
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 999px;
		cursor: pointer;
		flex-shrink: 0;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
	}

	button:hover {
		color: var(--text);
		border-color: var(--border-hover);
	}

	/* Fingers need a larger target than a mouse pointer does */
	@media (pointer: coarse) {
		button {
			min-height: 44px;
		}
	}
</style>
