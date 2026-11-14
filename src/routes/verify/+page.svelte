<script lang="ts">
	import { SEO } from '#lib/components/index.ts';
	import {
		Explainer,
		ModeSwitch,
		Question,
		Questions,
		ResultPanel,
		ResultText,
		SignatureVerdict,
		TextField,
		ToolFrame
	} from '#lib/components/tool/index.ts';
	import { verifyMessage, type SignatureCheck } from '#lib/signatures.ts';
	import { createKeyInspector } from '#lib/stores/key-inspector.svelte.ts';
	import { createToolPage } from '#lib/stores/tool-page.svelte.ts';
	import { summariseSignatures } from '#lib/verdicts.ts';

	let signedMessage = $state('');
	let publicKey = $state('');
	let text = $state('');
	// A signed message can be empty, so a result is tracked separately from its text
	let hasOutput = $state(false);
	let signatures = $state<SignatureCheck[]>([]);

	// The text is only as good as its weakest signature
	const summary = $derived(summariseSignatures(signatures));

	const sender = createKeyInspector(() => publicKey, 'verify');
	const tool = createToolPage({
		submitLabel: 'Verify signature',
		canSubmit: () => signedMessage.trim().length > 0 && publicKey.trim().length > 0,
		onSubmit: verify,
		canClear: () => !!(signedMessage || publicKey || hasOutput),
		onClear: clearAll,
		copyable: () => text,
		// The verdict is about this message and these keys, and about no others
		resultInputs: () => [signedMessage, publicKey]
	});

	function verify() {
		void tool.run({
			work: () => verifyMessage(signedMessage, publicKey),
			onSuccess: (result) => {
				text = result.data ?? '';
				signatures = result.signatures ?? [];
				hasOutput = true;
				const verdict = summariseSignatures(signatures);
				return { message: verdict.message, isProblem: verdict.tone !== 'good' };
			},
			onFailure: () => {
				text = '';
				signatures = [];
				hasOutput = false;
			},
			fallbackError: 'Verification failed'
		});
	}

	function clearAll() {
		tool.reset();
		signedMessage = '';
		publicKey = '';
		text = '';
		signatures = [];
		hasOutput = false;
	}
</script>

<SEO
	title="Verify a PGP Signature Online: Free Browser-Based Checker"
	description="Check a PGP signed message against the sender's public key in your browser. See who signed it and whether it was changed. Fully client-side."
	path="/verify"
/>

<ToolFrame
	page="verify"
	title="Verify a PGP Signature"
	subtitle="Check who signed a message and that it has not been changed."
	{tool}
	submitText="Verify"
