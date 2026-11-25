<script lang="ts">
	import Icon from '../Icon.svelte';

	let {
		message,
		onDismiss
	}: {
		/** An empty string hides the notice */
		message: string;
		onDismiss: () => void;
	} = $props();
</script>

<!-- No auto-dismiss: the notice reports something that happened while the user
     was away (the idle timeout clearing the form), so it waits for them -->
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

	@media (pointer: coarse) {
		button {
			min-height: 44px;
		}
	}
</style>
