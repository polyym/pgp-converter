<script lang="ts">
	import { onMount } from 'svelte';
	import { downloadText } from '#lib/download.ts';
	import { canShareText } from '#lib/text-entry.ts';
	import Icon from '../Icon.svelte';

	let {
		text,
		filename,
		what,
		canShare: isShareOffered = true
	}: {
		text: string;
		/** Download filename */
		filename: string;
		/** Completes the buttons' aria-labels, for example "encrypted message" */
		what: string;
		/**
		 * Offers the Web Share API where the browser has it. Pass false for
		 * plaintext, so a decrypted message is not one tap from another app.
		 */
		canShare?: boolean;
	} = $props();

	// Web Share support is only known in the browser. Starting false keeps the
	// hydrated markup the same as the prerendered HTML.
	let hasShareSheet = $state(false);
	const canShare = $derived(isShareOffered && hasShareSheet);

	onMount(() => {
		hasShareSheet = canShareText();
	});

	async function share() {
		try {
			await navigator.share({ text });
		} catch {
			// Rejects with AbortError when the user closes the share sheet, which is not a failure
		}
	}
</script>

{#if canShare}
	<button
		type="button"
		class="copy-btn"
		onclick={() => {
			void share();
		}}
		aria-label="Share the {what}"
	>
		<Icon name="share" size={14} strokeWidth={2} />
		Share
	</button>
{/if}
<button
	type="button"
	class="copy-btn"
	onclick={() => {
		downloadText(text, filename);
	}}
	aria-label="Download the {what}"
>
	<Icon name="download" size={14} strokeWidth={2} />
	Download
</button>
