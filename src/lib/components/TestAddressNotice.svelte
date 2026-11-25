<script lang="ts">
	import { SITE_URL } from '#lib/constants.ts';
	import { siteAddress } from '#lib/stores/site-address.svelte.ts';

	const releasedHost = new URL(SITE_URL).hostname;
</script>

<!-- Shown on a test copy: the staging address, a preview and the development
     server. Nobody should take one of those for the real one. -->
{#if siteAddress.isTest}
	<aside class="test-address" aria-label="Test address">
		<p>
			<strong>This is a test address.</strong>
			The released site is <a href={SITE_URL} rel="noreferrer">{releasedHost}</a>.
		</p>
	</aside>
{/if}
