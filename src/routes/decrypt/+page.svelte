<script lang="ts">
  import { decryptMessage } from '$lib/decryption';
  import { createFeedback } from '$lib/feedback.svelte';
  import { createToolPage, copyText } from '$lib/tool-page.svelte';
  import { LOADING_DELAY_MS, COPY_FEEDBACK_MS, COPY_ERROR_MS } from '$lib/constants';
  import { NavBar, ShortcutsModal, Toast, PageFooter, PageHeader, DonationBanner, SEO, PassphraseInput } from '$lib/components';
  import { onMount, tick } from 'svelte';

  let outputElement = $state<HTMLElement>();
  let encrypted = $state('');
  let privateKey = $state('');
  let passphrase = $state('');
  let decrypted = $state('');
  // A message can decrypt to an empty string, so success is tracked separately from the text
  let hasOutput = $state(false);
  let signed = $state(false);
  let isLoading = $state(false);
  let copySuccess = $state(false);

  const isValid = $derived(encrypted.trim().length > 0 && privateKey.trim().length > 0);
  const hasContent = $derived(!!(encrypted || privateKey || passphrase || hasOutput));

  const feedback = createFeedback();
  const tool = createToolPage({
    submitLabel: 'Decrypt message',
    onSubmit: handleDecrypt,
    onCopy: copyToClipboard,
    canCopy: () => !!decrypted,
    onClear: clearAll,
    canClear: () => hasContent
  });

  async function handleDecrypt() {
    if (!isValid || isLoading) return;

    // A result that arrives after the form was cleared must not reappear
    const isCurrent = tool.startRun();
    isLoading = true;
    feedback.clear();

    await new Promise(resolve => setTimeout(resolve, LOADING_DELAY_MS));
    if (!isCurrent()) return;

    const result = await decryptMessage(encrypted, privateKey, passphrase);
    if (!isCurrent()) return;

    if (result.success && result.data !== undefined) {
      decrypted = result.data;
      hasOutput = true;
      signed = !!result.signed;
      feedback.showSuccess('Decrypted');
      tool.offerDonation();
    } else {
      decrypted = '';
      hasOutput = false;
      signed = false;
      feedback.showError(result.error || 'Decryption failed');
    }
    isLoading = false;

    if (hasOutput) {
      await tick();
      tool.revealResult(outputElement);
    }
  }

  async function copyToClipboard() {
    if (!decrypted) return;

    if (await copyText(decrypted)) {
      copySuccess = true;
      setTimeout(() => copySuccess = false, COPY_FEEDBACK_MS);
    } else {
      feedback.showError('Failed to copy', COPY_ERROR_MS);
    }
  }

  function clearAll() {
    tool.cancelRuns();
    isLoading = false;
    encrypted = '';
    privateKey = '';
    passphrase = '';
    decrypted = '';
    hasOutput = false;
    signed = false;
    feedback.clear();
  }

  onMount(() => {
    const stopShortcuts = tool.mount();
    return () => {
      stopShortcuts();
      feedback.clear();
    };
  });
</script>

<SEO
  title="PGP Decrypt Message Online: Free Browser-Based Decryption Tool"
  description="Decrypt PGP-encrypted messages in your browser. Paste the ciphertext, your private key, and passphrase to reveal the original message. Fully client-side."
  path="/decrypt"
/>

