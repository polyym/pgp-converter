<script lang="ts">
  import { generateKeyPair, downloadKey } from '$lib/keygen';
  import { createFeedback } from '$lib/feedback.svelte';
  import { createToolPage, copyText } from '$lib/tool-page.svelte';
  import { COPY_FEEDBACK_MS, COPY_ERROR_MS, MIN_PASSPHRASE_LENGTH, CLEAR_CONFIRM_MS } from '$lib/constants';
  import { NavBar, ShortcutsModal, Toast, PageFooter, PageHeader, DonationBanner, SEO, PassphraseInput } from '$lib/components';
  import { onMount, tick } from 'svelte';

  let keysElement = $state<HTMLElement>();
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
  let isLoading = $state(false);
  let copyPublicSuccess = $state(false);
  let copyPrivateSuccess = $state(false);
  // True while Clear is armed and waiting for a second press
  let confirmingClear = $state(false);
  let confirmTimer: ReturnType<typeof setTimeout> | undefined;

  const feedback = createFeedback();
  const tool = createToolPage({
    submitLabel: 'Generate keys',
    onSubmit: handleGenerate,
    onClear: requestClear,
    canClear: () => !!(name || email || passphrase || publicKey)
  });

  const isValid = $derived(
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    passphrase.length >= MIN_PASSPHRASE_LENGTH &&
    passphrase === confirmPassphrase
  );

  const passphraseMatch = $derived(passphrase === confirmPassphrase || confirmPassphrase === '');

  async function handleGenerate() {
    if (!isValid || isLoading) return;

    // Keys from a generation that was cleared while it ran must not reappear
    const isCurrent = tool.startRun();
    isLoading = true;
    feedback.clear();

    const result = await generateKeyPair({
      name,
      email,
      passphrase,
      keyType,
      curve: keyType === 'ecc' ? curve : undefined,
      rsaBits: keyType === 'rsa' ? rsaBits : undefined
    });
    if (!isCurrent()) return;

    if (result.success && result.data) {
      publicKey = result.data.publicKey;
      privateKey = result.data.privateKey;
      fingerprint = result.data.fingerprint;
      feedback.showSuccess('Keys generated');
      tool.offerDonation();
    } else {
      publicKey = '';
      privateKey = '';
      fingerprint = '';
      feedback.showError(result.error || 'Key generation failed');
    }
    isLoading = false;

    if (privateKey) {
      await tick();
      tool.revealResult(keysElement);
    }
  }

  async function copyPublicKey() {
    if (!publicKey) return;
    if (await copyText(publicKey)) {
      copyPublicSuccess = true;
      setTimeout(() => copyPublicSuccess = false, COPY_FEEDBACK_MS);
    } else {
      feedback.showError('Failed to copy', COPY_ERROR_MS);
    }
  }

  async function copyPrivateKey() {
    if (!privateKey) return;
    if (await copyText(privateKey)) {
      copyPrivateSuccess = true;
      setTimeout(() => copyPrivateSuccess = false, COPY_FEEDBACK_MS);
    } else {
      feedback.showError('Failed to copy', COPY_ERROR_MS);
    }
  }

  function downloadPublicKey() {
    if (!publicKey) return;
    const filename = `${name.replace(/\s+/g, '_')}_public.asc`;
    downloadKey(publicKey, filename);
  }

  function downloadPrivateKey() {
    if (!privateKey) return;
    const filename = `${name.replace(/\s+/g, '_')}_private.asc`;
    downloadKey(privateKey, filename);
  }

  function downloadBothKeys() {
    if (!publicKey || !privateKey) return;
    const combined = `=== PUBLIC KEY ===\n\n${publicKey}\n\n=== PRIVATE KEY ===\n\n${privateKey}`;
    const filename = `${name.replace(/\s+/g, '_')}_keypair.txt`;
    downloadKey(combined, filename);
  }

  function clearAll() {
    tool.cancelRuns();
    isLoading = false;
    clearTimeout(confirmTimer);
    confirmingClear = false;
    name = '';
    email = '';
    passphrase = '';
    confirmPassphrase = '';
    publicKey = '';
    privateKey = '';
    fingerprint = '';
    feedback.clear();
  }

  // Generated keys cannot be recovered once cleared, so while keys are on screen
  // the first press of Clear (or Esc) only arms it and a second press confirms.
  function requestClear() {
    if (privateKey && !confirmingClear) {
      confirmingClear = true;
      confirmTimer = setTimeout(() => confirmingClear = false, CLEAR_CONFIRM_MS);
      return;
    }
    clearAll();
  }

  onMount(() => {
    const stopShortcuts = tool.mount();
    return () => {
      stopShortcuts();
      clearTimeout(confirmTimer);
      feedback.clear();
    };
  });
</script>

