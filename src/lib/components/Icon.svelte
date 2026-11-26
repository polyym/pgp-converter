<script lang="ts">
	import { ICONS, type IconName } from '#lib/icons.ts';

	let {
		name,
		size = 16,
		strokeWidth = 1.5,
		class: className
	}: {
		name: IconName;
		/** Width and height in pixels */
		size?: number;
		/** Stroke width in viewBox units; the viewBox is 24 by 24 */
		strokeWidth?: number;
		class?: string;
	} = $props();
</script>

<svg
	class={className}
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<!-- {@html} is safe here: ICONS holds constant SVG markup from icons.ts, never user input -->
	{@html ICONS[name]}
</svg>
