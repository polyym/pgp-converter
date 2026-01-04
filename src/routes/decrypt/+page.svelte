<script lang="ts">
  import { decryptMessage } from '$lib/decryption';
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

  const isValid = $derived(encrypted.trim().length > 0 && privateKey.trim().length > 0);

  async function handleDecrypt() {
    if (!isValid || isLoading) return;

    isLoading = true;
    decryptSuccess = false;
    errorMessage = '';

    await new Promise(resolve => setTimeout(resolve, 200));

    const result = await decryptMessage(encrypted, privateKey, passphrase);

    if (result.success && result.data) {
      decrypted = result.data;
      errorMessage = '';
      decryptSuccess = true;
      setTimeout(() => decryptSuccess = false, 2500);
    } else {
      errorMessage = result.error || 'Decryption failed';
      decrypted = '';
      setTimeout(() => errorMessage = '', 4000);
    }
    isLoading = false;
  }

  async function copyToClipboard() {
    if (!decrypted) return;

    try {
      await navigator.clipboard.writeText(decrypted);
      copySuccess = true;
      setTimeout(() => copySuccess = false, 1500);
    } catch {
      errorMessage = 'Failed to copy';
      setTimeout(() => errorMessage = '', 3000);
    }
  }

  function clearAll() {
    encrypted = '';
    privateKey = '';
    passphrase = '';
    decrypted = '';
    errorMessage = '';
  }

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;

    // Cmd/Ctrl + Enter to decrypt
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleDecrypt();
    }
    // Cmd/Ctrl + Shift + C to copy result
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'c' || e.key === 'C') && decrypted) {
      e.preventDefault();
      copyToClipboard();
    }
    // Escape to clear
    if (e.key === 'Escape' && (encrypted || privateKey || passphrase || decrypted)) {
      e.preventDefault();
      clearAll();
    }
    // ? to toggle shortcuts (only when not in textarea/input)
    if (e.key === '?' && target.tagName !== 'TEXTAREA' && target.tagName !== 'INPUT') {
      e.preventDefault();
      showShortcuts = !showShortcuts;
    }
  }

  onMount(() => {
    // Detect touch device
    isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });
</script>

