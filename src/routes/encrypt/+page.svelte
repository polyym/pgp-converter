<script lang="ts">
  import { encryptMessage } from '$lib/encryption';
  import { LOADING_DELAY_MS, SUCCESS_TOAST_MS, ERROR_TOAST_MS, COPY_FEEDBACK_MS, COPY_ERROR_MS } from '$lib/constants';
  import { NavBar, ShortcutsModal, Toast, PageFooter, PageHeader, DonationBanner } from '$lib/components';
  import { isDonationBannerAllowed, dismissDonationBanner } from '$lib/donation-banner';
  import { onMount } from 'svelte';

  let plaintext = $state('');
  let publicKey = $state('');
  let encrypted = $state('');
  let errorMessage = $state('');
  let isLoading = $state(false);
  let copySuccess = $state(false);
  let encryptSuccess = $state(false);
  let showShortcuts = $state(false);
  let isTouchDevice = $state(false);
  let showDonationBanner = $state(false);

  const isValid = $derived(plaintext.trim().length > 0 && publicKey.trim().length > 0);

  const shortcuts = [
    { label: 'Encrypt message', keys: ['⌘', '↵'] },
    { label: 'Copy result', keys: ['⌘', '⇧', 'C'] },
    { label: 'Clear all', keys: ['Esc'] },
    { label: 'Toggle shortcuts', keys: ['?'] }
  ];

  async function handleEncrypt() {
    if (!isValid || isLoading) return;

    isLoading = true;
    encryptSuccess = false;
    errorMessage = '';

    await new Promise(resolve => setTimeout(resolve, LOADING_DELAY_MS));

    const result = await encryptMessage(plaintext, publicKey);

    if (result.success && result.data) {
      encrypted = result.data;
      errorMessage = '';
      encryptSuccess = true;
      setTimeout(() => encryptSuccess = false, SUCCESS_TOAST_MS);
      if (isDonationBannerAllowed()) showDonationBanner = true;
    } else {
      errorMessage = result.error || 'Encryption failed';
      encrypted = '';
      setTimeout(() => errorMessage = '', ERROR_TOAST_MS);
    }
    isLoading = false;
  }

  async function copyToClipboard() {
    if (!encrypted) return;

    try {
      await navigator.clipboard.writeText(encrypted);
      copySuccess = true;
      setTimeout(() => copySuccess = false, COPY_FEEDBACK_MS);
    } catch {
      errorMessage = 'Failed to copy';
      setTimeout(() => errorMessage = '', COPY_ERROR_MS);
    }
  }

  function clearAll() {
    plaintext = '';
    publicKey = '';
    encrypted = '';
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
      handleEncrypt();
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'c' || e.key === 'C') && encrypted) {
      e.preventDefault();
      copyToClipboard();
    }
    if (e.key === 'Escape' && (plaintext || publicKey || encrypted)) {
      e.preventDefault();
      clearAll();
    }
    if (e.key === '?' && target.tagName !== 'TEXTAREA') {
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
  <title>PGP Encrypt Message Online - Free Browser-Based Encryption Tool</title>
  <meta name="description" content="Encrypt messages with PGP directly in your browser. Paste a public key and plaintext to generate a secure PGP-encrypted message. No data leaves your device." />
  <meta name="keywords" content="pgp encrypt online, pgp encrypt browser, encrypt message with public key online, how to encrypt a message with pgp online, free pgp encryption online, pgp encrypt no install, client side pgp encryption" />
  <meta property="og:title" content="PGP Encrypt Message Online - Free Browser-Based Encryption Tool" />
  <meta property="og:description" content="Encrypt messages with PGP directly in your browser. Paste a public key and plaintext to generate a secure PGP-encrypted message." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://pgp-converter.com/encrypt" />
  <meta property="og:site_name" content="PGP Converter" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="PGP Encrypt Message Online - Free Browser-Based Tool" />
  <meta name="twitter:description" content="Encrypt messages with PGP directly in your browser. No data leaves your device." />
  <link rel="canonical" href="https://pgp-converter.com/encrypt" />
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I encrypt a message with PGP?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Paste your plaintext message and the recipient's PGP public key into the fields, then click Encrypt. The encrypted output can only be read by the person who holds the matching private key."
        }
      },
      {
        "@type": "Question",
        "name": "Do I need the recipient's private key to encrypt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. You only need the recipient's public key to encrypt a message. The recipient then uses their own private key and passphrase to decrypt it."
        }
      },
      {
        "@type": "Question",
        "name": "Is my data sent to a server during encryption?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. All encryption happens entirely in your browser using the OpenPGP.js library. No messages, keys, or passphrases are ever transmitted to any server."
        }
      }
    ]
  })}</script>`}
</svelte:head>

<div class="app">
  <NavBar currentPage="encrypt" {isTouchDevice} onToggleShortcuts={() => showShortcuts = !showShortcuts} />
  <ShortcutsModal show={showShortcuts} {shortcuts} onClose={() => showShortcuts = false} />

  <main class="main">
    <PageHeader title="Encrypt">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    </PageHeader>

    <Toast type="success" message="Encrypted" show={encryptSuccess} />
    <Toast type="error" message={errorMessage} show={!!errorMessage} />

    <div class="fields">
      <div class="field">
        <label for="plaintext">Message</label>
        <textarea
          id="plaintext"
          bind:value={plaintext}
          placeholder="Enter message..."
          rows="4"
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
        ></textarea>
      </div>
    </div>

    <div class="output" class:has-content={encrypted}>
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
              {#if !isTouchDevice}<kbd>⌘⇧C</kbd>{/if}
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

    <PageFooter />
  </main>

  <DonationBanner show={showDonationBanner} onDismiss={handleDismissDonation} />

  <div class="bottom-actions">
    <div class="bottom-actions-inner">
      {#if plaintext || publicKey || encrypted}
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
