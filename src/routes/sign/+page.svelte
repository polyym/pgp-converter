<script lang="ts">
	import { onMount } from 'svelte';
	import { SEO } from '#lib/components/index.ts';
	import {
		Explainer,
		ModeSwitch,
		PassphraseInput,
		Question,
		Questions,
		ResultPanel,
		ResultText,
		TextField,
		ToolFrame
	} from '#lib/components/tool/index.ts';
	import { takeKey } from '#lib/handoff.ts';
	import type { KeyInfo } from '#lib/keys.ts';
	import { signMessage } from '#lib/signatures.ts';
	import { createKeyInspector } from '#lib/stores/key-inspector.svelte.ts';
	import { createToolPage } from '#lib/stores/tool-page.svelte.ts';

	let message = $state('');
	let privateKey = $state('');
	let passphrase = $state('');
	let signed = $state('');
	let signedBy = $state<KeyInfo>();

	const signer = createKeyInspector(() => privateKey, 'sign');
	const tool = createToolPage({
		submitLabel: 'Sign message',
		canSubmit: () => message.trim().length > 0 && privateKey.trim().length > 0,
		onSubmit: sign,
		canClear: () => !!(message || privateKey || passphrase || signed),
		onClear: clearAll,
		copyable: () => signed,
		// The passphrase unlocks the key but changes nothing in what is signed
		resultInputs: () => [message, privateKey]
	});

	function sign() {
		void tool.run({
			work: () => signMessage(message, privateKey, passphrase),
			onSuccess: (result) => {
				signed = result.data ?? '';
				signedBy = result.signer;
				return { message: 'Signed' };
			},
			onFailure: () => {
				signed = '';
				signedBy = undefined;
			},
			fallbackError: 'Signing failed'
		});
	}

	function clearAll() {
		tool.reset();
		message = '';
		privateKey = '';
		passphrase = '';
		signed = '';
		signedBy = undefined;
	}

	onMount(() => {
		// A key just made on the Generate page arrives ready to use
		const handed = takeKey();
		if (handed?.privateKey) {
			privateKey = handed.privateKey;
		}
	});
</script>

<SEO
	title="PGP Sign Message Online: Free Browser-Based Signing Tool"
	description="Sign a message with your PGP private key in your browser. Anyone can read the signed message and check that it came from you. No data leaves your device."
	path="/sign"
/>

<ToolFrame
	page="sign"
	title="Sign a PGP Message"
	subtitle="Prove a message came from you. Anyone can still read it."
	{tool}
	submitText="Sign"
>
	{#snippet headerExtra()}
		<ModeSwitch current="sign" />
	{/snippet}

	{#snippet fields()}
		<TextField
			id="message"
			error={tool.errorFor('message')}
			label="Message"
			bind:value={message}
			placeholder="Enter message..."
		/>

		<TextField
			id="privateKey"
			error={tool.errorFor('privateKey')}
			label="Your Private Key"
			bind:value={privateKey}
			placeholder="Paste your private key..."
			isMonospace
			canOpenFiles
			keysTitle="Signing as"
			keys={signer.keys}
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
	{/snippet}

	{#snippet result()}
		<ResultPanel
			{tool}
			label="Signed message"
			filename="signed-message.asc"
			what="signed message"
			tone={signed ? 'good' : undefined}
			staleWithheld="The message or the key has changed since this was signed. Press Sign to make it again."
			staleAccepted="This is the message as it was signed before the change. Press Sign to make it again."
		>
			<div class="output-body">
				{#if signed}
					<ResultText text={signed} />
				{:else}
					<ol class="placeholder-steps">
						<li>Write your message.</li>
						<li>Add your private key and its passphrase.</li>
						<li>Press Sign. The signed message appears here.</li>
					</ol>
				{/if}
			</div>
			{#if signed}
				<p class="output-note signed">
					<strong>Signed{signedBy?.userIDs[0] ? ` as ${signedBy.userIDs[0]}` : ''}.</strong> Send the
					whole block. The text stays readable by anyone, and changing a single character breaks the signature.
				</p>
			{/if}
		</ResultPanel>
	{/snippet}

	<Explainer title="How to sign a PGP message">
		<p>
			A signature shows that a message came from the holder of a private key and has not been
			changed. It does not hide the message.
		</p>
		<ol>
			<li>
				Write your message. Finish editing first, because any later change breaks the signature.
			</li>
			<li>
				Add your private key and its passphrase. Leave the passphrase empty if the key has none.
			</li>
			<li>
				Press Sign. Send or publish the whole result, from <code
					>-----BEGIN PGP SIGNED MESSAGE-----</code
				> to the end of the signature.
			</li>
		</ol>
		<p>
			Anyone with your public key can check the signature on the <a href="/verify">Verify page</a>
			or in any PGP program. To keep the message private as well, use the
			<a href="/encrypt">Encrypt page</a>, which can sign and encrypt together.
		</p>
	</Explainer>

	<Questions title="Questions about PGP signatures">
		<Question q="What is the difference between signing and encrypting?">
			<p>
				Encrypting hides what a message says and uses the recipient's public key. Signing shows who
				wrote it and that it has not been altered, and uses your own private key. A signed message
				can be read by anyone.
			</p>
			<p>
				To send a message that is both private and signed, use "Sign this message" on the <a
					href="/encrypt">Encrypt page</a
				>.
			</p>
		</Question>
		<Question q="Does signing a message reveal my private key?">
			<p>No. The key is not part of the signature and cannot be worked out from it.</p>
			<p>A signature does show which key made it and when, by your device's clock.</p>
		</Question>
		<Question q="What kind of PGP signature does this page make?">
			<p>
				A cleartext signature: your text as you wrote it, followed by a signature block. People can
				read the text without any PGP software, which suits posts, announcements and emails.
			</p>
			<p>
				The page does not sign files or make detached signatures (a separate <code>.sig</code> file),
				which software downloads use. GnuPG does both.
			</p>
		</Question>
		<Question q="How do I prove that an account or a key is mine?">
			<p>
				Sites that use PGP for this give you a line of text to sign, often with a random code in it.
				Paste the text here exactly as given, sign it, and post the whole signed block back.
			</p>
			<p>
				Anyone with your public key can then confirm that the holder of the matching private key
				signed that text.
			</p>
		</Question>
		<Question q="How does someone check my signature?">
			<p>
				They need your public key and the complete signed message. They can paste both into the <a
					href="/verify">Verify page</a
				>
				or use any PGP program, for example <code>gpg --verify</code>.
			</p>
			<p>
				Give people your key's fingerprint through a separate channel, such as in person or on a
				profile they already trust, so they know the key is yours.
			</p>
		</Question>
	</Questions>
</ToolFrame>
