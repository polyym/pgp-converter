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
		/** Line thickness, in the icon's own 24 by 24 units */
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
	<!-- Safe as raw HTML: the drawings are fixed strings from this app's own source -->
	{@html ICONS[name]}
</svg>
