<script lang="ts">
	import { SITE_URL } from '#lib/constants.ts';
	import { siteAddress } from '#lib/stores/site-address.svelte.ts';

	const releasedHost = new URL(SITE_URL).hostname;
</script>

<!-- Shown everywhere but the released site: on the staging copy, a preview and
     a developer's own machine. Nobody should take one of those for the real one. -->
{#if siteAddress.isTest}
	<aside class="test-address" aria-label="Test address">
		<p>
			<strong>This is a test address.</strong>
			The released site is <a href={SITE_URL}>{releasedHost}</a>.
		</p>
	</aside>
{/if}
