<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon.svelte';

	let {
		q,
		children
	}: {
		/** The question, as someone would ask it */
		q: string;
		/** The answer, as one or more paragraphs */
		children: Snippet;
	} = $props();
</script>

<details class="question">
	<summary>
		<h3>{q}</h3>
		<Icon name="chevron" size={12} strokeWidth={2} class="chevron" />
	</summary>
	<div class="answer">
		{@render children()}
	</div>
</details>

<style>
	.question + :global(.question) {
		border-top: 1px solid var(--border);
	}

	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 52px;
		padding: 12px 18px;
		cursor: pointer;
		list-style: none;
		transition: background 0.15s ease;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary:hover {
		background: var(--surface-2);
	}

	summary:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: -2px;
	}

	h3 {
		margin: 0;
		font-size: 14px;
		font-weight: 500;
		line-height: 1.5;
		color: var(--text);
	}

	summary :global(.chevron) {
		color: var(--text-secondary);
		flex-shrink: 0;
		transition: transform 0.2s ease;
	}

	.question[open] summary :global(.chevron) {
		transform: rotate(90deg);
	}

	/* As wide as the "How to" panel above, so the two read as one block */
	.answer {
		padding: 0 18px 16px;
	}

	/* The answer's paragraphs are written on the page that uses this component */
	.answer :global(p) {
		margin: 0 0 10px;
		font-size: 14px;
		line-height: 1.7;
		color: var(--text-secondary);
	}

	.answer :global(p:last-child) {
		margin-bottom: 0;
	}

	.answer :global(ul) {
		margin: 0 0 10px;
		padding-left: 20px;
	}

	.answer :global(li) {
		margin-bottom: 6px;
		font-size: 14px;
		line-height: 1.7;
		color: var(--text-secondary);
	}

	.answer :global(strong) {
		color: var(--text);
		font-weight: 500;
	}

	.answer :global(a) {
		color: var(--text);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.answer :global(a:hover) {
		color: var(--success);
	}

	.answer :global(code) {
		font-family: var(--mono);
		font-size: 12px;
		color: var(--text);
		background: var(--surface-2);
		padding: 1px 4px;
		border-radius: 4px;
		overflow-wrap: anywhere;
	}

	@media (prefers-reduced-motion: reduce) {
		summary :global(.chevron) {
			transition: none;
		}
	}
</style>
