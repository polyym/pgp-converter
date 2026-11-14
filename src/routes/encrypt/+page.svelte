<script lang="ts">
	import { onMount } from 'svelte';
	import { SEO } from '#lib/components/index.ts';
	import {
		Explainer,
		OptionSection,
		PassphraseInput,
		Question,
		Questions,
		ResultPanel,
		ResultText,
		TextField,
		ToolFrame
	} from '#lib/components/tool/index.ts';
	import { encryptMessage } from '#lib/encryption.ts';
	import { takeKey } from '#lib/handoff.ts';
	import type { KeyInfo } from '#lib/keys.ts';
	import { createKeyInspector } from '#lib/stores/key-inspector.svelte.ts';
	import { createToolPage } from '#lib/stores/tool-page.svelte.ts';

	let plaintext = $state('');
	let publicKey = $state('');
	let encrypted = $state('');
	let signingKey = $state('');
	let signingPassphrase = $state('');
	// Who signed the message now in the output; undefined if it was sent unsigned
	let signedBy = $state<KeyInfo>();

	// Show whose keys have been pasted, shortly after the user stops typing
	const recipients = createKeyInspector(() => publicKey, 'encrypt');
	const signer = createKeyInspector(() => signingKey, 'sign');
	const isSigning = $derived(signingKey.trim().length > 0);
	const signingSummary = $derived.by(() => {
		if (!isSigning) {
			return 'Optional. Lets the recipient confirm it came from you';
		}
		const name = signer.keys[0]?.userIDs[0];
		return name ? `Signing as ${name}` : 'Signing with your private key';
	});

	const tool = createToolPage({
		submitLabel: 'Encrypt message',
		canSubmit: () => plaintext.trim().length > 0 && publicKey.trim().length > 0,
		onSubmit: encrypt,
		canClear: () => !!(plaintext || publicKey || signingKey || signingPassphrase || encrypted),
		onClear: clearAll,
		copyable: () => encrypted,
		// The passphrase unlocks the signing key but changes nothing in the message
		resultInputs: () => [plaintext, publicKey, signingKey]
	});

	function encrypt() {
		void tool.run({
			work: () =>
				encryptMessage(
					plaintext,
					publicKey,
					isSigning ? { armoredPrivateKey: signingKey, passphrase: signingPassphrase } : undefined
				),
			onSuccess: (result) => {
				encrypted = result.data ?? '';
				signedBy = result.signer;
				return { message: result.signer ? 'Signed and encrypted' : 'Encrypted' };
			},
			onFailure: () => {
				encrypted = '';
				signedBy = undefined;
			},
			fallbackError: 'Encryption failed'
		});
	}

	function clearAll() {
		tool.reset();
		plaintext = '';
		publicKey = '';
		signingKey = '';
		signingPassphrase = '';
		encrypted = '';
		signedBy = undefined;
	}

	onMount(() => {
		// A key just made on the Generate page arrives ready to use
		const handed = takeKey();
		if (handed?.publicKey) {
			publicKey = handed.publicKey;
		}
	});
</script>

<SEO
	title="PGP Encryption Online: Encrypt a Message in Your Browser"
	description="Free PGP encryption online. Paste a public key and your message to get PGP-encrypted text, signed if you like. Runs in your browser; nothing is uploaded."
	path="/encrypt"
/>

<ToolFrame
	page="encrypt"
	title="Encrypt a PGP Message"
	subtitle="Only the holder of the matching private key will be able to read it."
	{tool}
	submitText={isSigning ? 'Sign & Encrypt' : 'Encrypt'}
