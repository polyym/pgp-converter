<script lang="ts">
	import { Icon, SEO } from '#lib/components/index.ts';
	import {
		ConfirmDialog,
		Explainer,
		KeyOutput,
		PassphraseInput,
		Question,
		Questions,
		ToolFrame
	} from '#lib/components/tool/index.ts';
	import { COPY_ERROR_MS, IDLE_CLEAR_MINUTES, MIN_PASSPHRASE_LENGTH } from '#lib/constants.ts';
	import { downloadText } from '#lib/download.ts';
	import { offerKey } from '#lib/handoff.ts';
	import { KEEP_ASSISTANTS_OUT } from '#lib/keep-out.ts';
	import { combineKeyPair, keyFileName } from '#lib/key-files.ts';
	import { generateKeyPair } from '#lib/keygen.ts';
	import { ratePassphrase } from '#lib/passphrase.ts';
	import { createCopyFlag } from '#lib/stores/copy.svelte.ts';
	import { createToolPage } from '#lib/stores/tool-page.svelte.ts';
	import { createUnsavedKeyGuard } from '#lib/stores/unsaved-key.svelte.ts';

	const IDLE_NOTICE = `Passphrase cleared after ${String(IDLE_CLEAR_MINUTES)} minutes without activity. Any keys you generated are still here.`;

	let name = $state('');
	let email = $state('');
	let passphrase = $state('');
	let confirmPassphrase = $state('');
	let keyType = $state<'ecc' | 'rsa'>('ecc');
	let curve = $state<'curve25519' | 'nistP256' | 'nistP384' | 'nistP521'>('curve25519');
	let rsaBits = $state<2048 | 3072 | 4096>(4096);

	let publicKey = $state('');
	let privateKey = $state('');
	let fingerprint = $state('');
	// How the private key on screen has been kept, if it has. Copying it or
	// downloading it is all the page can see; where it ends up is the user's affair.
	let savedBy = $state<'copy' | 'download'>();

	// A private key exists nowhere but on this page until it is copied or downloaded
	const hasUnsavedKey = $derived(!!privateKey && !savedBy);
	const isValid = $derived(
		name.trim().length > 0 &&
			passphrase.length >= MIN_PASSPHRASE_LENGTH &&
			passphrase === confirmPassphrase
	);
	const rating = $derived(ratePassphrase(passphrase));
	const isConfirmed = $derived(passphrase === confirmPassphrase || confirmPassphrase === '');

	const publicCopy = createCopyFlag();
	const privateCopy = createCopyFlag();
	const guard = createUnsavedKeyGuard({ hasUnsavedKey: () => hasUnsavedKey, onReplace: generate });
	const tool = createToolPage({
		submitLabel: 'Generate keys',
		canSubmit: () => isValid,
		onSubmit: generateUnlessUnsaved,
		canClear: () => !!(name || email || passphrase || publicKey),
		onClear: clearAll,
		// Generated keys cannot be recovered once cleared, so while keys are on
		// screen the Clear button asks twice, as Esc always does
		confirmClear: () => !!privateKey,
		// New keys cannot be recovered, so an idle clear takes only the passphrase.
		// The private key on screen is still locked by it.
		onIdle: clearPassphrases,
		hasSecrets: () => !!(passphrase || confirmPassphrase),
		idleNotice: IDLE_NOTICE
	});

	// For the Generate button and its shortcut: asks first if a key on screen would be lost
	function generateUnlessUnsaved() {
		if (!guard.askBeforeReplacing()) {
			generate();
		}
	}

	function generate() {
		// The form may have been cleared while the question about an unsaved key was open
		if (!isValid) {
			return;
		}
		void tool.run({
			shouldPaintFirst: false,
			work: () =>
				generateKeyPair({
					name,
					email,
					passphrase,
					keyType,
					curve: keyType === 'ecc' ? curve : undefined,
					rsaBits: keyType === 'rsa' ? rsaBits : undefined
				}),
			onSuccess: (result) => {
				publicKey = result.data?.publicKey ?? '';
				privateKey = result.data?.privateKey ?? '';
				fingerprint = result.data?.fingerprint ?? '';
				savedBy = undefined;
				return { message: 'Keys generated' };
			},
			onFailure: () => {
				publicKey = '';
				privateKey = '';
				fingerprint = '';
			},
			fallbackError: 'Key generation failed'
		});
	}

	async function copyPublicKey() {
		if (!(await publicCopy.copy(publicKey))) {
			tool.feedback.showError('Failed to copy', COPY_ERROR_MS);
		}
	}

	async function copyPrivateKey() {
		if (await privateCopy.copy(privateKey)) {
			savedBy ??= 'copy';
		} else {
			tool.feedback.showError('Failed to copy', COPY_ERROR_MS);
		}
	}

	function downloadPublicKey() {
		downloadText(publicKey, keyFileName(name, 'public'));
	}

	function downloadPrivateKey() {
		downloadText(privateKey, keyFileName(name, 'private'));
		savedBy = 'download';
	}

	function downloadBothKeys() {
		downloadText(combineKeyPair(publicKey, privateKey), keyFileName(name, 'keypair'));
		savedBy = 'download';
	}

	function clearAll() {
		tool.reset();
		publicCopy.reset();
		privateCopy.reset();
		name = '';
		email = '';
		passphrase = '';
		confirmPassphrase = '';
		publicKey = '';
		privateKey = '';
		fingerprint = '';
		savedBy = undefined;
	}

	function clearPassphrases() {
		passphrase = '';
		confirmPassphrase = '';
	}
