<script lang="ts">
	import Icon from '../Icon.svelte';

	let { current }: { current: 'sign' | 'verify' } = $props();
</script>

<!-- Sign and Verify are separate pages, so these are links, not tabs -->
<nav class="mode-switch" aria-label="Sign or verify">
	<a href="/sign" aria-current={current === 'sign' ? 'page' : undefined}>
		<Icon name="sign" />
		Sign
	</a>
	<a href="/verify" aria-current={current === 'verify' ? 'page' : undefined}>
		<Icon name="verify" />
		Verify
	</a>
</nav>