>
	{#snippet fields()}
		<TextField
			id="plaintext"
			error={tool.errorFor('plaintext')}
			label="Message"
			bind:value={plaintext}
			placeholder="Enter message..."
		/>

		<TextField
			id="publicKey"
			error={tool.errorFor('publicKey')}
			label="Public Key"
			bind:value={publicKey}
			placeholder="Paste public key..."
			isMonospace
			canOpenFiles
			keysTitle={recipients.keys.length === 1
				? 'Encrypting to'
				: `Encrypting to ${String(recipients.keys.length)} keys`}
			keys={recipients.keys}
			keysHint="Confirm the fingerprint with the recipient through another channel before you rely on this key."
			canHoldSeveral
			addHint="To write to more people, paste or open their keys as well. Each one is added to this list."
		/>

		<OptionSection
			icon="sign"
			title="Sign this message"
			summary={signingSummary}
			note="Signing uses your own private key, not the recipient's. It never leaves this browser and is not included in the message."
			isActive={isSigning}
		>
			<TextField
				id="signingKey"
				error={tool.errorFor('signingKey')}
				label="Your Private Key"
				bind:value={signingKey}
				placeholder="Paste your private key..."
				isMonospace
				canOpenFiles
				keysTitle="Signing as"
				keys={signer.keys}
			/>
			<div class="field">
				<label for="signingPassphrase">Passphrase</label>
				<PassphraseInput
					id="signingPassphrase"
					error={tool.errorFor('signingPassphrase')}
					bind:value={signingPassphrase}
					placeholder="Enter passphrase..."
					autocomplete="off"
				/>
			</div>
		</OptionSection>
	{/snippet}

	{#snippet result()}
		<ResultPanel
			{tool}
			label="Encrypted message"
			filename="message.asc"
			what="encrypted message"
			tone={encrypted ? 'good' : undefined}
			staleWithheld="The message or a key has changed since this was encrypted. Press Encrypt to make it again."
			staleAccepted="This is the message as it was encrypted before the change. Press Encrypt to make it again."
		>
			<div class="output-body">
				{#if encrypted}
					<ResultText text={encrypted} />
				{:else}
					<ol class="placeholder-steps">
						<li>Write your message.</li>
						<li>Add the recipient's public key.</li>
						<li>Press Encrypt. The encrypted message appears here.</li>
					</ol>
				{/if}
			</div>
			{#if encrypted}
				{#if signedBy}
					<p class="output-note signed">
						<strong>Signed.</strong> The recipient can confirm it came from {signedBy.userIDs[0] ??
							'your key'} by checking it against your public key.
					</p>
				{:else}
					<p class="output-note">Not signed. The recipient has no proof of who sent this.</p>
				{/if}
			{/if}
		</ResultPanel>
	{/snippet}

	<Explainer title="How to encrypt a PGP message">
		<p>A message encrypted with someone's public key can only be read with their private key.</p>
		<ol>
			<li>Write or paste your message.</li>
			<li>
				Add the recipient's public key. The page shows whose key it is and its fingerprint, so you
				can check it is the right one. To write to several people, add each of their keys.
			</li>
			<li>
				If you want the recipient to know the message is from you, open "Sign this message" and add
				your own private key and its passphrase.
			</li>
			<li>
				Press Encrypt. Send the result, which begins with <code>-----BEGIN PGP MESSAGE-----</code>,
				by email, chat or any other channel.
			</li>
		</ol>
		<p>
			Without a signature the recipient cannot tell who sent the message, because anyone with their
			public key can write to them.
		</p>
	</Explainer>

	<Questions title="Questions about PGP encryption">
		<Question q="Is it safe to encrypt a PGP message online?">
			<p>
				It is if the encryption happens on your device, as it does here. The page uses the
				open-source OpenPGP.js library in your browser. Your message and keys are not uploaded or
				saved, and you can check this by disconnecting from the internet before you encrypt.
			</p>
			<p>
				You are still trusting this site to serve the code it publishes. Every release is signed so
				that this can be checked (see the <a href="/about#verifying-this-deployment">About page</a
				>). For anything high-stakes, use a program on your own computer such as GnuPG.
			</p>
		</Question>
		<Question q="Do I need my own PGP key to encrypt a message?">
			<p>
				No. You only need the public key of the person you are writing to. It begins with <code
					>-----BEGIN PGP PUBLIC KEY BLOCK-----</code
				> and can be sent openly.
			</p>
			<p>
				You need a key of your own so that people can write back to you, or to sign what you send.
				You can make one on the <a href="/generate">Generate page</a>.
			</p>
		</Question>
		<Question q="Can I encrypt one message for several people?">
			<p>
				Yes. Add each person's public key to the Public Key box. Once the box holds a key, Paste and
				Open file add the next one to the list. Each recipient can decrypt the message with their
				own private key.
			</p>
			<p>
				Anyone who sees the encrypted message can tell how many keys it was written to, and their
				key IDs, but not what it says.
			</p>
		</Question>
		<Question q="Can I decrypt a message after I have encrypted it?">
			<p>Not with the recipient's public key. Only their private key can open it.</p>
			<p>
				To be able to read it later, keep the original text, or add your own public key next to the
				recipient's so that the message is encrypted to you as well.
			</p>
		</Question>
		<Question q="Will the encrypted message work with GnuPG or Kleopatra?">
			<p>
				Yes. The output is a standard OpenPGP message in ASCII armour. This project's tests exchange
				messages with GnuPG in both directions, using Curve25519, NIST P-256 and RSA keys. Kleopatra
				and Gpg4win use GnuPG underneath.
			</p>
		</Question>
		<Question q="Can I encrypt a file?">
			<p>
				No. This page encrypts text only. For documents, pictures and other files, use a program
				such as GnuPG or Kleopatra with the same public key.
			</p>
		</Question>
	</Questions>
</ToolFrame>
