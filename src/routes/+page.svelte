<script lang="ts">
	import { version } from '../../package.json';
	import { PageFrame, SEO } from '#lib/components/index.ts';
	import { pictureDots, type DotPicture } from '#lib/dot-pictures.ts';
	import { toDotText } from '#lib/dot-text.ts';
	import { toStructuredDataScript, WEB_APPLICATION_DATA } from '#lib/structured-data.ts';

	// The grid spells "PGP" until a word in the sentence is pointed at or focused
	let shown = $state<DotPicture>('pgp');
	const dots = $derived(pictureDots(shown));

	// The version number, drawn in the same dots as the picture above it
	const versionDots = toDotText(`v${version}`);

	// The commit this build was made from. A build that was not given one shows none.
	const commit = __BUILD_COMMIT__;

	function show(picture: DotPicture) {
		return () => {
			shown = picture;
		};
	}

	function rest() {
		shown = 'pgp';
	}
</script>

<SEO
	title="PGP Converter: Free Online PGP Encryption and Key Generator"
	description="Free, open-source PGP tool. Encrypt, decrypt, sign and verify messages, and generate ECC or RSA key pairs, all in your browser. No data is sent to any server."
	path="/"
/>

<svelte:head>
	<!-- Data for search engines, not code: see structured-data.ts for what makes it safe to place as HTML -->
	{@html toStructuredDataScript(WEB_APPLICATION_DATA)}
</svelte:head>

