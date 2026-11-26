<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon.svelte';

	let {
		title,
		children
	}: {
		/** For example "How to encrypt a PGP message" */
		title: string;
		children: Snippet;
	} = $props();
</script>

<!-- The h2 inside <summary> keeps the collapsed section in the page's heading outline -->
<details class="explainer">
	<summary>
		<h2>{title}</h2>
		<Icon name="chevron" size={12} strokeWidth={2} class="chevron" />
	</summary>
	{@render children()}
</details>