>
	{#snippet headerExtra()}
		<ModeSwitch current="verify" />
	{/snippet}

	{#snippet fields()}
		<TextField
			id="signedMessage"
			error={tool.errorFor('signedMessage')}
			label="Signed Message"
			bind:value={signedMessage}
			placeholder="Paste signed message..."
			isMonospace
			canOpenFiles
		/>

		<TextField
			id="publicKey"
			error={tool.errorFor('publicKey')}
			label="Sender's Public Key"
			bind:value={publicKey}
			placeholder="Paste the sender's public key..."
			isMonospace
			canOpenFiles
			keysTitle="Checking against"
			keys={sender.keys}
			keysHint="A valid signature proves which key signed. Confirm the fingerprint with the sender to know whose key it is."
			canHoldSeveral
			addHint="Not sure which key signed? Paste or open another. Each one is added to this list."
		/>
	{/snippet}

	{#snippet result()}
		<ResultPanel
			{tool}
			label="Verification result"
			heading="Result"
			filename="message.txt"
			what="signed text"
			canShare={false}
			copyText="Copy text"
			tone={hasOutput ? summary.tone : undefined}
			isVerdictFirst
			staleWithheld="The message or a key has changed since this was checked, so the verdict below is not about what is in the boxes now. Press Verify again."
			staleAccepted="The verdict and the text below are from before the change, and are not about what is in the boxes now. Press Verify again."
		>
			{#if hasOutput}
				<SignatureVerdict {signatures} wereKeysSupplied={true} isMuted={tool.isResultStale} />
				<div class="output-body with-label">
					<span class="output-label"
						>{summary.tone === 'good' ? 'Signed text' : 'Text, not confirmed'}</span
					>
					{#if text}
						<ResultText {text} isProse />
					{:else}
						<span class="empty-result">The signed text is empty.</span>
					{/if}
				</div>
			{:else}
				<div class="output-body">
					<ol class="placeholder-steps">
						<li>Add the signed message.</li>
						<li>Add the sender's public key.</li>
						<li>Press Verify. The result appears here.</li>
					</ol>
				</div>
			{/if}
		</ResultPanel>
	{/snippet}

	<Explainer title="How to verify a PGP signature">
		<p>
			Verifying checks that a message was signed by a particular key and has not been changed since.
		</p>
		<ol>
			<li>
				Paste the whole signed message, from <code>-----BEGIN PGP SIGNED MESSAGE-----</code> to
				<code>-----END PGP SIGNATURE-----</code>.
			</li>
			<li>
				Add the sender's public key. Get it from the sender or somewhere you trust, not from the
				message itself. If you are not sure which key signed, add several.
			</li>
			<li>
				Press Verify. The result says whether the signature is valid, which key made it and when.
			</li>
		</ol>
		<p>
			A valid signature proves which key signed. To know whose key it is, compare its fingerprint
			with one the sender gave you through another channel.
		</p>
		<p>
			To check the signature on an encrypted message, use the <a href="/decrypt">Decrypt page</a>.
		</p>
	</Explainer>

	<Questions title="Questions about verifying a PGP signature">
		<Question q="What does a valid PGP signature prove?">
			<p>
				That the text was signed by the private key matching the public key you supplied, and that
				it has not been changed since.
			</p>
			<p>
				It does not prove who owns that key, because anyone can make a key with any name on it.
				Compare the fingerprint in the result with one the sender has given you through a channel
				you trust.
			</p>
		</Question>
		<Question q="Why does it say the message was signed by a different key?">
			<p>
				The signature was made by a key that is not among the ones you pasted, so it could not be
				checked. That does not mean it is bad.
			</p>
			<p>
				The result shows the ID of the key that signed. Ask the sender for that public key, or paste
				all of their keys at once.
			</p>
		</Question>
		<Question q="Why does the signature not match?">
			<p>
				Either the text was changed after it was signed, or the signature was not made by the key it
				names. Often the cause is innocent: an email program or a forum re-wrapped the lines,
				changed the quotation marks or dropped a blank line.
			</p>
			<p>
				Copy the whole block again from the original source. If it still does not match, do not rely
				on the message, and ask the sender to send it again.
			</p>
		</Question>
		<Question q="Where do I get the sender's public key?">
			<p>
				From the sender, or from a place they control, such as their website, a profile, or a key
				server like <a href="https://keys.openpgp.org/" target="_blank" rel="noopener noreferrer"
					>keys.openpgp.org</a
				>. A public key is not secret, and verifying needs no private key or passphrase.
			</p>
			<p>
				Do not take the key from the message you are checking. Someone who forged the message could
				supply a matching key of their own.
			</p>
		</Question>
		<Question q="Can I verify a downloaded file or a detached signature?">
			<p>
				No. This page checks signed text: messages that begin with <code
					>-----BEGIN PGP SIGNED MESSAGE-----</code
				>, and signed messages in a <code>-----BEGIN PGP MESSAGE-----</code> block.
			</p>
			<p>
				Software downloads usually come with a separate <code>.sig</code> or <code>.asc</code>
				file. Check those with GnuPG: <code>gpg --verify file.sig file</code>.
			</p>
		</Question>
	</Questions>
</ToolFrame>
