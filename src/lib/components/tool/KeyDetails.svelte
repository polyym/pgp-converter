<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { KeyInfo } from '#lib/keys.ts';

	let {
		title,
		keys,
		hint = '',
		children
	}: {
		/** What the keys are being used for, for example "Encrypting to" */
		title: string;
		keys: KeyInfo[];
		/** Advice shown under the list */
		hint?: string;
		/** Controls shown at the foot of the panel */
		children?: Snippet;
	} = $props();
</script>

<!-- The place is in the page before any key is: a screen reader announces a
     change to a region it already knew about, and may pass over one that
     arrives together with its text -->
<div class="live" role="status">
	{#if keys.length > 0}
		<div class="key-details">
			<p class="key-details-title">{title}</p>
			<ul translate="no">
				{#each keys as key (key.fingerprint)}
					<li class={{ problem: !!key.problem }}>
						<span class="key-name" dir="auto">{key.userIDs.join(', ') || 'Key with no name'}</span>
						<span class="key-meta">{key.algorithm}, created {key.created}</span>
						<code class="key-fingerprint">{key.fingerprint}</code>
						{#if key.problem}
							<span class="key-problem">{key.problem}</span>
						{/if}
					</li>
				{/each}
			</ul>
			{#if hint}
				<p class="key-details-hint">{hint}</p>
			{/if}
			{@render children?.()}
		</div>
	{/if}
</div>

<style>
	.key-details {
		padding: 12px 14px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
	}

	/* Inside an option the panel sits on that option's surface */
	:global(.option) .key-details {
		background: var(--bg);
	}

	.key-details-title {
		margin: 0 0 8px;
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--text-secondary);
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	li {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.key-name {
		font-size: 14px;
		font-weight: 500;
		color: var(--text);
		overflow-wrap: anywhere;
	}

	.key-meta {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.key-fingerprint {
		font-family: var(--mono);
		font-size: 12px;
		color: var(--text-secondary);
		overflow-wrap: anywhere;
	}

	.key-problem {
		font-size: 13px;
		color: var(--error);
	}

	li.problem .key-name {
		color: var(--error);
	}

	.key-details-hint {
		margin: 10px 0 0;
		font-size: 12px;
		line-height: 1.5;
		color: var(--text-secondary);
	}
</style>
