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
		/** aria-label of the region, for example "Encrypted message" */
		label: string;
		heading?: string;
		/** Download filename */
		filename: string;
		/** Completes the buttons' aria-labels, for example "encrypted message" */
		what: string;
		/** Offers the Web Share API. Pass false for plaintext, as for OutputTools. */
		canShare?: boolean;
		/** Copy button label */
		copyText?: string;
		/** Colours the panel's border. Omit while there is no result; ignored while the result is stale. */
		tone?: 'good' | 'bad' | 'caution';
		/** Set when a SignatureVerdict comes straight after the header, to drop its top border */
		isVerdictFirst?: boolean;
		/** Stale-result note while Copy, Download and Share are hidden */
		staleWithheld: string;
		/** Stale-result note after the user presses "Use it anyway" */
		staleAccepted: string;
		/** The result, or placeholder steps while there is none */
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
	<!-- Live region stays mounted while empty, so the stale note is announced when it appears -->
	<div class="live" role="status">
		{#if isStale}
			<p class="stale-note">
				<span>
					<strong>Out of date.</strong>
					{tool.isResultWithheld ? staleWithheld : staleAccepted}
				</span>
				<!-- Brings back the hidden buttons, for example when a stray key press made the result stale -->
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
