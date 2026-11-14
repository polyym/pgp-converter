<script lang="ts">
	import { SEO } from '#lib/components/index.ts';
	import {
		Explainer,
		OptionSection,
		PassphraseInput,
		Question,
		Questions,
		ResultPanel,
		ResultText,
		SignatureVerdict,
		TextField,
		ToolFrame
	} from '#lib/components/tool/index.ts';
	import { decryptMessage } from '#lib/decryption.ts';
	import type { SignatureCheck } from '#lib/signatures.ts';
	import { createKeyInspector } from '#lib/stores/key-inspector.svelte.ts';
	import { createToolPage } from '#lib/stores/tool-page.svelte.ts';
	import { summariseSignatures } from '#lib/verdicts.ts';

	let encrypted = $state('');
	let privateKey = $state('');
	let passphrase = $state('');
	let decrypted = $state('');
	// A message can decrypt to an empty string, so success is tracked separately from the text
	let hasOutput = $state(false);
	let senderKey = $state('');
	let signatures = $state<SignatureCheck[]>([]);
	// Whether the result on screen was checked against a sender's key
	let wasSenderChecked = $state(false);

	const sender = createKeyInspector(() => senderKey, 'verify');
	const ownKey = createKeyInspector(() => privateKey, 'decrypt');
	const isChecking = $derived(senderKey.trim().length > 0);
	const hasBadSignature = $derived(summariseSignatures(signatures).tone === 'bad');
	const checkingSummary = $derived.by(() => {
		if (!isChecking) {
			return "Optional. Verifies the signature with the sender's public key";
		}
		const name = sender.keys[0]?.userIDs[0];
		return name ? `Checking against ${name}` : "Checking against the sender's key";
	});

	const tool = createToolPage({
		submitLabel: 'Decrypt message',
		canSubmit: () => encrypted.trim().length > 0 && privateKey.trim().length > 0,
		onSubmit: decrypt,
		canClear: () => !!(encrypted || privateKey || passphrase || senderKey || hasOutput),
		onClear: clearAll,
		copyable: () => decrypted,
		// Your own key and passphrase open the message; the result is a matter of the message and the sender's key
		resultInputs: () => [encrypted, senderKey]
	});

	function decrypt() {
		void tool.run({
			work: () => decryptMessage(encrypted, privateKey, passphrase, senderKey),
			onSuccess: (result) => {
				decrypted = result.data ?? '';
				hasOutput = true;
				signatures = result.signatures ?? [];
				wasSenderChecked = isChecking;
				return { message: 'Decrypted' };
			},
			onFailure: () => {
				decrypted = '';
				hasOutput = false;
				signatures = [];
			},
			fallbackError: 'Decryption failed'
		});
	}

	function clearAll() {
		tool.reset();
		encrypted = '';
		privateKey = '';
		passphrase = '';
		decrypted = '';
		senderKey = '';
		hasOutput = false;
		signatures = [];
	}
</script>

<SEO
	title="PGP Decryption Online: Decrypt a Message in Your Browser"
	description="Free PGP decryption online. Paste the encrypted message, your private key and passphrase to read it. Runs in your browser; your key is never uploaded."
	path="/decrypt"
/>

<ToolFrame
	page="decrypt"
	title="Decrypt a PGP Message"
	subtitle="Read a message that was encrypted to your public key."
	{tool}
	submitText="Decrypt"
