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
		/** The main action's icon */
		icon: IconName;
		/** The wording on the main action's button */
		text: string;
		/** What the Clear button says while a first press waits to be confirmed */
		armedText?: string;
		/** The same, in full, for screen readers */
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