</script>

<SEO
	title="PGP Key Generator Online: Free ECC and RSA Key Pairs"
	description="Free PGP key generator online. Make an ECC (Curve25519) or RSA key pair with a passphrase, in your browser. The keys are never sent to a server."
	path="/generate"
/>

<ToolFrame
	page="generate"
	title="Generate a PGP Key Pair"
	subtitle="Create your own public and private key. They are made in this browser and never sent anywhere."
	{tool}
	submitText="Generate"
	clearArmedText={privateKey ? 'Delete keys?' : undefined}
	clearArmedStatus={privateKey
		? 'Press Clear again to delete the generated keys. They cannot be recovered.'
		: undefined}
	isResultSticky={false}
>
	{#snippet dialogs()}
		<ConfirmDialog
			isOpen={guard.isAsking}
			title={guard.question.title}
			body={guard.question.body}
			confirmLabel={guard.question.confirm}
			cancelLabel={guard.question.cancel}
			onConfirm={guard.goAhead}
			onCancel={guard.stay}
		/>
	{/snippet}

	{#snippet fields()}
		<!-- autocomplete="off": a browser would otherwise offer the user's real name
		     and address here, and may keep a pseudonym typed here to offer on other sites -->
		<div class="field-row">
			<div class="field">
				<label for="name">Name</label>
				<input
					type="text"
					id="name"
					bind:value={name}
					placeholder="Your name..."
					dir="auto"
					autocomplete="off"
					spellcheck="false"
					autocorrect="off"
					{...KEEP_ASSISTANTS_OUT}
				/>
			</div>
			<div class="field">
				<label for="email">Email <span class="optional">optional</span></label>
				<input
					type="email"
					id="email"
					bind:value={email}
					placeholder="Leave empty for none"
					autocomplete="off"
					spellcheck="false"
					{...KEEP_ASSISTANTS_OUT}
				/>
			</div>
		</div>
		<p class="identity-note">
			Both are written into the key, where anyone who has your public key can read them. The name
			does not have to be your real one, and the email can be left out.
		</p>

		<div class="field-row">
			<div class="field">
				<label for="passphrase">Passphrase</label>
				<PassphraseInput
					id="passphrase"
					bind:value={passphrase}
					placeholder="Min {MIN_PASSPHRASE_LENGTH} characters..."
					autocomplete="new-password"
				/>
				{#if passphrase}
					<div class="strength {rating.strength}" role="status">
						<span class="strength-bars" aria-hidden="true">
							{#each [1, 2, 3] as bar (bar)}
								<span class={{ on: bar <= rating.bars }}></span>
							{/each}
						</span>
						<span class="strength-text">
							{passphrase.length < MIN_PASSPHRASE_LENGTH
								? `Must be at least ${String(MIN_PASSPHRASE_LENGTH)} characters.`
								: rating.advice}
						</span>
					</div>
				{/if}
			</div>
			<div class="field">
				<label for="confirmPassphrase">Confirm Passphrase</label>
				<PassphraseInput
					id="confirmPassphrase"
					bind:value={confirmPassphrase}
					placeholder="Confirm passphrase..."
					isInvalid={!isConfirmed}
					autocomplete="new-password"
				/>
				{#if !isConfirmed}
					<span class="field-hint error">Passphrases do not match</span>
				{/if}
			</div>
		</div>

		<div class="field-row">
			<div class="field">
				<label for="keyType">Key Type</label>
				<select id="keyType" bind:value={keyType}>
					<option value="ecc">ECC</option>
					<option value="rsa">RSA</option>
				</select>
			</div>
			{#if keyType === 'ecc'}
				<div class="field">
					<label for="curve">Curve</label>
					<select id="curve" bind:value={curve}>
						<option value="curve25519">Curve25519</option>
						<option value="nistP256">NIST P-256</option>
						<option value="nistP384">NIST P-384</option>
						<option value="nistP521">NIST P-521</option>
					</select>
				</div>
			{:else}
				<div class="field">
					<label for="rsaBits">Key Size</label>
					<select id="rsaBits" bind:value={rsaBits}>
						<option value={4096}>4096 bits</option>
						<option value={3072}>3072 bits</option>
						<option value={2048}>2048 bits</option>
					</select>
				</div>
			{/if}
		</div>
		<!-- Says which choice to make. Inside the boxes it would be cut off where two share a row. -->
		<p class="identity-note">
			{#if keyType === 'ecc'}
				ECC with Curve25519 is the recommended choice. The NIST curves are for organisations whose
				rules require them.
			{:else}
				ECC is the recommended choice unless someone asks you for RSA. For an RSA key you will keep,
				pick 4096 bits.
			{/if}
		</p>
	{/snippet}

	{#snippet result()}
		{#if publicKey && privateKey}
			<div
				class="keys-output"
				bind:this={tool.resultElement}
				tabindex="-1"
				role="region"
				aria-label="Generated keys"
			>
				<div class="fingerprint">
					<span class="fingerprint-label">Fingerprint</span>
					<code translate="no">{fingerprint}</code>
					<p>
						A short identifier for this key pair. Give it to people along with your public key, so
						they can check they are encrypting to the right key.
					</p>
				</div>

				<KeyOutput
					kind="public"
					value={publicKey}
					isCopied={publicCopy.isCopied}
					onCopy={() => {
						void copyPublicKey();
					}}
					onDownload={downloadPublicKey}
				/>

				<KeyOutput
					kind="private"
					value={privateKey}
					isCopied={privateCopy.isCopied}
					onCopy={() => {
						void copyPrivateKey();
					}}
					onDownload={downloadPrivateKey}
				>
					<!-- Whether the one copy of this key has been kept anywhere yet -->
					<p class={['output-note', { signed: !!savedBy }]} role="status">
						{#if savedBy === 'download'}
							<strong>Downloaded.</strong> Keep the file somewhere only you can reach, and never send
							it to anyone.
						{:else if savedBy === 'copy'}
							<strong>Copied.</strong> Paste it somewhere only you can reach before you leave, and never
							send it to anyone.
						{:else}
							<strong>Not saved yet.</strong> Copy or download your private key before you leave this
							page. It cannot be shown again.
						{/if}
					</p>
				</KeyOutput>

				<button class="download-both-btn" onclick={downloadBothKeys}>
					<Icon name="download" strokeWidth={2} />
					Download Both Keys as .txt
				</button>

				<!-- The key travels in memory to the next page; it is not stored anywhere -->
				<nav class="next-steps" aria-label="Use this key">
					<a
						href="/encrypt"
						onclick={() => {
							offerKey({ publicKey });
						}}
					>
						Encrypt a message to this key
						<Icon name="arrow" size={14} strokeWidth={1.75} />
					</a>
					<a
						href="/sign"
						onclick={() => {
							offerKey({ privateKey });
						}}
					>
						Sign a message with this key
						<Icon name="arrow" size={14} strokeWidth={1.75} />
					</a>
				</nav>
			</div>
		{:else}
			<div class="output">
				<div class="output-header"><span>Your keys</span></div>
				<div class="output-body">
					<ol class="placeholder-steps">
						<li>Enter the name the key should carry, and an email if you want one on it.</li>
						<li>Choose a passphrase you will remember. It cannot be reset.</li>
						<li>Press Generate. Your public and private key appear here.</li>
					</ol>
				</div>
			</div>
		{/if}
	{/snippet}

	<div class="warning-box">
		<Icon name="warning" strokeWidth={2} />
		<p>
			Never share your private key. If you lose it or forget its passphrase, nothing encrypted to
			this key can be read again.
		</p>
	</div>

	<Explainer title="How to generate a PGP key pair">
		<p>
			A key pair is a public key, which others use to encrypt messages to you, and a private key,
			which you use to decrypt them.
		</p>
		<ol>
			<li>
				Enter a name, and an email if you want one. Both are written into the public key and visible
				to anyone who has it, so use a pseudonym and leave the email empty if you would rather not
				be identified.
			</li>
			<li>
				Choose a passphrase. It locks the private key, and you will need it every time you decrypt
				or sign. Use at least 8 characters. Longer is better.
			</li>
			<li>
				Choose a key type. ECC with Curve25519 is recommended: its keys are small and fast, and
				GnuPG and other current PGP programs read them. RSA is for older software, and 4096 bits is
				the size to pick for a key you will keep.
			</li>
			<li>
				Press Generate. Copy or download the private key before you leave or clear the page, because
				it cannot be shown again.
			</li>
		</ol>
	</Explainer>

	<Questions title="Questions about PGP keys">
		<Question q="Is it safe to use an online PGP key generator?">
			<p>
				Only if the keys are made on your device and never leave it. A generator that makes your
				private key on a server has held a copy of it.
			</p>
			<p>
				Here the key pair is made in your browser by the open-source OpenPGP.js library, using the
				browser's cryptographic random number generator. Nothing is uploaded, and you can disconnect
				from the internet before you press Generate to be sure. You are still trusting this site to
				serve the code it publishes. Every release is signed so that this can be checked (see the <a
					href="/about#verifying-this-deployment">About page</a
				>).
			</p>
			<p>
				For a key you will rely on for years, GnuPG on your own computer is the more cautious
				choice.
			</p>
		</Question>
		<Question q="Should I choose ECC or RSA?">
			<p>
				ECC with Curve25519, unless you have a reason not to. Its keys are short, quick to use and
				supported by current PGP software.
			</p>
			<p>
				Choose RSA if the person or system you deal with asks for it or runs old software, and pick
				4096 bits for a key you will keep. The NIST curves are for organisations whose rules require
				them.
			</p>
		</Question>
		<Question q="Do PGP keys made here expire?">
			<p>No. They have no expiry date, and the page does not make a revocation certificate.</p>
			<p>
				If you want either, import the private key into GnuPG, which can add an expiry date (<code
					>gpg --edit-key</code
				>) and make a revocation certificate (<code>gpg --gen-revoke</code>).
			</p>
		</Question>
		<Question q="What if I lose my private key or forget the passphrase?">
			<p>
				Then messages encrypted to that key cannot be read by anyone. No copy of the key or the
				passphrase exists outside your own devices.
			</p>
			<p>
				Download the private key as soon as it is made and keep it somewhere safe, such as a
				password manager or an encrypted drive, with a second copy elsewhere. Keep the passphrase
				where you will find it again, preferably not in the same place.
			</p>
		</Question>
		<Question q="How do I share my public key?">
			<p>
				Any way you like. Copy or download it, then send it by email, put it on your website or
				profile, or upload it to a key server such as <a
					href="https://keys.openpgp.org/"
					target="_blank"
					rel="noopener noreferrer">keys.openpgp.org</a
				>.
			</p>
			<p>
				Give people the fingerprint too, through a different channel if you can, so they can check
				that the key they received is yours. Never send anyone the private key.
			</p>
		</Question>
		<Question q="Can I use these keys in GnuPG or Kleopatra?">
			<p>
				Yes. They are standard OpenPGP keys. Save the private key to a file and import it with <code
					>gpg --import</code
				> or Kleopatra's import option. You may be asked for the passphrase you chose here.
			</p>
			<p>
				Curve25519 keys are written in the encoding GnuPG uses, and this project's tests import keys
				made here into GnuPG.
			</p>
		</Question>
	</Questions>
</ToolFrame>

<style>
	.optional {
		margin-left: 6px;
		font-size: 12px;
		font-weight: 500;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: var(--text-dim);
	}

	.identity-note {
		margin: -4px 0 0;
		padding-left: 2px;
		font-size: 12px;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	.strength {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding-left: 2px;
	}

	.strength-bars {
		display: flex;
		gap: 3px;
		padding-top: 7px;
		flex-shrink: 0;
	}

	.strength-bars span {
		width: 18px;
		height: 4px;
		background: var(--border-hover);
		border-radius: 2px;
		transition: background 0.2s ease;
	}

	.strength.weak .strength-bars span.on {
		background: var(--error);
	}
	.strength.fair .strength-bars span.on {
		background: var(--warning);
	}
	.strength.strong .strength-bars span.on {
		background: var(--success);
	}

	/* Windows high-contrast mode drops backgrounds, and these bars are nothing else */
	@media (forced-colors: active) {
		.strength-bars span.on {
			forced-color-adjust: none;
			background: CanvasText;
		}
	}

	.strength-text {
		font-size: 12px;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	.next-steps {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--border);
		border-radius: 12px;
		overflow: hidden;
	}

	.next-steps a {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 48px;
		padding: 10px 16px;
		font-size: 14px;
		font-weight: 500;
		color: var(--text);
		text-decoration: none;
		background: var(--surface);
		transition: background 0.15s ease;
	}

	.next-steps a + a {
		border-top: 1px solid var(--border);
	}

	.next-steps a:hover {
		background: var(--surface-2);
	}

	.next-steps :global(svg) {
		color: var(--text-dim);
		flex-shrink: 0;
	}

	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	@media (max-width: 500px) {
		.field-row {
			grid-template-columns: 1fr;
		}
	}

	input,
	select {
		width: 100%;
		padding: 14px 16px;
		font-family: var(--font);
		font-size: 16px;
		line-height: 1.4;
		color: var(--text);
		background: var(--surface);
		border: 1px solid var(--field-border);
		border-radius: 12px;
		transition: border-color 0.15s ease;
	}

	input::placeholder {
		color: var(--text-dim);
	}
	input:hover,
	select:hover {
		border-color: var(--field-border-hover);
	}
	/* The transparent outline becomes visible in forced-colours (high contrast) modes */
	input:focus,
	select:focus {
		outline: 2px solid transparent;
		border-color: var(--text);
		box-shadow: 0 0 0 1px var(--text);
	}

	select {
		cursor: pointer;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239494a0' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 12px center;
		padding-right: 40px;
	}

	.field-hint {
		font-size: 12px;
		padding-left: 2px;
	}
	.field-hint.error {
		color: var(--error);
	}

	.keys-output {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-bottom: 20px;
	}

	.fingerprint {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 12px 16px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
	}
	.fingerprint-label {
		font-size: 13px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--text-secondary);
	}
	.fingerprint code {
		font-family: var(--mono);
		font-size: 13px;
		color: var(--text);
		overflow-wrap: anywhere;
	}
	.fingerprint p {
		margin: 0;
		font-size: 12px;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	.download-both-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		width: 100%;
		padding: 14px 20px;
		font-family: var(--font);
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.download-both-btn:hover {
		border-color: var(--border-hover);
		background: var(--surface-2);
	}

	.warning-box {
		display: flex;
		gap: 12px;
		padding: 16px;
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid rgba(245, 158, 11, 0.2);
		border-radius: 12px;
		margin-bottom: 24px;
	}

	.warning-box :global(svg) {
		flex-shrink: 0;
		color: var(--warning);
		margin-top: 2px;
	}
	.warning-box p {
		margin: 0;
		font-size: 13px;
		line-height: 1.6;
		color: var(--text-secondary);
	}
</style>