<svelte:head>
  <title>Decrypt Message - PGP Converter</title>
  <meta name="description" content="Decrypt PGP-encrypted messages securely. Paste your encrypted message, private key, and passphrase to reveal the original content. All processing happens in your browser." />
  <meta property="og:title" content="Decrypt Message - PGP Converter" />
  <meta property="og:description" content="Decrypt PGP-encrypted messages securely. All processing happens in your browser - no data is sent to any server." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://pgp-converter.com/decrypt" />
  <link rel="canonical" href="https://pgp-converter.com/decrypt" />
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
      {#if !isTouchDevice}
        <button class="nav-link shortcut-toggle" onclick={() => showShortcuts = !showShortcuts} aria-label="Show keyboard shortcuts">
          <kbd>?</kbd>
        </button>
      {/if}
    </div>
  </nav>

  <!-- Shortcuts Modal -->
  {#if showShortcuts}
    <div class="shortcuts-overlay" onclick={() => showShortcuts = false} role="dialog" aria-modal="true">
      <div class="shortcuts-modal" onclick={(e) => e.stopPropagation()}>
        <h3>Keyboard Shortcuts</h3>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <span>Decrypt message</span>
            <div class="keys"><kbd>⌘</kbd><kbd>↵</kbd></div>
          </div>
          <div class="shortcut-item">
            <span>Copy result</span>
            <div class="keys"><kbd>⌘</kbd><kbd>⇧</kbd><kbd>C</kbd></div>
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
      <div class="icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
        </svg>
      </div>
      <div class="header-text">
        <h1>PGP Converter</h1>
        <span class="page-title">Decrypt</span>
      </div>
    </header>

    <!-- Toast -->
    {#if decryptSuccess}
      <div class="toast success">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Decrypted
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

    <!-- Output -->
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

    <!-- Footer -->
    <footer class="footer">
      <a href="https://github.com/polyym/pgp-converter" target="_blank" rel="noopener noreferrer" class="footer-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        View source code on GitHub
      </a>
    </footer>
  </main>

  <!-- Sticky Bottom Actions -->
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
    --font: 'Inter', -apple-system, sans-serif;
    --mono: 'IBM Plex Mono', monospace;

    /* Safe area insets for notched devices */
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

  /* Navigation */
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

  /* Main Content */
  .main {
    max-width: 480px;
    margin: 0 auto;
    padding: 12px 20px 40px;
    padding-left: calc(20px + var(--safe-left));
    padding-right: calc(20px + var(--safe-right));
  }

  /* Header */
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

  /* Toast */
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

  /* Fields */
  .fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
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

  textarea, input[type="password"] {
    width: 100%;
    padding: 14px 16px;
    font-family: var(--font);
    font-size: 16px;
    line-height: 1.6;
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    transition: border-color 0.15s ease;
  }

  textarea {
    min-height: 100px;
    resize: vertical;
  }

  textarea::placeholder, input::placeholder {
    color: var(--text-dim);
  }

  textarea:hover, input[type="password"]:hover {
    border-color: var(--border-hover);
  }

  textarea:focus, input[type="password"]:focus {
    outline: none;
    border-color: #3f3f46;
  }

  textarea.mono {
    font-family: var(--mono);
    font-size: 14px;
  }

  /* Bottom Sticky Actions */
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
    max-width: 480px;
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

  /* Spinner */
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

  /* Output */
  .output {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    transition: border-color 0.2s ease;
  }

  .output.has-content {
    border-color: rgba(34, 197, 94, 0.3);
  }

  .output-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 8px 12px;
    font-family: var(--font);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .copy-btn:hover {
    color: var(--text);
    border-color: var(--border-hover);
  }

  .copy-btn:active {
    background: var(--surface);
    transform: scale(0.98);
  }

  .copy-btn kbd {
    font-family: var(--font);
    font-size: 10px;
    opacity: 0.5;
    background: none;
    border: none;
    padding: 0;
    min-width: auto;
    height: auto;
  }

  .output-body {
    min-height: 100px;
    padding: 16px;
  }

  .output-body pre {
    margin: 0;
    font-family: var(--mono);
    font-size: 13px;
    line-height: 1.7;
    color: var(--success);
    word-break: break-all;
    white-space: pre-wrap;
  }

  .placeholder {
    display: block;
    font-size: 14px;
    color: var(--text-dim);
  }

  /* Footer */
  .footer {
    display: flex;
    justify-content: center;
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

  /* Shortcuts Modal */
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

  .close-btn:active {
    background: var(--surface);
    transform: scale(0.98);
  }

  /* Responsive - Small Phones */
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

  /* Responsive - Tablets and larger */
  @media (min-width: 768px) {
    .main {
      padding-top: 40px;
    }

    .header {
      margin-bottom: 36px;
    }

    h1 {
      font-size: 28px;
    }

    .fields {
      gap: 20px;
    }

    textarea {
      min-height: 120px;
    }
  }

  /* Landscape mobile */
  @media (max-height: 500px) and (orientation: landscape) {
    .app {
      padding-bottom: 80px;
    }

    .header {
      margin-bottom: 16px;
    }

    .icon {
      width: 40px;
      height: 40px;
    }

    h1 {
      font-size: 20px;
    }

    textarea {
      min-height: 70px;
    }

    .bottom-actions {
      padding: 12px 20px;
    }

    .btn {
      min-height: 44px;
      padding: 10px 20px;
    }
  }

  /* Reduce motion for accessibility */
  @media (prefers-reduced-motion: reduce) {
    .toast,
    .shortcuts-overlay {
      animation: none;
    }

    .btn:active,
    .nav-link:active,
    .copy-btn:active,
    .close-btn:active {
      transform: none;
    }
  }
</style>
