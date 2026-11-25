<!--
@component
The footer PageFrame puts on every page: project links, and this build's version and commit.
-->
<script lang="ts">
	import { REPOSITORY_URL } from '#lib/constants.ts';
	import { appVersion } from '#lib/stores/app-version.svelte.ts';

	const commit = __BUILD_COMMIT__;
</script>

<footer class="footer">
	<p class="footer-note">
		<span>Free and open source since 2023</span>
		<span class="footer-dot" aria-hidden="true">&middot;</span>
		<span
			>made by <a href="https://github.com/polyym" target="_blank" rel="noopener noreferrer"
				>polyym</a
			></span
		>
	</p>
	<span class="footer-links">
		<a href="https://github.com/polyym/pgp-converter" target="_blank" rel="noopener noreferrer"
			>GitHub</a
		>
		<a href="https://openpgpjs.org/" target="_blank" rel="noopener noreferrer">OpenPGP.js</a>
		<a href="/about">About</a>
		<a href="/donate">Donate</a>
	</span>

	<p class={['footer-build', { candidate: appVersion.isCandidate }]}>
		<a
			class="footer-version"
			href="{REPOSITORY_URL}/releases"
			target="_blank"
			rel="noopener noreferrer"
			title="{appVersion.inWords}: see what changed">v{appVersion.shown}</a
		>
		{#if appVersion.isCandidate}
			<span class="footer-build-dot" aria-hidden="true">&middot;</span>
			<span class="footer-candidate">dev build</span>
		{/if}
		{#if commit}
			<span class="footer-build-dot" aria-hidden="true">&middot;</span>
			<a
				href="{REPOSITORY_URL}/commit/{commit}"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Built from commit {commit.slice(0, 7)}. See its source."
				title="The commit this build was made from">{commit.slice(0, 7)}</a
			>
		{/if}
	</p>
</footer>

<style>
	.footer {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 24px;
		margin-top: 56px;
		padding: 20px 0 0;
		border-top: 1px solid var(--border);
		font-size: 13px;
	}

	.footer-note {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px 8px;
		margin: 0;
		color: var(--text-dim);
	}

	/* Wrap at the dot, never inside a phrase */
	.footer-note span {
		white-space: nowrap;
	}

	/* The two phrases stack here, and the dot would dangle at the end of the first line */
	@media (max-width: 370px) {
		.footer-note {
			flex-direction: column;
			align-items: flex-start;
		}

		.footer-dot {
			display: none;
		}
	}

	.footer-links {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 20px;
	}

	.footer a {
		color: var(--text-secondary);
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.footer a:hover {
		color: var(--text);
	}

	/* Colour alone does not set an inline link apart from the text around it (WCAG 1.4.1) */
	.footer-note a {
		text-decoration: underline;
		text-decoration-color: var(--text-dim);
		text-underline-offset: 3px;
	}

	.footer-build {
		display: flex;
		flex-basis: 100%;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 8px;
		margin: 0;
		font-family: var(--mono);
		font-size: 12px;
		letter-spacing: 0.5px;
		color: var(--text-dim);
	}

	/* Test copies: staging, deploy previews and the dev server */
	.footer-build.candidate .footer-version,
	.footer-candidate {
		color: var(--candidate);
	}

	/* 44px touch targets. The negative margin cancels the extra padding, so the
	   gaps between the links stay the same. */
	@media (pointer: coarse) {
		.footer-build a {
			display: inline-flex;
			align-items: center;
			min-height: 44px;
		}

		.footer-links {
			row-gap: 0;
		}

		.footer-links a {
			display: inline-flex;
			align-items: center;
			min-height: 44px;
			margin-inline: -6px;
			padding-inline: 6px;
		}
	}
</style>