<div class="app">
  <NavBar currentPage="decrypt" />
  <ShortcutsModal show={tool.showShortcuts} shortcuts={tool.shortcuts} onClose={tool.closeShortcuts} />

  <main class="main">
    <PageHeader
      title="Decrypt a PGP Message"
      onShortcutsClick={tool.hintsVisible ? tool.toggleShortcuts : undefined}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
      </svg>
    </PageHeader>

    <Toast type="success" message={feedback.success} show={!!feedback.success} />
    <Toast type="error" message={feedback.error} show={!!feedback.error} />

    <div class="fields">
      <div class="field">
        <label for="encrypted">Encrypted Message</label>
        <textarea
          id="encrypted"
          bind:value={encrypted}
          placeholder="Paste encrypted message..."
          rows="4"
          class="mono"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
        ></textarea>
      </div>

      <div class="field">
        <label for="privateKey">Private Key</label>
        <textarea
          id="privateKey"
          bind:value={privateKey}
          placeholder="Paste private key..."
          rows="4"
          class="mono"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
        ></textarea>
      </div>

      <div class="field">
        <label for="passphrase">Passphrase</label>
        <PassphraseInput
          id="passphrase"
          bind:value={passphrase}
          placeholder="Enter passphrase..."
          autocomplete="off"
        />
      </div>
    </div>

    <div
      class="output"
      class:has-content={hasOutput}
      bind:this={outputElement}
      tabindex="-1"
      role="region"
      aria-label="Decrypted message"
    >
      <div class="output-header">
        <span>Output</span>
        {#if decrypted}
          <button class="copy-btn" onclick={copyToClipboard}>
            {#if copySuccess}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Copied
            {:else}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copy
              {#if tool.hintsVisible}<kbd>{tool.keys.copyHint}</kbd>{/if}
            {/if}
          </button>
        {/if}
      </div>
      <div class="output-body">
        {#if decrypted}
          <pre>{decrypted}</pre>
        {:else if hasOutput}
          <span class="empty-result">The message decrypted successfully, but it is empty.</span>
        {:else}
          <span class="placeholder">Decrypted message appears here</span>
        {/if}
      </div>
      {#if hasOutput && signed}
        <p class="output-note"><strong>Signature not checked.</strong> This message carries a digital signature, but PGP Converter does not verify signatures, so it cannot confirm who sent it.</p>
      {/if}
    </div>

    <details class="explainer">
      <summary>
        How to decrypt a PGP message
        <svg class="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </summary>
      <p>Decryption uses your private key and passphrase to unlock a message that was encrypted for you. Without all three inputs correct, the plaintext stays sealed.</p>
      <ol>
        <li><strong>Paste the encrypted message.</strong> It begins with <code>-----BEGIN PGP MESSAGE-----</code>. Copy the whole block including header and footer.</li>
        <li><strong>Paste your private key.</strong> This is the secret half of your keypair; never share it with anyone.</li>
        <li><strong>Enter your passphrase.</strong> The one you set when generating the key. Leave it blank if your key has none.</li>
        <li><strong>Decrypt.</strong> The original plaintext appears in the output panel.</li>
      </ol>
      <p>If the passphrase is wrong, the private key doesn't match the message, or the ciphertext was truncated, you'll see a specific error rather than a partial result. Your private key, passphrase, and decrypted message never leave this browser.</p>
      <p>Decryption shows what a message says, not who wrote it. Anyone with your public key can encrypt a message to you, and this app does not verify digital signatures.</p>
    </details>

    <PageFooter />
  </main>

  <DonationBanner show={tool.showDonationBanner} onDismiss={tool.dismissDonation} />

  <div class="bottom-actions">
    <div class="bottom-actions-inner">
      {#if hasContent}
        <button class="btn secondary" onclick={clearAll}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Clear
          {#if tool.hintsVisible}<kbd>Esc</kbd>{/if}
        </button>
      {/if}
      <button
        class="btn primary"
        onclick={handleDecrypt}
        disabled={isLoading || !isValid}
      >
        {#if isLoading}
          <span class="spinner"></span>
        {:else}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
          </svg>
        {/if}
        Decrypt
        {#if tool.hintsVisible}<kbd>{tool.keys.submitHint}</kbd>{/if}
      </button>
    </div>
  </div>
</div>

<style>
  .main {
    max-width: 480px;
    margin: 0 auto;
    padding: 12px 20px 40px;
    padding-left: calc(20px + var(--safe-left));
    padding-right: calc(20px + var(--safe-right));
  }

  .empty-result {
    display: block;
    font-size: 14px;
    color: var(--text-secondary);
  }

  @media (min-width: 768px) {
    .main {
      max-width: 720px;
    }
  }
</style>
