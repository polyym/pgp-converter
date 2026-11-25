<!-- @component An optional section of a tool's form, closed until the user opens it -->
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
		/** For example "Sign this message" */
		title: string;
		/** One line under the title: what the section is for, or what it is doing now */
		summary: string;
		/** Shown at the top of the section once it is open */
		note: string;
		/** Highlights the icon. Pages set it while any of the section's fields has content. */
		isActive: boolean;
		/** The section's fields */
		children: Snippet;
	} = $props();
</script>

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
