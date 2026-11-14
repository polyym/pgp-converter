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
		/** The result to save or share */
		text: string;
		/** Name of the downloaded file */
		filename: string;
		/** What the result is, for screen readers: "encrypted message", "signed message" */
		what: string;
		/** Offer the device's share sheet. Off for decrypted text, which should not be one tap from another app. */
		canShare?: boolean;
	} = $props();

	// Sharing hands the text to the device's own share sheet; only phones and a
	// few desktop browsers have one. That is only known once the page is running.
	let hasShareSheet = $state(false);
	const canShare = $derived(isShareOffered && hasShareSheet);

	onMount(() => {
		hasShareSheet = canShareText();
	});

	async function share() {
		try {
			await navigator.share({ text });
		} catch {
			// Closing the share sheet without choosing anything is not an error
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
