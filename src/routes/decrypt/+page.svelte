<script lang="ts">
  import { decryptMessage } from '$lib/decryption';
  import { LOADING_DELAY_MS, SUCCESS_TOAST_MS, ERROR_TOAST_MS, COPY_FEEDBACK_MS, COPY_ERROR_MS } from '$lib/constants';
  import { NavBar, ShortcutsModal, Toast, PageFooter, PageHeader, DonationBanner, SEO } from '$lib/components';
  import { isDonationBannerAllowed, dismissDonationBanner } from '$lib/donation-banner';
  import { onMount } from 'svelte';

  let encrypted = $state('');
  let privateKey = $state('');
  let passphrase = $state('');
  let decrypted = $state('');
  let errorMessage = $state('');
  let isLoading = $state(false);
  let copySuccess = $state(false);
  let decryptSuccess = $state(false);
  let showShortcuts = $state(false);
  let isTouchDevice = $state(false);
  let showDonationBanner = $state(false);

  const isValid = $derived(encrypted.trim().length > 0 && privateKey.trim().length > 0);

  const shortcuts = [
    { label: 'Decrypt message', keys: ['⌘', '↵'] },
    { label: 'Copy result', keys: ['⌘', '⇧', 'C'] },
    { label: 'Clear all', keys: ['Esc'] },
    { label: 'Toggle shortcuts', keys: ['?'] }
  ];

  async function handleDecrypt() {
    if (!isValid || isLoading) return;

    isLoading = true;
    decryptSuccess = false;
    errorMessage = '';

    await new Promise(resolve => setTimeout(resolve, LOADING_DELAY_MS));

    const result = await decryptMessage(encrypted, privateKey, passphrase);

    if (result.success && result.data) {
      decrypted = result.data;
      errorMessage = '';
      decryptSuccess = true;
      setTimeout(() => decryptSuccess = false, SUCCESS_TOAST_MS);
      if (isDonationBannerAllowed()) showDonationBanner = true;
    } else {
      errorMessage = result.error || 'Decryption failed';
      decrypted = '';
      setTimeout(() => errorMessage = '', ERROR_TOAST_MS);
    }
    isLoading = false;
  }

  async function copyToClipboard() {
    if (!decrypted) return;

    try {
      await navigator.clipboard.writeText(decrypted);
      copySuccess = true;
      setTimeout(() => copySuccess = false, COPY_FEEDBACK_MS);
    } catch {
      errorMessage = 'Failed to copy';
      setTimeout(() => errorMessage = '', COPY_ERROR_MS);
    }
  }

  function clearAll() {
    encrypted = '';
    privateKey = '';
    passphrase = '';
    decrypted = '';
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
      handleDecrypt();
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'c' || e.key === 'C') && decrypted) {
      e.preventDefault();
      copyToClipboard();
    }
    if (e.key === 'Escape' && (encrypted || privateKey || passphrase || decrypted)) {
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
  title="PGP Decrypt Message Online: Free Browser-Based Decryption Tool"
  description="Decrypt PGP-encrypted messages in your browser. Paste the ciphertext, your private key, and passphrase to reveal the original message. Fully client-side."
  path="/decrypt"
/>

<div class="app">
  <NavBar currentPage="decrypt" />
  <ShortcutsModal show={showShortcuts} {shortcuts} onClose={() => showShortcuts = false} />

  <main class="main">
    <PageHeader
      title="Decrypt a PGP Message"
      onShortcutsClick={isTouchDevice ? undefined : () => showShortcuts = !showShortcuts}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
      </svg>
    </PageHeader>

    <Toast type="success" message="Decrypted" show={decryptSuccess} />
    <Toast type="error" message={errorMessage} show={!!errorMessage} />

    <div class="fields">
      <div class="field">
        <label for="encrypted">Encrypted Message</label>
        <textarea
          id="encrypted"
          bind:value={encrypted}
          placeholder="Paste encrypted message..."
          rows="4"
          class="mono"
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
        ></textarea>
      </div>

      <div class="field">
        <label for="passphrase">Passphrase</label>
        <input
          type="password"
          id="passphrase"
          bind:value={passphrase}
          placeholder="Enter passphrase..."
        />
      </div>
    </div>

    <div class="output" class:has-content={decrypted}>
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
              {#if !isTouchDevice}<kbd>⌘⇧C</kbd>{/if}
            {/if}
          </button>
        {/if}
      </div>
      <div class="output-body">
        {#if decrypted}
          <pre>{decrypted}</pre>
        {:else}
          <span class="placeholder">Decrypted message appears here</span>
        {/if}
      </div>
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
        <li><strong>Enter your passphrase.</strong> The one you set when generating the key.</li>
        <li><strong>Decrypt.</strong> The original plaintext appears in the output panel.</li>
      </ol>
      <p>If the passphrase is wrong, the private key doesn't match the message, or the ciphertext was truncated, you'll see a specific error rather than a partial result. Your private key, passphrase, and decrypted message never leave this browser.</p>
    </details>

    <PageFooter />
  </main>

  <DonationBanner show={showDonationBanner} onDismiss={handleDismissDonation} />

  <div class="bottom-actions">
    <div class="bottom-actions-inner">
      {#if encrypted || privateKey || passphrase || decrypted}
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
        {#if !isTouchDevice}<kbd>⌘↵</kbd>{/if}
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
  .explainer ol {
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
  .explainer code {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text);
    background: var(--surface-2);
    padding: 1px 4px;
    border-radius: 4px;
  }

  @media (min-width: 768px) {
    .main {
      max-width: 720px;
    }
  }
</style>
