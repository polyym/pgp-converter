<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { IconName } from '#lib/icons.ts';
	import Icon from './Icon.svelte';

	let {
		title,
		subtitle = '',
		icon,
		onShortcutsClick,
		children
	}: {
		title: string;
		/** One line under the title saying what the page is for */
		subtitle?: string;
		icon: IconName;
		onShortcutsClick?: () => void;
		/** A control that belongs to the whole page, such as the Sign / Verify switch */
		children?: Snippet;
	} = $props();
</script>

<header class="header">
	<div class="icon"><Icon name={icon} size={22} /></div>
	<div class="header-text">
		<h1>{title}</h1>
		{#if subtitle}
			<p class="header-subtitle">{subtitle}</p>
		{/if}
	</div>
	{#if children}
		<div class="header-extra">{@render children()}</div>
	{/if}
	{#if onShortcutsClick}
		<button
			class="shortcut-toggle"
			onclick={onShortcutsClick}
			aria-label="Show keyboard shortcuts"
			title="Keyboard shortcuts (?)"
		>
			<Icon name="keyboard" size={18} />
		</button>
	{/if}
</header>
