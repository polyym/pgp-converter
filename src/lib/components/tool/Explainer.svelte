<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon.svelte';

	let {
		title,
		children
	}: {
		/** What the section explains, as a heading: "How to encrypt a PGP message" */
		title: string;
		/** The explanation */
		children: Snippet;
	} = $props();
</script>

<!-- How to use the tool above. Closed until asked for; the title is a heading
     so that the section is part of the page's outline. -->
<details class="explainer">
	<summary>
		<h2>{title}</h2>
		<Icon name="chevron" size={12} strokeWidth={2} class="chevron" />
	</summary>
	{@render children()}
</details>
