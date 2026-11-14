<script lang="ts">
	import { version } from '../../../package.json';
	import { Icon, PageFrame, PageHeader, SEO } from '#lib/components/index.ts';
	import { findCurrentSection } from '#lib/sections.ts';
	import { onMount } from 'svelte';

	// The commit this build was made from, and the cryptography library it contains
	const commit = __BUILD_COMMIT__;
	const openpgpVersion = __OPENPGP_VERSION__;

	// The section nearest the top of the window, marked in the list of contents
	let current = $state('about-this-app');

	function markCurrentSection() {
		current = findCurrentSection() ?? current;
	}

	onMount(markCurrentSection);
</script>

<svelte:window onscroll={markCurrentSection} />

<SEO
	title="About PGP Converter: Privacy, Security &amp; How PGP Works"
	description="Learn about PGP Converter, how it keeps your data private, and how PGP encryption works. Hosted on Netlify, no cookies, no tracking scripts, fully open source."
	path="/about"
/>

<PageFrame currentPage="about">
	<PageHeader
		icon="about"
		title="About PGP Converter"
		subtitle="What this app is, how it works, and what it can and cannot protect."
	/>

	<div class="doc">
		<nav class="toc" aria-label="On this page">
			<p class="toc-title">On this page</p>
			<div class="toc-grid">
				<a
					href="#about-this-app"
					class="toc-link"
					aria-current={current === 'about-this-app' ? 'true' : undefined}>About This App</a
				>
				<a
					href="#hosting-privacy"
					class="toc-link"
					aria-current={current === 'hosting-privacy' ? 'true' : undefined}>Hosting &amp; Privacy</a
				>
				<a
					href="#how-pgp-works"
					class="toc-link"
					aria-current={current === 'how-pgp-works' ? 'true' : undefined}>How PGP Works</a
				>
				<a
					href="#using-this-app"
					class="toc-link"
					aria-current={current === 'using-this-app' ? 'true' : undefined}>Using This App</a
				>
				<a
					href="#security-best-practices"
					class="toc-link"
					aria-current={current === 'security-best-practices' ? 'true' : undefined}
					>Security Best Practices</a
				>
				<a
					href="#threat-model"
					class="toc-link"
					aria-current={current === 'threat-model' ? 'true' : undefined}>Threat Model</a
				>
				<a
					href="#verifying-this-deployment"
					class="toc-link"
					aria-current={current === 'verifying-this-deployment' ? 'true' : undefined}
					>Verifying This Deployment</a
				>
				<a
					href="#reporting-issues"
					class="toc-link"
					aria-current={current === 'reporting-issues' ? 'true' : undefined}>Reporting Issues</a
				>
				<a
					href="#useful-resources"
					class="toc-link"
					aria-current={current === 'useful-resources' ? 'true' : undefined}>Useful Resources</a
				>
			</div>
		</nav>

		<div class="doc-body">
			<section class="section" id="about-this-app">
				<h2>About This App</h2>
				<p>
					PGP Converter is a free, open-source tool for encrypting, decrypting, signing and
					verifying messages with PGP (Pretty Good Privacy). It launched in May 2023 and has never
					had ads, sponsors or affiliate links. It is supported only by optional donations, and
					donors receive nothing in return.
				</p>
				<p>
					All the cryptography runs in your browser. No keys, messages or passphrases are sent to
					any server.
				</p>

				<ul>
					<li>
						Once you have opened it, the app works with no connection, and you can install it from
						your browser's menu ("Install" or "Add to Home Screen")
					</li>
					<li>
						The only outside request the app makes is for the donation addresses on the Donate page,
						and it carries no user data
					</li>
					<li>
						The source code is on <a
							href="https://github.com/polyym/pgp-converter"
							target="_blank"
							rel="noopener noreferrer">GitHub</a
						>
					</li>
				</ul>
			</section>

			<section class="section" id="hosting-privacy">
				<h2>Hosting &amp; Privacy</h2>
				<div class="info-box">
					<p>
						PGP Converter is hosted on <a
							href="https://www.netlify.com/"
							target="_blank"
							rel="noopener noreferrer">Netlify</a
						>. Netlify's server logs give us aggregate figures such as page views, unique visitors
						and top locations. These are not shared with anyone.
					</p>
					<p>Beyond that:</p>
					<ul>
						<li>
							No cookies are set. One value is kept in your browser's local storage: the time you
							last dismissed the donation banner, so that it stays hidden for a day. The page also
							remembers your scroll position in session storage, which the browser clears when you
							close the tab. Neither leaves your device
						</li>
						<li>
							So that it works offline, your browser keeps a copy of the app's own pages, code,
							fonts and icons. Nothing you type, paste, generate or decrypt is kept, and a tool page
							left untouched for 15 minutes clears itself. While you are online, your browser still
							asks this site now and then whether a newer version exists. The host sees that
							request, but not which tool you open
						</li>
						<li>No client-side tracking scripts are loaded</li>
						<li>
							The boxes you type and paste into ask writing-assistant extensions, such as Grammarly
							and LanguageTool, and the browser's own spelling services to stay out, because those
							work by sending your text elsewhere. Results, names and fingerprints are marked as not
							to be translated, for the same reason. An extension is free to ignore the request, so
							switch such tools off before handling anything sensitive
						</li>
						<li>
							No code is loaded from other sites. The app is built from open-source libraries (<a
								href="https://openpgpjs.org/"
								target="_blank"
								rel="noopener noreferrer">OpenPGP.js</a
							>
							{openpgpVersion} for the cryptography, Svelte for the interface, and qrcode for the donation
							QR codes), all bundled into the signed build and served from this domain
						</li>
						<li>
							This project keeps no personal data, accounts, databases or per-user logs. Apart from
							the aggregate Netlify figures above, we retain nothing about you or what you do here
						</li>
						<li>
							Because your keys, messages, and passphrases never reach a server, there is nothing of
							that kind to produce in response to a subpoena. Netlify, as the host, may keep
							standard access logs (such as IP addresses and the pages requested) under its own
							retention policy
						</li>
					</ul>
					<p>
						<strong>If you would rather not rely on this,</strong> a trustworthy VPN hides your IP
						address and approximate location from the analytics and access logs described above. A
						VPN moves that trust to its provider and does not make you anonymous. For anonymity, use
						<a href="https://www.torproject.org/" target="_blank" rel="noopener noreferrer"
							>Tor Browser</a
						>.
						<a href="https://www.privacyguides.org/" target="_blank" rel="noopener noreferrer"
							>Privacy Guides</a
						> keeps recommendations for both.
					</p>
				</div>
			</section>

			<section class="section" id="how-pgp-works">
				<h2>How PGP Works</h2>
				<p>PGP uses <strong>public-key cryptography</strong>.</p>

				<div class="concept">
					<h3>Key Pairs</h3>
					<p>Every user has two keys that are mathematically linked:</p>
					<ul>
						<li>
							<strong>Public Key:</strong> Share this freely. Others use it to encrypt messages to you.
						</li>
						<li>
							<strong>Private Key:</strong> Keep this secret. Only you can decrypt messages with it, and
							only you can sign with it.
						</li>
					</ul>
				</div>

				<div class="concept">
					<h3>Encryption</h3>
					<p>When someone wants to send you a secret message:</p>
					<ol>
						<li>They obtain your <strong>public key</strong></li>
						<li>They encrypt their message using your public key</li>
						<li>Only your <strong>private key</strong> can decrypt the message</li>
					</ol>
				</div>

				<div class="concept">
					<h3>Decryption</h3>
					<p>When you receive an encrypted message:</p>
					<ol>
						<li>You use your <strong>private key</strong> and <strong>passphrase</strong></li>
						<li>The message is decrypted and readable</li>
					</ol>
				</div>

				<div class="concept">
					<h3>Signatures</h3>
					<p>
						Encryption keeps a message private, but it does not say who wrote it. A signature does:
					</p>
					<ol>
						<li>The sender signs the message with their own <strong>private key</strong></li>
						<li>Anyone with the sender's <strong>public key</strong> can check the signature</li>
						<li>
							A valid signature shows that the message came from that key and has not been changed
							since
						</li>
					</ol>
				</div>
			</section>

			<section class="section" id="using-this-app">
				<h2>Using This App</h2>

				<div class="feature-card">
					<div class="feature-icon">
						<Icon name="generate" size={20} />
					</div>
					<div class="feature-content">
						<h3>Generate Keys</h3>
						<p>
							Make a new PGP key pair. It needs a name, which need not be your real one, and a
							passphrase. An email address is optional. You can choose ECC (modern and fast) or RSA
							(for older software).
						</p>
						<a href="/generate" class="feature-link">Go to Generate Keys →</a>
					</div>
				</div>

				<div class="feature-card">
					<div class="feature-icon">
						<Icon name="encrypt" size={20} />
					</div>
					<div class="feature-content">
						<h3>Encrypt Messages</h3>
						<p>
							Enter your message and the recipient's public key. The page shows whose key it is, and
							you can add several keys to write to several people. You can also sign the message
							with your own key, so the recipient can confirm it came from you.
						</p>
						<a href="/encrypt" class="feature-link">Go to Encrypt →</a>
					</div>
				</div>

				<div class="feature-card">
					<div class="feature-icon">
						<Icon name="decrypt" size={20} />
					</div>
					<div class="feature-content">
						<h3>Decrypt Messages</h3>
						<p>
							Paste the encrypted message, add your private key and enter its passphrase. Add the
							sender's public key to check the signature, if the message has one.
						</p>
						<a href="/decrypt" class="feature-link">Go to Decrypt →</a>
					</div>
				</div>

				<div class="feature-card">
					<div class="feature-icon">
						<Icon name="sign" size={20} />
					</div>
					<div class="feature-content">
						<h3>Sign and Verify</h3>
						<p>
							Sign a message with your private key so that anyone can read it and confirm it came
							from you, or check a signed message against the sender's public key. To sign a private
							message, use "Sign this message" on the Encrypt page.
						</p>
						<a href="/sign" class="feature-link">Go to Sign →</a>
						<a href="/verify" class="feature-link">Go to Verify →</a>
					</div>
				</div>
			</section>

			<section class="section" id="security-best-practices">
				<h2>Security Best Practices</h2>
				<div class="tips">
					<div class="tip">
						<div class="tip-content">
							<strong>Protect your private key</strong>
							<p>Never share your private key with anyone. Store it in a secure location.</p>
						</div>
					</div>
					<div class="tip">
						<div class="tip-content">
							<strong>Use a strong passphrase</strong>
							<p>Choose a long, unique passphrase that you can remember but others cannot guess.</p>
						</div>
					</div>
					<div class="tip">
						<div class="tip-content">
							<strong>Verify public keys</strong>
							<p>
								Before encrypting to a key or trusting its signature, compare the fingerprint the
								page shows with one the owner gives you through a trusted channel.
							</p>
						</div>
					</div>
					<div class="tip">
						<div class="tip-content">
							<strong>Back up your keys</strong>
							<p>
								Keep secure backups of your key pair. If you lose your private key, you cannot
								decrypt messages.
							</p>
						</div>
					</div>
				</div>
			</section>

			<section class="section" id="threat-model">
				<h2>Threat Model</h2>
				<p>What this tool protects you from, and what it does not.</p>

				<div class="concept">
					<h3>What this tool is designed to protect against</h3>
					<ul>
						<li>Passive network eavesdroppers reading your messages in transit</li>
						<li>
							Corruption or alteration of a ciphertext in transit: every message carries an
							integrity check, so a modified message is rejected instead of being decrypted into
							something misleading. On its own this does not tell you who sent it; a signature does
						</li>
						<li>
							Forged or altered messages, when the sender signs and you check the signature against
							a public key you have confirmed is theirs
						</li>
						<li>Server-side key theft, because there is no server-side key storage</li>
						<li>Server-side logging of your inputs, because there is no server-side processing</li>
						<li>
							Cryptanalysis of the underlying ciphers with current classical computing power:
							Curve25519 provides around 128-bit security, and RSA at 3072+ bits remains unbroken
							against known attacks
						</li>
						<li>
							Exposure of your plaintext on its way to be encrypted: encryption happens in your
							browser, so the readable message is never sent over the network by this app
						</li>
					</ul>
				</div>

				<div class="concept">
					<h3>What this tool does not protect against</h3>
					<ul>
						<li>
							<strong>A compromised deployment.</strong> If an attacker gained control of this site's
							hosting or build pipeline, they could serve tampered JavaScript that exfiltrates your keys.
							Every web-based cryptographic tool has this limit, which is why we recommend a local PGP
							client for high-stakes use.
						</li>
						<li>
							<strong>Forged senders, unless you check a signature.</strong> Anyone who has your public
							key can encrypt a message to you and claim to be someone else, or replace a message with
							one of their own. An unsigned message, or a signature you have not checked, tells you what
							the message says, not who wrote it.
						</li>
						<li>
							<strong>A public key that is not whose you think it is.</strong> A valid signature proves
							which key signed, and nothing more. If someone gave you their own key under another person's
							name, their signatures will look valid. Compare fingerprints through a channel you trust;
							this app has no way to do that for you.
						</li>
						<li>
							<strong>Endpoint compromise.</strong> If your device has a keylogger, malware, or a compromised
							browser extension, nothing done in the browser can protect you.
						</li>
						<li>
							<strong>Metadata leakage.</strong> PGP encrypts message content, but not the email subject
							line, sender or recipient addresses, or the timestamp. Who talked to whom and when remains
							visible to anyone with access to the headers.
						</li>
						<li>
							<strong>Loss of forward secrecy.</strong> PGP does not provide forward secrecy. If your
							private key is ever compromised, every past message encrypted to that key can be decrypted.
						</li>
						<li>
							<strong>High-value targeted adversaries.</strong> For journalistic sources, legal
							material, long-term archives, or any threat model at that level, use
							<a href="https://gnupg.org/" target="_blank" rel="noopener noreferrer">GnuPG</a> locally
							or a desktop PGP mail client.
						</li>
					</ul>
				</div>
			</section>

			<section class="section" id="verifying-this-deployment">
				<h2>Verifying This Deployment</h2>
				<p>
					With a web app, you trust the server to deliver the right code every time you open it, as
					the <a href="https://docs.openpgpjs.org/" target="_blank" rel="noopener noreferrer"
						>OpenPGP.js documentation</a
					> points out. These are the ways to check this one.
				</p>
				{#if commit}
					<p>
						You are using version {version}, built from commit
						<a
							href="https://github.com/polyym/pgp-converter/commit/{commit}"
							target="_blank"
							rel="noopener noreferrer"><code translate="no">{commit.slice(0, 7)}</code></a
						>.
					</p>
				{/if}

				<div class="concept">
					<h3>The files are the ones that were signed</h3>
					<p>
						Every production deploy is built and signed by GitHub Actions using a short-lived <a
							href="https://www.sigstore.dev/"
							target="_blank"
							rel="noopener noreferrer">Sigstore</a
						>-issued certificate. The attestation links each file to a commit and a workflow run,
						and is recorded in Sigstore's public transparency log.
					</p>
					<p>
						To check a file, install the <a
							href="https://cli.github.com/"
							target="_blank"
							rel="noopener noreferrer">GitHub CLI</a
						>, download the file from this site and verify it:
					</p>
					<!-- A box that scrolls has to take keyboard focus, or it cannot be scrolled without a mouse -->
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<pre
						class="verify-cmd"
						tabindex="0"
						role="group"
						aria-label="Commands that check a file"><code
							>curl -O https://pgp-converter.com/_app/version.json
gh attestation verify version.json --repo polyym/pgp-converter</code
						></pre>
					<p>
						That file names the commit the site was built from. The same check works for any other
						file the site serves.
					</p>
				</div>

				<div class="concept">
					<h3>Anyone can build the same files</h3>
					<p>
						The same commit builds the same files, byte for byte. You can build it yourself and
						compare your files with the ones this site serves. The <a
							href="https://github.com/polyym/pgp-converter#reproducing-a-build"
							target="_blank"
							rel="noopener noreferrer">README</a
						> gives the commands.
					</p>
				</div>

				<div class="concept">
					<h3>Nothing is sent while you work</h3>
					<p>
						Open your browser's developer tools and watch the Network tab while you encrypt or
						decrypt. No request is made. Or disconnect from the internet first. The tools still
						work.
					</p>
				</div>

				<div class="concept">
					<h3>The page may only talk to this site</h3>
					<p>
						Every page is sent with a content policy that lets it load scripts from, and connect to,
						this site and no other. Your browser enforces it. You can read the policy in the page's
						response headers, under Content-Security-Policy.
					</p>
				</div>

				<div class="concept">
					<h3>If the stakes are high</h3>
					<p>
						Run the app on your own machine, or use dedicated PGP software such as <a
							href="https://gnupg.org/"
							target="_blank"
							rel="noopener noreferrer">GnuPG</a
						>.
					</p>
				</div>
			</section>

			<section class="section" id="reporting-issues">
				<h2>Reporting Issues</h2>
				<p>
					Bugs and suggestions are welcome as issues on <a
						href="https://github.com/polyym/pgp-converter/issues"
						target="_blank"
						rel="noopener noreferrer">GitHub</a
					>.
				</p>
				<p>
					Please do not post a security vulnerability in a public issue. Report it privately through <a
						href="https://github.com/polyym/pgp-converter/security/advisories/new"
						target="_blank"
						rel="noopener noreferrer">GitHub's private vulnerability reporting</a
					>, so that a fix can be ready before the details are public.
				</p>
			</section>

			<section class="section" id="useful-resources">
				<h2>Useful Resources</h2>
				<div class="resources">
					<a
						href="https://openpgpjs.org/"
						target="_blank"
						rel="noopener noreferrer"
						class="resource"
					>
						<div class="resource-icon">
							<Icon name="external" size={20} />
						</div>
						<div class="resource-content">
							<strong>OpenPGP.js</strong>
							<span>The library that does the cryptography here</span>
						</div>
					</a>
					<a
						href="https://www.openpgp.org/"
						target="_blank"
						rel="noopener noreferrer"
						class="resource"
					>
						<div class="resource-icon">
							<Icon name="external" size={20} />
						</div>
						<div class="resource-content">
							<strong>OpenPGP.org</strong>
							<span>Official OpenPGP standard documentation</span>
						</div>
					</a>
					<a href="https://ssd.eff.org/" target="_blank" rel="noopener noreferrer" class="resource">
						<div class="resource-icon">
							<Icon name="external" size={20} />
						</div>
						<div class="resource-content">
							<strong>Surveillance Self-Defense</strong>
							<span>EFF's guide to digital security and privacy</span>
						</div>
					</a>
					<a
						href="https://www.privacyguides.org/"
						target="_blank"
						rel="noopener noreferrer"
						class="resource"
					>
						<div class="resource-icon">
							<Icon name="external" size={20} />
						</div>
						<div class="resource-content">
							<strong>Privacy Guides</strong>
							<span>Independent recommendations for privacy tools</span>
						</div>
					</a>
					<a
						href="https://github.com/polyym/pgp-converter"
						target="_blank"
						rel="noopener noreferrer"
						class="resource"
					>
						<div class="resource-icon">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"
								><path
									d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
								/></svg
							>
						</div>
						<div class="resource-content">
							<strong>Source Code</strong>
							<span>View and contribute on GitHub</span>
						</div>
					</a>
				</div>
			</section>
		</div>
	</div>
</PageFrame>

<style>
	/* Desktop: the list of sections stays beside the text, as the inputs stay
     beside the result on the tool pages */
	@media (min-width: 1024px) {
		.doc {
			display: grid;
			grid-template-columns: 260px minmax(0, 1fr);
			gap: 56px;
			align-items: start;
		}

		.doc .toc {
			position: sticky;
			top: calc(var(--nav-height, 66px) + 24px);
			margin-bottom: 0;
		}

		.doc .toc-grid {
			grid-template-columns: 1fr;
		}
	}

	/* Jumps from "On this page" stop a little below the top bar, which the page keeps clear of */
	.section {
		margin-bottom: 40px;
		scroll-margin-top: 12px;
	}

	.toc {
		margin-bottom: 40px;
		padding: 16px 18px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
	}
	.toc-title {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin: 0 0 12px;
	}
	.toc-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 8px 16px;
	}
	.toc-link {
		font-size: 14px;
		color: var(--text);
		text-decoration: none;
		padding: 2px 0;
		transition: color 0.15s ease;
	}
	.toc-link:hover {
		color: var(--text);
	}

	/* Desktop only: there the list stays on screen beside the text */
	@media (min-width: 1024px) {
		.toc-link {
			padding: 4px 10px;
			margin: 0 -10px;
			color: var(--text-secondary);
			border-radius: 8px;
		}

		.toc-link[aria-current] {
			color: var(--text);
			background: var(--surface-2);
		}
	}
	@media (max-width: 500px) {
		.toc-grid {
			grid-template-columns: 1fr;
		}
	}
	.section h2 {
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 16px;
		color: var(--text);
	}
	.section p {
		font-size: 15px;
		line-height: 1.7;
		color: var(--text-secondary);
		margin: 0 0 12px;
	}
	.section ul,
	.section ol {
		margin: 0 0 16px;
		padding-left: 24px;
	}
	.section li {
		font-size: 15px;
		line-height: 1.7;
		color: var(--text-secondary);
		margin-bottom: 8px;
	}
	.section a {
		color: var(--text);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.section a:hover {
		color: var(--text);
	}
	.section strong {
		color: var(--text);
		font-weight: 500;
	}

	.info-box {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 16px 18px;
	}
	.info-box p {
		font-size: 14px;
		line-height: 1.7;
		margin: 0 0 12px;
	}
	.info-box ul {
		margin: 0;
		padding-left: 20px;
	}
	.info-box li {
		font-size: 14px;
		line-height: 1.7;
		margin-bottom: 6px;
	}

	.concept {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 16px 18px;
		margin-bottom: 12px;
	}
	.concept h3 {
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
		margin: 0 0 10px;
	}
	.concept p {
		margin: 0 0 8px;
		font-size: 14px;
	}
	.concept ul,
	.concept ol {
		margin: 0;
		padding-left: 20px;
	}
	.concept li {
		font-size: 14px;
		margin-bottom: 4px;
	}

	.feature-card {
		display: flex;
		gap: 14px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 16px 18px;
		margin-bottom: 12px;
	}

	.feature-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		color: var(--text);
		background: var(--surface-2);
		border: 1px solid var(--border-hover);
		border-radius: 12px;
		flex-shrink: 0;
	}

	.feature-content {
		flex: 1;
	}
	.feature-content h3 {
		font-size: 15px;
		font-weight: 600;
		color: var(--text);
		margin: 0 0 6px;
	}
	.feature-content p {
		font-size: 14px;
		line-height: 1.6;
		margin: 0 0 10px;
	}
	.feature-link {
		margin-right: 16px;
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
		text-decoration: none;
	}
	.feature-link:hover {
		text-decoration: underline;
	}

	.tips {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.tip {
		display: flex;
		gap: 14px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 14px 16px;
	}
	.tip-content {
		flex: 1;
	}
	.tip-content strong {
		display: block;
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
		margin-bottom: 4px;
	}
	.tip-content p {
		font-size: 13px;
		line-height: 1.5;
		margin: 0;
	}

	.resources {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.resource {
		display: flex;
		align-items: center;
		gap: 14px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 14px 16px;
		text-decoration: none;
		transition: all 0.15s ease;
	}
	.resource:hover {
		border-color: var(--border-hover);
		background: var(--surface-2);
	}
	.resource-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: var(--surface-2);
		border-radius: 12px;
		color: var(--text-secondary);
		flex-shrink: 0;
	}
	.resource:hover .resource-icon {
		color: var(--text);
	}
	.resource-content {
		flex: 1;
	}
	.resource-content strong {
		display: block;
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
		margin-bottom: 2px;
	}
	.resource-content span {
		font-size: 13px;
		color: var(--text-secondary);
	}

	.verify-cmd {
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 10px 12px;
		margin: 0 0 12px;
		font-family: var(--mono);
		font-size: 13px;
		color: var(--text);
		overflow-x: auto;
		white-space: pre;
	}
	.verify-cmd code {
		font-family: inherit;
	}

	@media (max-width: 380px) {
		.section h2 {
			font-size: 16px;
		}
		.feature-card {
			flex-direction: column;
			gap: 12px;
		}
		.tip {
			flex-direction: column;
			gap: 10px;
		}
	}

	/* Fingers need a larger target than a mouse pointer does */
	@media (pointer: coarse) {
		.toc-grid {
			row-gap: 0;
		}

		.toc-link,
		.feature-link {
			display: flex;
			align-items: center;
			min-height: 44px;
		}
	}
</style>
