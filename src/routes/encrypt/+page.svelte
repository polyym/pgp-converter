<script lang="ts">
  import { encryptMessage } from '$lib/encryption';
  import { inspectPublicKeys, type KeyInfo } from '$lib/keys';
  import { createFeedback } from '$lib/feedback.svelte';
  import { createToolPage, copyText } from '$lib/tool-page.svelte';
  import { LOADING_DELAY_MS, COPY_FEEDBACK_MS, COPY_ERROR_MS, KEY_INSPECT_DELAY_MS } from '$lib/constants';
  import { NavBar, ShortcutsModal, Toast, PageFooter, PageHeader, DonationBanner, SEO } from '$lib/components';
  import { onMount, tick } from 'svelte';

  let outputElement = $state<HTMLElement>();
  let plaintext = $state('');
  let publicKey = $state('');
  let encrypted = $state('');
  let recipients = $state<KeyInfo[]>([]);
  let isLoading = $state(false);
  let copySuccess = $state(false);
  let inspectId = 0;

  const feedback = createFeedback();
  const tool = createToolPage({
    submitLabel: 'Encrypt message',
    onSubmit: handleEncrypt,
    onCopy: copyToClipboard,
    canCopy: () => !!encrypted,
    onClear: clearAll,
    canClear: () => !!(plaintext || publicKey || encrypted)
  });

  const isValid = $derived(plaintext.trim().length > 0 && publicKey.trim().length > 0);

  // Show whose key has been pasted, shortly after the user stops typing
  $effect(() => {
    const text = publicKey;
    const id = ++inspectId;
    if (!text.trim()) {
      recipients = [];
      return;
    }
    const timer = setTimeout(async () => {
      const keys = await inspectPublicKeys(text);
      if (id === inspectId) recipients = keys;
    }, KEY_INSPECT_DELAY_MS);
    return () => clearTimeout(timer);
  });

  async function handleEncrypt() {
    if (!isValid || isLoading) return;

    // A result that arrives after the form was cleared must not reappear
    const isCurrent = tool.startRun();
    isLoading = true;
    feedback.clear();

    await new Promise(resolve => setTimeout(resolve, LOADING_DELAY_MS));
    if (!isCurrent()) return;

    const result = await encryptMessage(plaintext, publicKey);
    if (!isCurrent()) return;

    if (result.success && result.data) {
      encrypted = result.data;
      feedback.showSuccess('Encrypted');
      tool.offerDonation();
    } else {
      encrypted = '';
      feedback.showError(result.error || 'Encryption failed');
    }
    isLoading = false;

    if (encrypted) {
      await tick();
      tool.revealResult(outputElement);
    }
  }

  async function copyToClipboard() {
    if (!encrypted) return;

    if (await copyText(encrypted)) {
      copySuccess = true;
      setTimeout(() => copySuccess = false, COPY_FEEDBACK_MS);
    } else {
      feedback.showError('Failed to copy', COPY_ERROR_MS);
    }
  }

  function clearAll() {
    tool.cancelRuns();
    isLoading = false;
    plaintext = '';
    publicKey = '';
    encrypted = '';
    recipients = [];
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
  title="PGP Encrypt Message Online: Free Browser-Based Encryption Tool"
  description="Encrypt messages with PGP directly in your browser. Paste a public key and plaintext to generate a secure PGP-encrypted message. No data leaves your device."
  path="/encrypt"
/>

<div class="app">
  <NavBar currentPage="encrypt" />
  <ShortcutsModal show={tool.showShortcuts} shortcuts={tool.shortcuts} onClose={tool.closeShortcuts} />

  <main class="main">
    <PageHeader
      title="Encrypt a PGP Message"
      onShortcutsClick={tool.hintsVisible ? tool.toggleShortcuts : undefined}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    </PageHeader>

    <Toast type="success" message={feedback.success} show={!!feedback.success} />
    <Toast type="error" message={feedback.error} show={!!feedback.error} />

    <div class="fields">
      <div class="field">
        <label for="plaintext">Message</label>
        <textarea
          id="plaintext"
          bind:value={plaintext}
          placeholder="Enter message..."
          rows="4"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
        ></textarea>
      </div>

      <div class="field">
        <label for="publicKey">Public Key</label>
        <textarea
          id="publicKey"
          bind:value={publicKey}
          placeholder="Paste public key..."
          rows="4"
          class="mono"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
        ></textarea>

        {#if recipients.length}
          <div class="recipients" role="status">
            <p class="recipients-title">
              {recipients.length === 1 ? 'Encrypting to' : `Encrypting to ${recipients.length} keys`}
            </p>
            <ul>
              {#each recipients as key (key.fingerprint)}
                <li class:problem={!!key.problem}>
                  <span class="recipient-name">{key.userIDs.join(', ') || 'Key with no name'}</span>
                  <span class="recipient-meta">{key.algorithm}, created {key.created}</span>
                  <code class="recipient-fingerprint">{key.fingerprint}</code>
                  {#if key.problem}
                    <span class="recipient-problem">{key.problem}</span>
                  {/if}
                </li>
              {/each}
            </ul>
            <p class="recipients-hint">Confirm the fingerprint with the recipient through another channel before you rely on this key.</p>
          </div>
        {/if}
      </div>
    </div>

    <div
      class="output"
      class:has-content={encrypted}
      bind:this={outputElement}
      tabindex="-1"
      role="region"
      aria-label="Encrypted message"
    >
      <div class="output-header">
        <span>Output</span>
        {#if encrypted}
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
        {#if encrypted}
          <pre>{encrypted}</pre>
        {:else}
          <span class="placeholder">Encrypted message appears here</span>
        {/if}
      </div>
    </div>

    <details class="explainer">
      <summary>
        How to encrypt a PGP message
        <svg class="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </summary>
      <p>Encrypting a message with PGP is a one-way door: once encrypted with a public key, only the matching private key can read it. Even if the ciphertext is intercepted in transit, it stays unreadable without that key.</p>
      <ol>
        <li><strong>Paste the recipient's public key.</strong> This is their public half of the PGP keypair, typically shared on a keyserver, website, or directly with you. The page shows whose key it is and its fingerprint, so you can check it is the right one. To write to several people, paste their public keys one after another.</li>
        <li><strong>Paste your plaintext message.</strong> Anything you want only the recipient to read.</li>
        <li><strong>Encrypt.</strong> The output is an armored PGP message beginning with <code>-----BEGIN PGP MESSAGE-----</code>. Send it through any channel (email, chat, SMS), and only the holder of the matching private key can decrypt it.</li>
      </ol>
      <p>All encryption happens locally via OpenPGP.js. Your plaintext and the public key never leave this browser. The message is not signed, so the recipient cannot prove from the message alone that it came from you.</p>
    </details>

    <PageFooter />
  </main>

  <DonationBanner show={tool.showDonationBanner} onDismiss={tool.dismissDonation} />

  <div class="bottom-actions">
    <div class="bottom-actions-inner">
      {#if plaintext || publicKey || encrypted}
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
        onclick={handleEncrypt}
        disabled={isLoading || !isValid}
      >
        {#if isLoading}
          <span class="spinner"></span>
        {:else}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        {/if}
        Encrypt
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

  @media (min-width: 768px) {
    .main {
      max-width: 720px;
    }
  }

  .recipients {
    padding: 12px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .recipients-title {
    margin: 0 0 8px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
  }
  .recipients ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .recipients li {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .recipient-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
    overflow-wrap: anywhere;
  }
  .recipient-meta {
    font-size: 12px;
    color: var(--text-secondary);
  }
  .recipient-fingerprint {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-secondary);
    overflow-wrap: anywhere;
  }
  .recipient-problem {
    font-size: 13px;
    color: var(--error);
  }
  .recipients li.problem .recipient-name {
    color: var(--error);
  }
  .recipients-hint {
    margin: 10px 0 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-secondary);
  }
</style>
