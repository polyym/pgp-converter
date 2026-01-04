<script lang="ts">
  import { generateKeyPair, downloadKey } from '$lib/keygen';
  import { onMount } from 'svelte';

  let name = $state('');
  let email = $state('');
  let passphrase = $state('');
  let confirmPassphrase = $state('');
  let keyType = $state<'ecc' | 'rsa'>('ecc');
  let curve = $state<'curve25519' | 'p256' | 'p384' | 'p521'>('curve25519');
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

  const isValid = $derived(
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    passphrase.length >= 8 &&
    passphrase === confirmPassphrase
  );

  const passphraseMatch = $derived(passphrase === confirmPassphrase || confirmPassphrase === '');

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
      setTimeout(() => generateSuccess = false, 2500);
    } else {
      errorMessage = result.error || 'Key generation failed';
      publicKey = '';
      privateKey = '';
      setTimeout(() => errorMessage = '', 4000);
    }
    isLoading = false;
  }

  async function copyPublicKey() {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey);
      copyPublicSuccess = true;
      setTimeout(() => copyPublicSuccess = false, 1500);
    } catch {
      errorMessage = 'Failed to copy';
      setTimeout(() => errorMessage = '', 3000);
    }
  }

  async function copyPrivateKey() {
    if (!privateKey) return;
    try {
      await navigator.clipboard.writeText(privateKey);
      copyPrivateSuccess = true;
      setTimeout(() => copyPrivateSuccess = false, 1500);
    } catch {
      errorMessage = 'Failed to copy';
      setTimeout(() => errorMessage = '', 3000);
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

<svelte:head>
  <title>Generate Key Pair - PGP Converter</title>
  <meta name="description" content="Generate a new PGP key pair for secure communication. Create public and private keys with customisable settings. All processing happens in your browser." />
  <meta property="og:title" content="Generate Key Pair - PGP Converter" />
  <meta property="og:description" content="Generate a new PGP key pair for secure communication. All processing happens in your browser - no data is sent to any server." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://pgp-converter.com/generate" />
  <link rel="canonical" href="https://pgp-converter.com/generate" />
</svelte:head>

<div class="app">
  <!-- Navigation -->
  <nav class="nav">
    <div class="nav-group">
      <a href="/" class="nav-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span class="nav-label">Home</span>
      </a>
      <a href="/encrypt" class="nav-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span class="nav-label">Encrypt</span>
      </a>
      <a href="/decrypt" class="nav-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
        </svg>
        <span class="nav-label">Decrypt</span>
      </a>
      {#if !isTouchDevice}
        <button class="nav-link shortcut-toggle" onclick={() => showShortcuts = !showShortcuts} aria-label="Show keyboard shortcuts">
          <kbd>?</kbd>
        </button>
      {/if}
    </div>
  </nav>

  <!-- Shortcuts Modal -->
  {#if showShortcuts}
    <div class="shortcuts-overlay" onclick={() => showShortcuts = false} role="dialog" aria-modal="true" tabindex="-1">
      <div class="shortcuts-modal" onclick={(e) => e.stopPropagation()} role="document">
        <h3>Keyboard Shortcuts</h3>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <span>Generate keys</span>
            <div class="keys"><kbd>⌘</kbd><kbd>↵</kbd></div>
          </div>
          <div class="shortcut-item">
            <span>Clear all</span>
            <div class="keys"><kbd>Esc</kbd></div>
          </div>
          <div class="shortcut-item">
            <span>Toggle shortcuts</span>
            <div class="keys"><kbd>?</kbd></div>
          </div>
        </div>
        <button class="close-btn" onclick={() => showShortcuts = false}>Close</button>
      </div>
    </div>
  {/if}

  <main class="main">
    <!-- Header -->
    <header class="header">
      <div class="icon generate">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
        </svg>
      </div>
      <div class="header-text">
        <h1>PGP Converter</h1>
        <span class="page-title">Generate Keys</span>
      </div>
    </header>

    <!-- Toast -->
    {#if generateSuccess}
      <div class="toast success">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Keys generated
      </div>
    {/if}
    {#if errorMessage}
      <div class="toast error">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        {errorMessage}
      </div>
    {/if}

    <!-- Input Fields -->
    <div class="fields">
      <div class="field-row">
        <div class="field">
          <label for="name">Name</label>
          <input
            type="text"
            id="name"
            bind:value={name}
            placeholder="Your name..."
          />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            bind:value={email}
            placeholder="your@email.com"
          />
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="passphrase">Passphrase</label>
          <input
            type="password"
            id="passphrase"
            bind:value={passphrase}
            placeholder="Min 8 characters..."
          />
          {#if passphrase && passphrase.length < 8}
            <span class="field-hint error">Must be at least 8 characters</span>
          {/if}
        </div>
        <div class="field">
          <label for="confirmPassphrase">Confirm Passphrase</label>
          <input
            type="password"
            id="confirmPassphrase"
            bind:value={confirmPassphrase}
            placeholder="Confirm passphrase..."
            class:error={!passphraseMatch}
          />
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
              <option value="p256">NIST P-256</option>
              <option value="p384">NIST P-384</option>
              <option value="p521">NIST P-521</option>
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

    <!-- Output -->
    {#if publicKey && privateKey}
      <div class="keys-output">
        <div class="key-section">
          <div class="key-header">
            <span class="key-label public">Public Key</span>
            <div class="key-actions">
              <button class="action-btn" onclick={copyPublicKey}>
                {#if copyPublicSuccess}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                {:else}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                {/if}
              </button>
              <button class="action-btn" onclick={downloadPublicKey}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
            </div>
          </div>
          <pre class="key-content">{publicKey}</pre>
        </div>

        <div class="key-section">
          <div class="key-header">
            <span class="key-label private">Private Key</span>
            <div class="key-actions">
              <button class="action-btn" onclick={copyPrivateKey}>
                {#if copyPrivateSuccess}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                {:else}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                {/if}
              </button>
              <button class="action-btn" onclick={downloadPrivateKey}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
            </div>
          </div>
          <pre class="key-content">{privateKey}</pre>
        </div>

        <button class="download-both-btn" onclick={downloadBothKeys}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download Both Keys as .txt
        </button>
      </div>
    {/if}

    <!-- Warning -->
    <div class="warning-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <p><strong>Important:</strong> Keep your private key and passphrase safe. Never share your private key with anyone. If you lose your passphrase, you will not be able to decrypt messages.</p>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <a href="https://github.com/polyym/pgp-converter" target="_blank" rel="noopener noreferrer" class="footer-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        View source code on GitHub
      </a>
      <span class="footer-divider">·</span>
      <a href="/help" class="footer-link">Help</a>
    </footer>
  </main>

  <!-- Sticky Bottom Actions -->
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
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');

  :global(*) {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }

  .app {
    --bg: #09090b;
    --surface: #0f0f12;
    --surface-2: #16161a;
    --border: #1f1f24;
    --border-hover: #2a2a30;
    --text: #fafafa;
    --text-secondary: #71717a;
    --text-dim: #3f3f46;
    --accent: #fff;
    --success: #22c55e;
    --error: #ef4444;
    --warning: #f59e0b;
    --info: #3b82f6;
    --font: 'Inter', -apple-system, sans-serif;
    --mono: 'IBM Plex Mono', monospace;

    --safe-top: env(safe-area-inset-top, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --safe-left: env(safe-area-inset-left, 0px);
    --safe-right: env(safe-area-inset-right, 0px);

    min-height: 100vh;
    min-height: 100dvh;
    background: var(--bg);
    font-family: var(--font);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    padding-bottom: 100px;
  }

  .nav {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    justify-content: center;
    padding: 16px;
    padding-top: calc(16px + var(--safe-top));
    background: var(--bg);
  }

  .nav-group {
    display: flex;
    gap: 6px;
  }

  .nav-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 44px;
    min-width: 44px;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .nav-link:hover {
    color: var(--text);
    border-color: var(--border-hover);
    background: var(--surface);
  }

  .nav-link:active {
    background: var(--surface-2);
    transform: scale(0.98);
  }

  .shortcut-toggle {
    padding: 8px 12px;
  }

  .shortcut-toggle kbd {
    font-family: var(--font);
    font-size: 13px;
    background: none;
    border: none;
    padding: 0;
    min-width: auto;
    height: auto;
  }

  .main {
    max-width: 560px;
    margin: 0 auto;
    padding: 12px 20px 40px;
    padding-left: calc(20px + var(--safe-left));
    padding-right: calc(20px + var(--safe-right));
  }

  .header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 28px;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    color: var(--text);
    flex-shrink: 0;
  }

  .icon.generate {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.2);
    color: #a78bfa;
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  h1 {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.3px;
    margin: 0;
  }

  .page-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    margin-bottom: 20px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 10px;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .toast.success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
    color: var(--success);
  }

  .toast.error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: var(--error);
  }

  .fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
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

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    padding-left: 2px;
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

  input::placeholder {
    color: var(--text-dim);
  }

  input:hover, select:hover {
    border-color: var(--border-hover);
  }

  input:focus, select:focus {
    outline: none;
    border-color: #3f3f46;
  }

  input.error {
    border-color: var(--error);
  }

  select {
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 40px;
  }

  .field-hint {
    font-size: 12px;
    padding-left: 2px;
  }

  .field-hint.error {
    color: var(--error);
  }

  .keys-output {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
  }

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

  .key-label {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .key-label.public {
    color: var(--success);
  }

  .key-label.private {
    color: var(--error);
  }

  .key-actions {
    display: flex;
    gap: 8px;
  }

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

  .action-btn:hover {
    color: var(--text);
    border-color: var(--border-hover);
  }

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

  .download-both-btn:hover {
    border-color: var(--border-hover);
    background: var(--surface-2);
  }

  .warning-box {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 12px;
    margin-bottom: 24px;
  }

  .warning-box svg {
    flex-shrink: 0;
    color: var(--warning);
    margin-top: 2px;
  }

  .warning-box p {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  .warning-box strong {
    color: var(--warning);
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 24px 0 8px;
  }

  .footer-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .footer-link:hover {
    color: var(--text);
  }

  .footer-divider {
    color: var(--border);
  }

  .bottom-actions {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    background: linear-gradient(to top, var(--bg) 70%, transparent);
    padding: 16px 20px;
    padding-bottom: calc(16px + var(--safe-bottom));
    padding-left: calc(20px + var(--safe-left));
    padding-right: calc(20px + var(--safe-right));
  }

  .bottom-actions-inner {
    display: flex;
    gap: 10px;
    max-width: 560px;
    margin: 0 auto;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 52px;
    padding: 14px 24px;
    font-family: var(--font);
    font-size: 15px;
    font-weight: 600;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    user-select: none;
  }

  .btn kbd {
    font-family: var(--font);
    font-size: 11px;
    opacity: 0.5;
    margin-left: 4px;
    background: none;
    border: none;
    padding: 0;
    min-width: auto;
    height: auto;
  }

  .btn.primary {
    flex: 1;
    color: #000;
    background: var(--text);
  }

  .btn.primary:hover:not(:disabled) {
    background: #e4e4e7;
  }

  .btn.primary:active:not(:disabled) {
    background: #d4d4d8;
    transform: scale(0.98);
  }

  .btn.primary:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .btn.secondary {
    color: var(--text-secondary);
    background: var(--surface);
    border: 1px solid var(--border);
  }

  .btn.secondary:hover {
    color: var(--text);
    border-color: var(--border-hover);
  }

  .btn.secondary:active {
    background: var(--surface-2);
    transform: scale(0.98);
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(0, 0, 0, 0.2);
    border-top-color: #000;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .shortcuts-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    z-index: 100;
    padding: 20px;
    animation: fadeIn 0.15s ease;
  }

  .shortcuts-modal {
    width: 100%;
    max-width: 320px;
    padding: 24px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 18px;
  }

  .shortcuts-modal h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 20px;
  }

  .shortcut-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 24px;
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    color: var(--text-secondary);
  }

  .keys {
    display: flex;
    gap: 4px;
  }

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    padding: 0 8px;
    font-family: var(--font);
    font-size: 12px;
    font-weight: 500;
    color: var(--text);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 6px;
  }

  .close-btn {
    width: 100%;
    min-height: 48px;
    padding: 12px;
    font-family: var(--font);
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .close-btn:hover {
    color: var(--text);
    border-color: var(--border-hover);
  }

  @media (max-width: 380px) {
    .nav-label {
      display: none;
    }

    .nav-link {
      padding: 8px 12px;
    }

    h1 {
      font-size: 20px;
    }

    .main {
      padding: 8px 16px 40px;
    }

    .bottom-actions {
      padding-left: 16px;
      padding-right: 16px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .toast,
    .shortcuts-overlay {
      animation: none;
    }

    .btn:active,
    .nav-link:active,
    .action-btn:active,
    .close-btn:active {
      transform: none;
    }
  }
</style>
