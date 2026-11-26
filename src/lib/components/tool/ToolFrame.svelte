<!--
@component
The layout every tool page shares, so each tool has its inputs, action bar and result in the same
places. From 1024px the result column sits to the right of the inputs.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ToolName } from '#lib/pages.ts';
	import type { ToolPage } from '#lib/stores/tool-page.svelte.ts';
	import ActionBar from './ActionBar.svelte';
	import DonationBanner from './DonationBanner.svelte';
	import Notice from './Notice.svelte';
	import PageFrame from '../PageFrame.svelte';
	import PageHeader from '../PageHeader.svelte';
	import ShortcutsModal from './ShortcutsModal.svelte';
	import Toast from './Toast.svelte';

	let {
		page,
		title,
		subtitle,
		tool,
		submitText,
		clearArmedText,
		clearArmedStatus,
		isResultSticky = true,
		headerExtra,
		dialogs,
		fields,
		result,
		children
	}: {
		page: ToolName;
		title: string;
		subtitle: string;
		tool: ToolPage;
		/** Submit button label, for example "Encrypt" */
		submitText: string;
		/** Overrides ActionBar's armed Clear label */
		clearArmedText?: string;
		/** Overrides ActionBar's armed Clear announcement */
		clearArmedStatus?: string;
		/** Makes the result column sticky on desktop. Off where the result can be taller than the viewport. */
		isResultSticky?: boolean;
		/** A page-wide control in the header, such as the Sign / Verify switch */
		headerExtra?: Snippet;
		/** Modal dialogs, such as a ConfirmDialog */
		dialogs?: Snippet;
		fields: Snippet;
		/** Usually a ResultPanel */
		result: Snippet;
		/** Content below the tool, such as the Explainer and Questions */
		children: Snippet;
	} = $props();
</script>

<PageFrame currentPage={page} hasActionBar>
	{#snippet overlays()}
		<ShortcutsModal
			isOpen={tool.isShortcutsOpen}
			shortcuts={tool.shortcuts}
			onClose={tool.closeShortcuts}
		/>
		{@render dialogs?.()}
	{/snippet}

	<PageHeader
		icon={page}
		{title}
		{subtitle}
		onShortcutsClick={tool.areHintsVisible ? tool.toggleShortcuts : undefined}
		children={headerExtra}
	/>

	<Toast type="success" message={tool.feedback.success} />
	<Toast type="error" message={tool.feedback.error} />
	<Notice message={tool.idleNotice} onDismiss={tool.dismissIdleNotice} />

	<div class="workspace">
		<div class="inputs">
			<div class="fields">
				{@render fields()}
			</div>

			<ActionBar
				{tool}
				icon={page}
				text={submitText}
				armedText={clearArmedText}
				armedStatus={clearArmedStatus}
			/>
		</div>

		<div class={['result-column', { flow: !isResultSticky }]}>
			{@render result()}

			<DonationBanner isVisible={tool.isDonationOffered} onDismiss={tool.dismissDonation} />
		</div>
	</div>

	{@render children()}
</PageFrame>
