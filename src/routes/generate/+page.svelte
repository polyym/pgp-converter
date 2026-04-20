<script lang="ts">
  import { generateKeyPair, downloadKey } from '$lib/keygen';
  import { SUCCESS_TOAST_MS, ERROR_TOAST_MS, COPY_FEEDBACK_MS, COPY_ERROR_MS, MIN_PASSPHRASE_LENGTH } from '$lib/constants';
  import { NavBar, ShortcutsModal, Toast, PageFooter, PageHeader, DonationBanner, SEO } from '$lib/components';
  import { isDonationBannerAllowed, dismissDonationBanner } from '$lib/donation-banner';
  import { onMount } from 'svelte';

  let name = $state('');
  let email = $state('');
  let passphrase = $state('');
  let confirmPassphrase = $state('');
  let keyType = $state<'ecc' | 'rsa'>('ecc');
  let curve = $state<'curve25519' | 'nistP256' | 'nistP384' | 'nistP521'>('curve25519');
  let rsaBits = $state<2048 | 3072 | 4096>(4096);

  let publicKey = $state('');
  let privateKey = $state('');
  let errorMessage = $state('');
  let isLoading = $state(false);
  let generateSuccess = $state(false);
  let copyPublicSuccess = $state(false);
  let copyPrivateSuccess = $state(false);
  let showShortcuts = $state(false);
  let isTouchDevice = $state(false);
  let showDonationBanner = $state(false);

  const isValid = $derived(
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    passphrase.length >= MIN_PASSPHRASE_LENGTH &&
    passphrase === confirmPassphrase
  );

  const passphraseMatch = $derived(passphrase === confirmPassphrase || confirmPassphrase === '');

  const shortcuts = [
    { label: 'Generate keys', keys: ['⌘', '↵'] },
    { label: 'Clear all', keys: ['Esc'] },
    { label: 'Toggle shortcuts', keys: ['?'] }
  ];

  async function handleGenerate() {
    if (!isValid || isLoading) return;

    isLoading = true;
    generateSuccess = false;
    errorMessage = '';

    const result = await generateKeyPair({
      name,
      email,
      passphrase,
      keyType,
      curve: keyType === 'ecc' ? curve : undefined,
      rsaBits: keyType === 'rsa' ? rsaBits : undefined
    });

    if (result.success && result.data) {
      publicKey = result.data.publicKey;
      privateKey = result.data.privateKey;
      errorMessage = '';
      generateSuccess = true;
      setTimeout(() => generateSuccess = false, SUCCESS_TOAST_MS);
      if (isDonationBannerAllowed()) showDonationBanner = true;
    } else {
      errorMessage = result.error || 'Key generation failed';
      publicKey = '';
      privateKey = '';
      setTimeout(() => errorMessage = '', ERROR_TOAST_MS);
    }
    isLoading = false;
  }

  async function copyPublicKey() {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey);
      copyPublicSuccess = true;
      setTimeout(() => copyPublicSuccess = false, COPY_FEEDBACK_MS);
    } catch {
      errorMessage = 'Failed to copy';
      setTimeout(() => errorMessage = '', COPY_ERROR_MS);
    }
  }

  async function copyPrivateKey() {
    if (!privateKey) return;
    try {
      await navigator.clipboard.writeText(privateKey);
      copyPrivateSuccess = true;
      setTimeout(() => copyPrivateSuccess = false, COPY_FEEDBACK_MS);
    } catch {
      errorMessage = 'Failed to copy';
      setTimeout(() => errorMessage = '', COPY_ERROR_MS);
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
    name = '';
    email = '';
    passphrase = '';
    confirmPassphrase = '';
    publicKey = '';
    privateKey = '';
    errorMessage = '';
  }

  function handleDismissDonation() {
    showDonationBanner = false;
    dismissDonationBanner();
  }

  function handleKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;

    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
    if (e.key === 'Escape' && (name || email || passphrase || publicKey)) {
      e.preventDefault();
      clearAll();
    }
    if (e.key === '?' && target.tagName !== 'TEXTAREA' && target.tagName !== 'INPUT') {
      e.preventDefault();
      showShortcuts = !showShortcuts;
    }
  }

  onMount(() => {
    isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });
</script>

<SEO
  title="Generate PGP Key Pair Online: Free ECC &amp; RSA Key Generator"
  description="Generate PGP key pairs in your browser. Choose ECC (Curve25519) or RSA (up to 4096-bit), set a passphrase, and download your public and private keys instantly."
  path="/generate"
/>

