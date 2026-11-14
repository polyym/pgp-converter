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
		/** One line under the title saying what the page is for */
		subtitle: string;
		tool: ToolPage;
		/** The wording on the main action's button, for example "Encrypt" */
		submitText: string;
		/** What the Clear button says after a first press, where the page words that differently */
		clearArmedText?: string;
		/** The same, in full, for screen readers */
		clearArmedStatus?: string;
		/**
		 * Whether the result stays in view on a desktop while the inputs beside it
		 * scroll. Off where the result can grow taller than the window.
		 */
		isResultSticky?: boolean;
		/** A control that belongs to the whole page, such as the Sign / Verify switch */
		headerExtra?: Snippet;
		/** Questions the page may put to the user, which cover it while they are open */
		dialogs?: Snippet;
		/** The form's inputs */
		fields: Snippet;
		/** Where the result appears */
		result: Snippet;
		/** What follows the tool: how to use it, and questions about it */
		children: Snippet;
	} = $props();
</script>

<!-- Every tool page has the same parts in the same places: inputs and the
     action on the left of a desktop screen, the result on the right -->
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
