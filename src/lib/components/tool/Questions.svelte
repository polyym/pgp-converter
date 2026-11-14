<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		children
	}: {
		/** Heading for the section, naming what the questions are about */
		title: string;
		/** The Question components */
		children: Snippet;
	} = $props();
</script>

<!-- Answers to what people ask about the tool above. Closed by default, so the
     page stays short for those who only came to use it. -->
<section class="questions">
	<h2>{title}</h2>
	<div class="questions-list">
		{@render children()}
	</div>
</section>

<style>
	.questions {
		margin-top: 32px;
	}

	h2 {
		margin: 0 0 12px;
		padding-left: 2px;
		font-size: 15px;
		font-weight: 600;
		color: var(--text);
	}

	.questions-list {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}
</style>
