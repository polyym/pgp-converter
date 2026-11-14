<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon.svelte';

	let {
		kind,
		value,
		isCopied,
		onCopy,
		onDownload,
		children
	}: {
		kind: 'public' | 'private';
		/** The key, as armoured text */
		value: string;
		/** Whether the key has just been copied, so the button can say so */
		isCopied: boolean;
		onCopy: () => void;
		onDownload: () => void;
		/** Anything to say under the key */
		children?: Snippet;
	} = $props();

	const name = $derived(kind === 'public' ? 'Public' : 'Private');
</script>

<div class="key-section">
	<div class="key-header">
		<span class="key-label">{name} Key</span>
		<div class="key-actions">
			<button
				class="action-btn"
				onclick={onCopy}
				aria-label={isCopied ? `Copied ${kind} key` : `Copy ${kind} key`}
			>
				{#if isCopied}
					<Icon name="check" size={14} strokeWidth={2} />
					Copied
				{:else}
					<Icon name="copy" size={14} strokeWidth={2} />
					Copy
				{/if}
			</button>
			<button class="action-btn" onclick={onDownload} aria-label="Download {kind} key">
				<Icon name="download" size={14} strokeWidth={2} />
				Download
			</button>
		</div>
	</div>
	<!-- A box that scrolls has to take keyboard focus, or it cannot be scrolled without a mouse -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<pre
		class="key-content"
		translate="no"
		tabindex="0"
		role="group"
		aria-label="{name} key, as text">{value}</pre>
	{@render children?.()}
</div>

<style>
	.key-section {
		display: flex;
		flex-direction: column;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		overflow: hidden;
	}

	.key-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border);
	}

	.key-label {
		font-size: 13px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--text-secondary);
	}

	.key-actions {
		display: flex;
		gap: 8px;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 36px;
		padding: 0 12px;
		font-family: var(--font);
		font-size: 13px;
		font-weight: 500;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-btn:hover {
		color: var(--text);
		border-color: var(--border-hover);
	}

	.key-content {
		margin: 0;
		padding: 16px;
		font-family: var(--mono);
		font-size: 11px;
		line-height: 1.5;
		color: var(--text-secondary);
		word-break: break-all;
		white-space: pre-wrap;
		max-height: 150px;
		overflow-y: auto;
	}

	/* Fingers need a larger target than a mouse pointer does */
	@media (pointer: coarse) {
		.action-btn {
			min-height: 44px;
		}
	}

	/* On a phone the two keys run to more than a screen. Each box is shorter, and
     what is said about a key comes before its text, so that the reminder to save
     the private key is seen without scrolling. */
	@media (max-width: 720px) {
		.key-content {
			order: 1;
			max-height: 96px;
			font-size: 12px;
		}

		.key-section :global(.output-note) {
			border-top: none;
			border-bottom: 1px solid var(--border);
		}
	}
</style>
