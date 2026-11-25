<script lang="ts">
	import { SITE_URL } from '#lib/constants.ts';
	import { siteAddress } from '#lib/stores/site-address.svelte.ts';

	const releasedHost = new URL(SITE_URL).hostname;
</script>

<!-- Shown on staging, deploy previews and the dev server, so none of them is mistaken for the released site -->
{#if siteAddress.isTest}
	<aside class="test-address" aria-label="Test address">
		<p>
			<strong>This is a test address.</strong>
			The released site is <a href={SITE_URL} rel="noreferrer">{releasedHost}</a>.
		</p>
	</aside>
{/if}
