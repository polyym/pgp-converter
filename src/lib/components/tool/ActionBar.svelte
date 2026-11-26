<script lang="ts">
	import type { IconName } from '#lib/icons.ts';
	import type { ToolPage } from '#lib/stores/tool-page.svelte.ts';
	import Icon from '../Icon.svelte';

	let {
		tool,
		icon,
		text,
		armedText = 'Press Esc again',
		armedStatus = 'Press Escape again to clear the form.'
	}: {
		tool: ToolPage;
		icon: IconName;
		/** Label of the submit button */
		text: string;
		/** Clear button label after the first press, while it waits for the second */
		armedText?: string;
		/** Announced in the status region while Clear is armed */
		armedStatus?: string;
	} = $props();
</script>

<div class="bottom-actions">
	<div class="bottom-actions-inner">
		{#if tool.canClear}
			<button
				class={['btn secondary', { confirming: tool.isClearArmed }]}
				onclick={tool.pressClear}
			>
				<Icon name="close" strokeWidth={2} />
				{tool.isClearArmed ? armedText : 'Clear'}
				{#if tool.areHintsVisible && !tool.isClearArmed}<kbd>Esc</kbd>{/if}
			</button>
			<span class="sr-only" role="status">{tool.isClearArmed ? armedStatus : ''}</span>
		{/if}
		<button class="btn primary" onclick={tool.submit} disabled={tool.isLoading || !tool.canSubmit}>
			{#if tool.isLoading}
				<span class="spinner"></span>
			{:else}
				<Icon name={icon} strokeWidth={2} />
			{/if}
			{text}
			{#if tool.areHintsVisible}<kbd>{tool.keys.submitHint}</kbd>{/if}
		</button>
	</div>
</div>