<PageFrame currentPage="home">
	<section class="hero">
		<div class="hero-text">
			<!-- The words are the way in: each underlined one leads to its tool -->
			<h1 class="sentence">
				I want to
				<a
					href="/encrypt"
					onpointerenter={show('encrypt')}
					onpointerleave={rest}
					onfocus={show('encrypt')}
					onblur={rest}>encrypt</a
				>
				a PGP message,
				<a
					href="/decrypt"
					onpointerenter={show('decrypt')}
					onpointerleave={rest}
					onfocus={show('decrypt')}
					onblur={rest}>decrypt</a
				>
				one,
				<a
					href="/sign"
					onpointerenter={show('sign')}
					onpointerleave={rest}
					onfocus={show('sign')}
					onblur={rest}>sign</a
				>
				or
				<a
					href="/verify"
					onpointerenter={show('verify')}
					onpointerleave={rest}
					onfocus={show('verify')}
					onblur={rest}>verify</a
				>
				one, or
				<a
					href="/generate"
					onpointerenter={show('key')}
					onpointerleave={rest}
					onfocus={show('key')}
					onblur={rest}>make a key</a
				>.
			</h1>
			<p class="description">
				It all happens in this browser. No account, and nothing you type is sent anywhere.
			</p>
		</div>

		<!-- Decoration only: redraws itself as the tool whose word is pointed at -->
		<div class="shape">
			<div class="grid" aria-hidden="true">
				{#each dots as lit, index (index)}
					<span class={['dot', { lit }]}></span>
				{/each}
			</div>

			<!-- The version, set like a maker's plate under the picture. It leads to the list of releases.
             Beside it, the commit the build was made from, which leads to that commit's source. -->
			<div class="build">
				<a
					class="version-plate"
					href="https://github.com/polyym/pgp-converter/releases"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Version {version}. See what changed in each release."
					title="Version {version}: see what changed"
				>
					<span class="version-dots" style="--columns: {versionDots.columns}" aria-hidden="true">
						{#each versionDots.dots as lit, index (index)}
							<span class={['pip', { lit }]}></span>
						{/each}
					</span>
				</a>
				{#if commit}
					<a
						class="build-commit"
						href="https://github.com/polyym/pgp-converter/commit/{commit}"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="Built from commit {commit.slice(0, 7)}. See its source."
						title="The commit this build was made from">{commit.slice(0, 7)}</a
					>
				{/if}
			</div>
		</div>
	</section>

	<section class="facts" aria-label="How it works">
		<div class="fact">
			<h2>Runs on your device</h2>
			<p>
				All the cryptography is done in your browser by the <a
					href="https://openpgpjs.org/"
					target="_blank"
					rel="noopener noreferrer">OpenPGP.js</a
				> library. Keys, messages and passphrases are never transmitted, and after the first visit the
				app works with no connection.
			</p>
		</div>
		<div class="fact">
			<h2>Open to inspection</h2>
			<p>
				The whole app is on <a
					href="https://github.com/polyym/pgp-converter"
					target="_blank"
					rel="noopener noreferrer">GitHub</a
				> under the AGPL. No tracking scripts, no cookies, and no code loaded from other sites.
			</p>
		</div>
		<div class="fact">
			<h2>Verifiable builds</h2>
			<p>
				Every deploy is signed, the live files are checked against the signed build, and anyone can
				build the same files from the source. The <a href="/about#verifying-this-deployment"
					>About page</a
				> shows how to check.
			</p>
		</div>
	</section>
</PageFrame>

<style>
	/* Colours, fonts and safe-area values come from the shared tokens in app.css */

	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 40px;
		align-items: center;
		margin-bottom: 64px;
	}

	.sentence {
		margin: 0 0 24px;
		font-size: 32px;
		font-weight: 600;
		line-height: 1.3;
		letter-spacing: -1px;
		color: var(--text-secondary);
		text-wrap: balance;
	}

	/* The links are the bright words; the rest of the sentence steps back */
	.sentence a {
		color: var(--text);
		text-decoration: underline;
		text-decoration-thickness: 2px;
		text-decoration-color: var(--text-dim);
		text-underline-offset: 6px;
		border-radius: 6px;
		transition:
			text-decoration-color 0.15s ease,
			background 0.15s ease;
	}

	.sentence a:hover {
		text-decoration-color: var(--text);
	}

	.description {
		margin: 0;
		max-width: 480px;
		font-size: 16px;
		line-height: 1.65;
		color: var(--text-secondary);
	}

	/* The dot grid */
	.grid {
		display: grid;
		grid-template-columns: repeat(11, 1fr);
		gap: 6px;
		width: 100%;
		aspect-ratio: 1;
	}

	.dot {
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 30%;
		transition:
			background 0.25s ease,
			border-color 0.25s ease,
			transform 0.25s ease;
	}

	.dot.lit {
		background: var(--text);
		border-color: var(--text);
		transform: scale(1.06);
	}

	.facts {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 28px;
		margin-bottom: 0;
	}

	.fact h2 {
		margin: 0 0 8px;
		font-size: 14px;
		font-weight: 500;
		color: var(--text);
	}

	.fact p {
		margin: 0;
		font-size: 14px;
		line-height: 1.65;
		color: var(--text-secondary);
	}

	.fact a {
		color: var(--text);
		text-decoration: underline;
		text-decoration-color: var(--border-hover);
		text-underline-offset: 3px;
	}

	.fact a:hover {
		text-decoration-color: var(--text);
	}

	.shape {
		display: flex;
		flex-direction: column;
		gap: 14px;
		width: min(100%, 260px);
	}

	/* The version: small, grey and always in the same place, so it is easy to
     find and never competes with the sentence */
	.version-plate {
		display: flex;
		align-self: flex-start;
		padding: 6px;
		margin: -6px;
		border-radius: 8px;
	}

	/* The version and its commit, side by side */
	.build {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.build-commit {
		padding: 6px 0;
		font-family: var(--mono);
		font-size: 12px;
		letter-spacing: 0.5px;
		color: var(--text-secondary);
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.build-commit:hover {
		color: var(--text);
	}

	.version-dots {
		display: grid;
		grid-template-columns: repeat(var(--columns), 5px);
		grid-auto-rows: 5px;
		gap: 2px;
	}

	.pip {
		border-radius: 30%;
		transition: background 0.2s ease;
	}

	.pip.lit {
		background: var(--text-secondary);
	}

	.version-plate:hover .pip.lit {
		background: var(--text);
	}

	@media (min-width: 720px) {
		.sentence {
			font-size: 44px;
			letter-spacing: -1.6px;
		}

		.description {
			font-size: 18px;
		}

		.facts {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 40px;
		}
	}

	/* Desktop: the sentence on the left, the grid on the right */
	@media (min-width: 1024px) {
		.hero {
			grid-template-columns: minmax(0, 1fr) 340px;
			gap: 72px;
			margin-bottom: 104px;
		}

		.sentence {
			font-size: 54px;
			letter-spacing: -2.2px;
			line-height: 1.22;
		}

		.shape {
			width: 340px;
			justify-self: end;
		}

		.grid {
			gap: 8px;
		}

		.version-dots {
			grid-template-columns: repeat(var(--columns), 6px);
			grid-auto-rows: 6px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.dot,
		.pip {
			transition: none;
		}
	}

	/* Windows high-contrast mode drops backgrounds, which is all that tells a
     lit dot from an unlit one */
	@media (forced-colors: active) {
		.dot.lit,
		.pip.lit,
		.version-plate:hover .pip.lit {
			forced-color-adjust: none;
			background: CanvasText;
			border-color: CanvasText;
		}
	}

	/* Fingers need a larger target than a mouse pointer does. The words in the
     sentence grow without moving the lines; the commit grows in place. */
	@media (pointer: coarse) {
		.sentence a {
			padding: 3px 0;
		}

		.build-commit {
			display: inline-flex;
			align-items: center;
			min-height: 44px;
		}
	}
</style>