<SEO
  title="Generate PGP Key Pair Online: Free ECC &amp; RSA Key Generator"
  description="Generate PGP key pairs in your browser. Choose ECC (Curve25519) or RSA (up to 4096-bit), set a passphrase, and download your public and private keys instantly."
  path="/generate"
/>

<div class="app">
  <NavBar currentPage="generate" />
  <ShortcutsModal show={tool.showShortcuts} shortcuts={tool.shortcuts} onClose={tool.closeShortcuts} />

  <main class="main">
    <PageHeader
      title="Generate a PGP Key Pair"
      iconClass="generate"
      onShortcutsClick={tool.hintsVisible ? tool.toggleShortcuts : undefined}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
      </svg>
    </PageHeader>

    <Toast type="success" message={feedback.success} show={!!feedback.success} />
    <Toast type="error" message={feedback.error} show={!!feedback.error} />

    <div class="fields">
      <div class="field-row">
        <div class="field">
          <label for="name">Name</label>
          <input type="text" id="name" bind:value={name} placeholder="Your name..." spellcheck="false" />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input type="email" id="email" bind:value={email} placeholder="your@email.com" />
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="passphrase">Passphrase</label>
          <PassphraseInput id="passphrase" bind:value={passphrase} placeholder="Min {MIN_PASSPHRASE_LENGTH} characters..." autocomplete="new-password" />
          {#if passphrase && passphrase.length < MIN_PASSPHRASE_LENGTH}
            <span class="field-hint error">Must be at least {MIN_PASSPHRASE_LENGTH} characters</span>
          {/if}
        </div>
        <div class="field">
          <label for="confirmPassphrase">Confirm Passphrase</label>
          <PassphraseInput id="confirmPassphrase" bind:value={confirmPassphrase} placeholder="Confirm passphrase..." invalid={!passphraseMatch} autocomplete="new-password" />
          {#if !passphraseMatch}
            <span class="field-hint error">Passphrases do not match</span>
          {/if}
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="keyType">Key Type</label>
          <select id="keyType" bind:value={keyType}>
            <option value="ecc">ECC (Recommended)</option>
            <option value="rsa">RSA</option>
          </select>
        </div>
        {#if keyType === 'ecc'}
          <div class="field">
            <label for="curve">Curve</label>
            <select id="curve" bind:value={curve}>
              <option value="curve25519">Curve25519 (Recommended)</option>
              <option value="nistP256">NIST P-256</option>
              <option value="nistP384">NIST P-384</option>
              <option value="nistP521">NIST P-521</option>
            </select>
          </div>
        {:else}
          <div class="field">
            <label for="rsaBits">Key Size</label>
            <select id="rsaBits" bind:value={rsaBits}>
              <option value={4096}>4096 bits (Recommended)</option>
              <option value={3072}>3072 bits</option>
              <option value={2048}>2048 bits</option>
            </select>
          </div>
        {/if}
      </div>
    </div>

    {#if publicKey && privateKey}
      <div class="keys-output" bind:this={keysElement} tabindex="-1" role="region" aria-label="Generated keys">
        <div class="fingerprint">
          <span class="fingerprint-label">Fingerprint</span>
          <code>{fingerprint}</code>
          <p>A short identifier for this key pair. Give it to people along with your public key, so they can check they are encrypting to the right key.</p>
        </div>

        <div class="key-section">
          <div class="key-header">
            <span class="key-label public">Public Key</span>
            <div class="key-actions">
              <button class="action-btn" onclick={copyPublicKey} aria-label={copyPublicSuccess ? 'Copied public key' : 'Copy public key'}>
                {#if copyPublicSuccess}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  Copied
                {:else}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy
                {/if}
              </button>
              <button class="action-btn" onclick={downloadPublicKey} aria-label="Download public key">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download
              </button>
            </div>
          </div>
          <pre class="key-content">{publicKey}</pre>
        </div>

        <div class="key-section">
          <div class="key-header">
            <span class="key-label private">Private Key</span>
            <div class="key-actions">
              <button class="action-btn" onclick={copyPrivateKey} aria-label={copyPrivateSuccess ? 'Copied private key' : 'Copy private key'}>
                {#if copyPrivateSuccess}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  Copied
                {:else}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy
                {/if}
              </button>
              <button class="action-btn" onclick={downloadPrivateKey} aria-label="Download private key">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download
              </button>
            </div>
          </div>
          <pre class="key-content">{privateKey}</pre>
        </div>

        <button class="download-both-btn" onclick={downloadBothKeys}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download Both Keys as .txt
        </button>
      </div>
    {/if}

    <div class="warning-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <p><strong>Important:</strong> Keep your private key and passphrase safe. Never share your private key with anyone. If you lose your passphrase, you will not be able to decrypt messages.</p>
    </div>

    <details class="explainer">
      <summary>
        How to generate a PGP key pair
        <svg class="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </summary>
      <p>A key pair has two halves: a public key for others to encrypt messages to you, and a private key for you to decrypt them.</p>
      <ol>
        <li><strong>Fill in your name and email.</strong> These become part of the key's user ID; they're embedded in the public key and visible to anyone you share it with.</li>
        <li><strong>Choose a strong passphrase.</strong> This encrypts the private key at rest. You'll enter it every time you decrypt. Use at least 8 characters; longer is better.</li>
        <li><strong>Pick an algorithm.</strong>
          <ul>
            <li><strong>ECC (Curve25519)</strong>: recommended. Small keys, fast, modern cryptography. Generated in the format that GnuPG and other mainstream PGP clients read.</li>
            <li><strong>RSA (2048 / 3072 / 4096 bits)</strong>: traditional, widely compatible with older tools. Slower key generation, larger keys. Use 4096 bits for long-term use.</li>
          </ul>
        </li>
        <li><strong>Generate.</strong> The key pair appears in the output. Copy the public key to share; store the private key somewhere safe before you leave or clear the page, because it cannot be shown again.</li>
      </ol>
      <p>Randomness comes from the browser's cryptographically secure random number generator. Nothing leaves your device.</p>
    </details>

    <PageFooter />
  </main>

  <DonationBanner show={tool.showDonationBanner} onDismiss={tool.dismissDonation} />

  <div class="bottom-actions">
    <div class="bottom-actions-inner">
      {#if name || email || passphrase || publicKey}
        <button class="btn secondary" class:confirming={confirmingClear} onclick={requestClear}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          {confirmingClear ? 'Delete keys?' : 'Clear'}
          {#if tool.hintsVisible}<kbd>Esc</kbd>{/if}
        </button>
        <span class="sr-only" role="status">
          {confirmingClear ? 'Press Clear again to delete the generated keys. They cannot be recovered.' : ''}
        </span>
      {/if}
      <button
        class="btn primary"
        onclick={handleGenerate}
        disabled={isLoading || !isValid}
      >
        {#if isLoading}
          <span class="spinner"></span>
        {:else}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
        {/if}
        Generate
        {#if tool.hintsVisible}<kbd>{tool.keys.submitHint}</kbd>{/if}
      </button>
    </div>
  </div>
</div>

<style>
  .main {
    max-width: 560px;
    margin: 0 auto;
    padding: 12px 20px 40px;
    padding-left: calc(20px + var(--safe-left));
    padding-right: calc(20px + var(--safe-right));
  }

  .bottom-actions-inner {
    max-width: 560px;
  }

  @media (min-width: 768px) {
    .main {
      max-width: 800px;
    }

    .bottom-actions-inner {
      max-width: 800px;
    }
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

  input, select {
    width: 100%;
    padding: 14px 16px;
    font-family: var(--font);
    font-size: 16px;
    line-height: 1.4;
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    transition: border-color 0.15s ease;
  }

  input::placeholder { color: var(--text-dim); }
  input:hover, select:hover { border-color: var(--border-hover); }
  /* The transparent outline becomes visible in forced-colours (high contrast) modes */
  input:focus, select:focus {
    outline: 2px solid transparent;
    border-color: var(--focus);
    box-shadow: 0 0 0 1px var(--focus);
  }

  select {
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239494a0' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 40px;
  }

  .field-hint { font-size: 12px; padding-left: 2px; }
  .field-hint.error { color: var(--error); }

  .keys-output { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }

  .fingerprint {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .fingerprint-label { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); }
  .fingerprint code { font-family: var(--mono); font-size: 13px; color: var(--text); overflow-wrap: anywhere; }
  .fingerprint p { margin: 0; font-size: 12px; line-height: 1.5; color: var(--text-secondary); }

  .btn.secondary.confirming { color: var(--error); border-color: var(--error); }

  .key-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }

  .key-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
  }

  .key-label { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .key-label.public { color: var(--success); }
  .key-label.private { color: var(--error); }

  .key-actions { display: flex; gap: 8px; }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 12px;
    font-family: var(--font);
    font-size: 13px;
    font-weight: 500;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .action-btn:hover { color: var(--text); border-color: var(--border-hover); }

  .key-content {
    margin: 0;
    padding: 16px;
    font-family: var(--mono);
    font-size: 11px;
    line-height: 1.5;
    color: var(--text-secondary);
    word-break: break-all;
    white-space: pre-wrap;
    max-height: 150px;
    overflow-y: auto;
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

  .download-both-btn:hover { border-color: var(--border-hover); background: var(--surface-2); }

  .warning-box {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 12px;
    margin-bottom: 24px;
  }

  .warning-box svg { flex-shrink: 0; color: var(--warning); margin-top: 2px; }
  .warning-box p { margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary); }
  .warning-box strong { color: var(--warning); }

  @media (prefers-reduced-motion: reduce) {
    .action-btn:active,
    .download-both-btn:active {
      transform: none;
    }
  }
</style>
