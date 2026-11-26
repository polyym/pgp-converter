<script lang="ts">
	import { previewOf } from '#lib/result-preview.ts';

	let {
		text,
		isProse = false
	}: {
		/** The full result. Above RESULT_PREVIEW_CHARS only the start is rendered (see previewOf). */
		text: string;
		/** Plaintext to read, not an armoured block: body font and dir="auto" */
		isProse?: boolean;
	} = $props();

	const preview = $derived(previewOf(text));
	const count = (length: number) => length.toLocaleString('en-GB');
</script>

<!-- Before the text, so the truncation is read before the truncated result -->
{#if preview.isCut}
	<p class="cut-note">
		<strong>Only the beginning is shown.</strong>
		This result is {count(preview.length)} characters long, and the first {count(
			preview.shown.length
		)} are below. Copy and Download give all of it.
	</p>
{/if}
<pre
	class={isProse ? 'prose' : undefined}
	translate="no"
	dir={isProse ? 'auto' : undefined}>{preview.shown}</pre>

<style>
	.cut-note {
		margin: 0 0 14px;
		padding: 10px 12px;
		font-size: 13px;
		line-height: 1.5;
		color: var(--text-secondary);
		border: 1px solid var(--border-hover);
		border-radius: var(--radius-sm);
	}

	.cut-note strong {
		color: var(--text);
	}
</style>