<div class="app">
  <NavBar currentPage="generate" />
  <ShortcutsModal show={showShortcuts} {shortcuts} onClose={() => showShortcuts = false} />

  <main class="main">
    <PageHeader
      title="Generate a PGP Key Pair"
      iconClass="generate"
      onShortcutsClick={isTouchDevice ? undefined : () => showShortcuts = !showShortcuts}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
      </svg>
    </PageHeader>

    <Toast type="success" message="Keys generated" show={generateSuccess} />
    <Toast type="error" message={errorMessage} show={!!errorMessage} />

    <div class="fields">
      <div class="field-row">
        <div class="field">
          <label for="name">Name</label>
          <input type="text" id="name" bind:value={name} placeholder="Your name..." />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input type="email" id="email" bind:value={email} placeholder="your@email.com" />
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="passphrase">Passphrase</label>
          <input type="password" id="passphrase" bind:value={passphrase} placeholder="Min {MIN_PASSPHRASE_LENGTH} characters..." />
          {#if passphrase && passphrase.length < MIN_PASSPHRASE_LENGTH}
            <span class="field-hint error">Must be at least {MIN_PASSPHRASE_LENGTH} characters</span>
          {/if}
        </div>
        <div class="field">
          <label for="confirmPassphrase">Confirm Passphrase</label>
          <input type="password" id="confirmPassphrase" bind:value={confirmPassphrase} placeholder="Confirm passphrase..." class:error={!passphraseMatch} />
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
      <div class="keys-output">
        <div class="key-section">
          <div class="key-header">
            <span class="key-label public">Public Key</span>
            <div class="key-actions">
              <button class="action-btn" onclick={copyPublicKey} aria-label="Copy public key">
                {#if copyPublicSuccess}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                {:else}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                {/if}
              </button>
              <button class="action-btn" onclick={downloadPublicKey} aria-label="Download public key">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
            </div>
          </div>
          <pre class="key-content">{publicKey}</pre>
        </div>

        <div class="key-section">
          <div class="key-header">
            <span class="key-label private">Private Key</span>
            <div class="key-actions">
              <button class="action-btn" onclick={copyPrivateKey} aria-label="Copy private key">
                {#if copyPrivateSuccess}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                {:else}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                {/if}
              </button>
              <button class="action-btn" onclick={downloadPrivateKey} aria-label="Download private key">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
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
            <li><strong>ECC (Curve25519)</strong>: recommended. Small keys, fast, modern cryptography. Supported by all modern PGP clients.</li>
            <li><strong>RSA (2048 / 3072 / 4096 bits)</strong>: traditional, widely compatible with older tools. Slower key generation, larger keys. Use 4096 bits for long-term use.</li>
          </ul>
        </li>
        <li><strong>Generate.</strong> The key pair appears in the output. Copy the public key to share; store the private key somewhere safe.</li>
      </ol>
      <p>Randomness comes from the browser's cryptographically secure random number generator. Nothing leaves your device.</p>
    </details>

    <PageFooter />
  </main>

  <DonationBanner show={showDonationBanner} onDismiss={handleDismissDonation} />

  <div class="bottom-actions">
    <div class="bottom-actions-inner">
      {#if name || email || passphrase || publicKey}
        <button class="btn secondary" onclick={clearAll}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Clear
          {#if !isTouchDevice}<kbd>Esc</kbd>{/if}
        </button>
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
        {#if !isTouchDevice}<kbd>⌘↵</kbd>{/if}
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
  input:focus, select:focus { outline: none; border-color: #3f3f46; }
  input.error { border-color: var(--error); }

  select {
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 40px;
  }

  .field-hint { font-size: 12px; padding-left: 2px; }
  .field-hint.error { color: var(--error); }

  .keys-output { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }

  .key-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }

  .key-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
    width: 36px;
    height: 36px;
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

  .explainer {
    margin: 32px 0 0;
    padding: 16px 18px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .explainer summary {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
    list-style: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .explainer summary::-webkit-details-marker { display: none; }
  .explainer .chevron {
    color: var(--text-secondary);
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }
  .explainer[open] .chevron { transform: rotate(90deg); }
  .explainer[open] summary { margin-bottom: 10px; }
  .explainer p {
    font-size: 14px;
    line-height: 1.7;
    color: var(--text-secondary);
    margin: 0 0 10px;
  }
  .explainer p:last-child { margin: 0; }
  .explainer ol,
  .explainer ul {
    margin: 0 0 10px;
    padding-left: 20px;
  }
  .explainer li {
    font-size: 14px;
    line-height: 1.7;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }
  .explainer strong { color: var(--text); font-weight: 500; }

  @media (prefers-reduced-motion: reduce) {
    .action-btn:active,
    .download-both-btn:active {
      transform: none;
    }
  }
</style>
