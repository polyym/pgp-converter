<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { IconName } from '#lib/icons.ts';
	import Icon from '../Icon.svelte';

	let {
		icon,
		title,
		summary,
		note,
		isActive,
		children
	}: {
		icon: IconName;
		/** What the step does: "Sign this message" */
		title: string;
		/** One line under the title: what the step is for, or what it is doing now */
		summary: string;
		/** What to know before using it, shown once it is open */
		note: string;
		/** Whether the step is in use, which is whenever its fields hold something */
		isActive: boolean;
		/** The step's fields */
		children: Snippet;
	} = $props();
</script>

<!-- An optional step inside a form, closed until the user wants it -->
<details class={['option', { active: isActive }]}>
	<summary>
		<span class="option-icon"><Icon name={icon} /></span>
		<span class="option-text">
			<span class="option-title">{title}</span>
			<span class="option-summary">{summary}</span>
		</span>
		<Icon name="chevron" size={12} strokeWidth={2} class="chevron" />
	</summary>
	<div class="option-body">
		<p class="option-note">{note}</p>
		{@render children()}
	</div>
</details>