>
	{#snippet fields()}
		<TextField
			id="encrypted"
			error={tool.errorFor('encrypted')}
			label="Encrypted Message"
			bind:value={encrypted}
			placeholder="Paste encrypted message..."
			isMonospace
			canOpenFiles
		/>

		<TextField
			id="privateKey"
			error={tool.errorFor('privateKey')}
			label="Private Key"
			bind:value={privateKey}
			placeholder="Paste private key..."
			isMonospace
			canOpenFiles
			keysTitle="Decrypting with"
			keys={ownKey.keys}
		/>

		<div class="field">
			<label for="passphrase">Passphrase</label>
			<PassphraseInput
				id="passphrase"
				error={tool.errorFor('passphrase')}
				bind:value={passphrase}
				placeholder="Enter passphrase..."
				autocomplete="off"
			/>
		</div>

		<OptionSection
			icon="verify"
			title="Check who sent it"
			summary={checkingSummary}
			note="If the sender signed the message, their public key shows whether it really came from them and arrived unchanged."
			isActive={isChecking}
		>
			<TextField
				id="senderKey"
				error={tool.errorFor('senderKey')}
				label="Sender's Public Key"
				bind:value={senderKey}
				placeholder="Paste the sender's public key..."
				isMonospace
				canOpenFiles
				keysTitle="Checking against"
				keys={sender.keys}
				keysHint="A valid signature proves which key signed. Confirm the fingerprint with the sender to know whose key it is."
				canHoldSeveral
				addHint="Not sure which key signed? Paste or open another. Each one is added to this list."
			/>
		</OptionSection>
	{/snippet}

	{#snippet result()}
		<ResultPanel
			{tool}
			label="Decrypted message"
			filename="message.txt"
			what="decrypted message"
			canShare={false}
			tone={hasOutput ? (hasBadSignature ? 'bad' : 'good') : undefined}
			staleWithheld="The message or the sender's key has changed since this was decrypted. Press Decrypt again."
			staleAccepted="This is the result from before the change. Press Decrypt again."
		>
			<div class="output-body">
				{#if decrypted}
					<ResultText text={decrypted} isProse />
				{:else if hasOutput}
					<span class="empty-result">The message decrypted successfully, but it is empty.</span>
				{:else}
					<ol class="placeholder-steps">
						<li>Add the encrypted message.</li>
						<li>Add your private key and its passphrase.</li>
						<li>Press Decrypt. The message appears here.</li>
					</ol>
				{/if}
			</div>
			{#if hasOutput}
				<SignatureVerdict
					{signatures}
					wereKeysSupplied={wasSenderChecked}
					isMuted={tool.isResultStale}
					howToCheck="To check it, open the option above the output, paste the sender's public key and decrypt again."
				/>
			{/if}
		</ResultPanel>
	{/snippet}

	<Explainer title="How to decrypt a PGP message">
		<p>
			To read a message that was encrypted to your public key, you need your private key and its
			passphrase.
		</p>
		<ol>
			<li>
				Paste the whole encrypted message, from <code>-----BEGIN PGP MESSAGE-----</code> to
				<code>-----END PGP MESSAGE-----</code>.
			</li>
			<li>Add your private key.</li>
			<li>Enter its passphrase. Leave this empty if the key has none.</li>
			<li>
				If you have the sender's public key, open "Check who sent it" and add it. The page then says
				whether the message was signed with that key.
			</li>
			<li>Press Decrypt.</li>
		</ol>
		<p>
			If something is wrong, the error names the input at fault: the message, the key or the
			passphrase.
		</p>
		<p>
			Decrypting shows what a message says, not who wrote it. Anyone with your public key can write
			to you, so only a signature checked against the sender's key tells you who it came from.
		</p>
	</Explainer>

	<Questions title="Questions about PGP decryption">
		<Question q="Is it safe to paste my private key into a website?">
			<p>
				Only where you can be confident it stays on your device. On this page the key is read by
				code running in your browser. It is not uploaded or saved, and the page clears itself after
				15 minutes without activity. You can check this by disconnecting from the internet before
				you paste.
			</p>
			<p>
				You are still trusting this site to serve the code it publishes. Every release is signed so
				that this can be checked (see the <a href="/about#verifying-this-deployment">About page</a
				>). If the key protects something valuable, use a program on your own computer such as
				GnuPG.
			</p>
		</Question>
		<Question q="Can I decrypt a PGP message without the private key?">
			<p>
				No. A PGP message can only be opened with a private key that matches one of the public keys
				it was encrypted to.
			</p>
			<p>
				If the page says the message was not encrypted with the key you provided, the sender used a
				different public key. Send them your current public key and ask them to encrypt the message
				again.
			</p>
		</Question>
		<Question q="What if I have forgotten my passphrase?">
			<p>It cannot be reset. Nobody else has a copy of your key or its passphrase.</p>
			<p>
				If you cannot recall it, make a new key pair, give people the new public key, and ask for
				anything important to be sent again. Messages encrypted to the old key stay unreadable.
			</p>
		</Question>
		<Question q="Why will my PGP message not decrypt?">
			<p>The usual causes:</p>
			<ul>
				<li>
					<strong>Part of the message is missing.</strong> Copy everything from
					<code>-----BEGIN PGP MESSAGE-----</code>
					to <code>-----END PGP MESSAGE-----</code>.
				</li>
				<li>
					<strong>It was encrypted to a different key.</strong> The sender has to use the public key that
					matches your private key.
				</li>
				<li>
					<strong>The passphrase is wrong.</strong> Check Caps Lock and the keyboard layout.
				</li>
				<li>
					<strong>The text was changed on the way.</strong> The page repairs quote marks, indentation
					and lost line breaks. If characters are missing, ask for the message as a file and open it here.
				</li>
			</ul>
			<p>The error on the page says which of these it is.</p>
		</Question>
		<Question q="Can it decrypt messages made with GnuPG or Kleopatra?">
			<p>
				Yes. Any standard OpenPGP message encrypted to your public key can be decrypted here. This
				project's tests decrypt messages made by GnuPG, which Kleopatra and Gpg4win use underneath.
			</p>
			<p>
				The page reads armoured text only. It does not decrypt files, binary <code>.gpg</code> files,
				or messages protected with a password instead of a key.
			</p>
		</Question>
		<Question q="Is the decrypted message stored anywhere?">
			<p>
				No. It exists only in this page's memory. It is gone when you press Clear, close the tab, or
				leave the page untouched for 15 minutes.
			</p>
			<p>If you copy the message, it stays on your clipboard until you copy something else.</p>
		</Question>
	</Questions>
</ToolFrame>
