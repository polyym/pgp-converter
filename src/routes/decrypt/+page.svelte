<script lang="ts">
  import { decryptMessage } from '$lib/decryption';
  import { LOADING_DELAY_MS, SUCCESS_TOAST_MS, ERROR_TOAST_MS, COPY_FEEDBACK_MS, COPY_ERROR_MS } from '$lib/constants';
  import { NavBar, ShortcutsModal, Toast, PageFooter, PageHeader, DonationBanner } from '$lib/components';
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

<svelte:head>
  <title>PGP Decrypt Message Online - Free Browser-Based Decryption Tool</title>
  <meta name="description" content="Decrypt PGP-encrypted messages in your browser. Paste the ciphertext, your private key, and passphrase to reveal the original message. Fully client-side." />
  <meta name="keywords" content="pgp decrypt online, pgp decrypt message online free, pgp decryption online, decrypt pgp message browser, client side pgp decryption, free pgp decryption, pgp decrypt no install" />
  <meta property="og:title" content="PGP Decrypt Message Online - Free Browser-Based Decryption Tool" />
  <meta property="og:description" content="Decrypt PGP-encrypted messages in your browser. Paste the ciphertext, your private key, and passphrase to reveal the original message." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://pgp-converter.com/decrypt" />
  <meta property="og:site_name" content="PGP Converter" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="PGP Decrypt Message Online - Free Browser-Based Tool" />
  <meta name="twitter:description" content="Decrypt PGP-encrypted messages in your browser. Fully client-side, no data leaves your device." />
  <link rel="canonical" href="https://pgp-converter.com/decrypt" />
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I decrypt a PGP message?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Paste the PGP-encrypted ciphertext, your private key, and your passphrase into the fields, then click Decrypt. The original plaintext message will appear in the output."
        }
      },
      {
        "@type": "Question",
        "name": "Why does PGP decryption fail?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Decryption typically fails for three reasons: the passphrase is incorrect, the message was encrypted with a different public key, or the encrypted text was not copied in full. Double-check all three inputs and try again."
        }
      },
      {
        "@type": "Question",
        "name": "Can I decrypt without a passphrase?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Only if your private key was generated without a passphrase. Most PGP keys are passphrase-protected, in which case the passphrase is required to unlock the private key before decryption can proceed."
        }
      }
    ]
  })}</script>`}
</svelte:head>

<div class="app">
  <NavBar currentPage="decrypt" {isTouchDevice} onToggleShortcuts={() => showShortcuts = !showShortcuts} />
  <ShortcutsModal show={showShortcuts} {shortcuts} onClose={() => showShortcuts = false} />

  <main class="main">
    <PageHeader title="Decrypt">
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

  @media (min-width: 768px) {
    .main {
      max-width: 720px;
    }
  }
</style>
