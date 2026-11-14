<script lang="ts">
	import { previewOf } from '#lib/result-preview.ts';

	let {
		text,
		isProse = false
	}: {
		/** The whole result. Only its beginning is put on the page if it is very long. */
		text: string;
		/** Whether this is writing to be read, such as a message, and not a PGP block */
		isProse?: boolean;
	} = $props();

	const preview = $derived(previewOf(text));
	const count = (length: number) => length.toLocaleString('en-GB');
</script>

<!-- The note comes first, so that nobody takes the beginning for the whole -->
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
