<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ToolPage } from '#lib/stores/tool-page.svelte.ts';
	import Icon from '../Icon.svelte';
	import OutputTools from './OutputTools.svelte';

	let {
		tool,
		label,
		heading = 'Output',
		filename,
		what,
		canShare = true,
		copyText = 'Copy',
		tone,
		isVerdictFirst = false,
		staleWithheld,
		staleAccepted,
		children
	}: {
		tool: ToolPage;
		/** What the panel holds, for screen readers: "Encrypted message" */
		label: string;
		/** The word above the result */
		heading?: string;
		/** Name of the file a download of the result gets */
		filename: string;
		/** What the result is, for screen readers: "encrypted message" */
		what: string;
		/** Offer the device's share sheet. Off for readable text, which should not be one tap from another app. */
		canShare?: boolean;
		/** The wording on the Copy button */
		copyText?: string;
		/** How the result in the panel turned out; leave out while there is none */
		tone?: 'good' | 'bad' | 'caution';
		/** Whether a signature verdict comes straight after the heading */
		isVerdictFirst?: boolean;
		/** What to say of an out-of-date result while its buttons are put away */
		staleWithheld: string;
		/** What to say of it once the user has asked for it as it is */
		staleAccepted: string;
		/** The result itself, or what to do while there is none */
		children: Snippet;
	} = $props();

	const isStale = $derived(tool.isResultStale);
</script>

<div
	class={[
		'output',
		{
			'verdict-first': isVerdictFirst,
			'has-content': tone === 'good' && !isStale,
			bad: tone === 'bad' && !isStale,
			caution: tone === 'caution' && !isStale,
			stale: isStale
		}
	]}
	bind:this={tool.resultElement}
	tabindex="-1"
	role="region"
	aria-label={label}
>
	<div class="output-header">
		<span>{heading}</span>
		{#if tool.resultText && !tool.isResultWithheld}
			<div class="output-tools">
				<OutputTools text={tool.resultText} {filename} {what} {canShare} />
				<button
					class="copy-btn"
					onclick={() => {
						void tool.copyResult();
					}}
				>
					{#if tool.isCopied}
						<Icon name="check" size={14} strokeWidth={2} />
						Copied
					{:else}
						<Icon name="copy" size={14} strokeWidth={2} />
						{copyText}
						{#if tool.areHintsVisible}<kbd>{tool.keys.copyHint}</kbd>{/if}
					{/if}
				</button>
			</div>
		{/if}
	</div>
	<!-- Stays in the page while there is nothing to say, so that a screen reader hears it when there is -->
	<div class="live" role="status">
		{#if isStale}
			<p class="stale-note">
				<span>
					<strong>Out of date.</strong>
					{tool.isResultWithheld ? staleWithheld : staleAccepted}
				</span>
				<!-- Still wanted as it is, perhaps after a stray key press in a box: one deliberate press brings its buttons back -->
				{#if tool.isResultWithheld}
					<button
						type="button"
						onclick={() => {
							void tool.useStaleResult();
						}}>Use it anyway</button
					>
				{/if}
			</p>
		{/if}
	</div>
	{@render children()}
</div>
