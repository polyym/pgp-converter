<!-- The same footer on every page, so the bottom of the app never changes shape -->
<footer class="footer">
	<!-- About the project on the left, places to go on the right -->
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

	/* Each part stays whole: on a narrow screen the line breaks at the dot, not inside a phrase */
	.footer-note {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px 8px;
		margin: 0;
		color: var(--text-dim);
	}

	.footer-note span {
		white-space: nowrap;
	}

	/* The narrowest phones cannot fit both parts on one line. There they go on two
     lines, and the dot, which would be left hanging at the end of the first, goes. */
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

	/* A link inside a sentence is underlined: its colour alone is too close to
     the words around it to tell them apart */
	.footer-note a {
		text-decoration: underline;
		text-decoration-color: var(--text-dim);
		text-underline-offset: 3px;
	}

	/* Fingers need a larger target than a mouse pointer does. The extra width is
     padding that the margin takes back, so the gaps between the words stay even. */
	@media (pointer: coarse) {
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
