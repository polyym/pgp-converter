<script lang="ts">
  import { onMount } from 'svelte';

  let isTouchDevice = $state(false);

  onMount(() => {
    isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });
</script>

<svelte:head>
  <title>PGP Converter - Encrypt and Decrypt Messages with PGP</title>
  <meta name="description" content="PGP Converter is a free, open-source tool for encrypting and decrypting text using PGP (Pretty Good Privacy). All processing happens in your browser using OpenPGP.js - no data is sent to any server." />
  <meta name="keywords" content="PGP, encryption, decryption, OpenPGP, privacy, security, cryptography, open source" />
  <meta property="og:title" content="PGP Converter - Encrypt and Decrypt Messages with PGP" />
  <meta property="og:description" content="Free, open-source PGP encryption and decryption tool. All processing happens in your browser - no data is sent to any server." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://pgp-converter.com" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="PGP Converter - Encrypt and Decrypt Messages with PGP" />
  <meta name="twitter:description" content="Free, open-source PGP encryption and decryption tool. All processing happens in your browser." />
  <link rel="canonical" href="https://pgp-converter.com" />
</svelte:head>

<div class="app">
  <main class="main">
    <!-- Header -->
    <header class="header">
      <div class="icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
        </svg>
      </div>
      <div class="header-text">
        <h1>PGP Converter</h1>
        <span class="version">v2.0.0</span>
      </div>
    </header>

    <!-- Description -->
    <p class="description">
      PGP Converter is a tool that enables you to encrypt and decrypt text using the PGP (Pretty Good Privacy) protocol. It is built with Node.js, SvelteKit, Vite and Tailwind CSS. The encryption and decryption process utilises the OpenPGP.js library.
    </p>

    <!-- How it works -->
    <div class="info-box">
      <h3>How it works</h3>
      <p>All encryption and decryption happens entirely in your browser using the <a href="https://openpgpjs.org/" target="_blank" rel="noopener noreferrer">OpenPGP.js</a> library. No data is transmitted to any server - the processing is between you, your browser, and OpenPGP.js.</p>
    </div>

    <!-- Action Cards -->
    <div class="cards">
      <a href="/encrypt" class="card">
        <div class="card-icon encrypt">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div class="card-content">
          <h2>Encrypt</h2>
          <p>Secure your message with a public key</p>
        </div>
        <svg class="arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </a>

      <a href="/decrypt" class="card">
        <div class="card-icon decrypt">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
          </svg>
        </div>
        <div class="card-content">
          <h2>Decrypt</h2>
          <p>Unlock messages with your private key</p>
        </div>
        <svg class="arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </a>

      <a href="/generate" class="card">
        <div class="card-icon generate">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
        </div>
        <div class="card-content">
          <h2>Generate</h2>
          <p>Create a new PGP key pair</p>
        </div>
        <svg class="arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </a>
    </div>

    <!-- Footer Links -->
    <footer class="footer">
      <a href="https://github.com/polyym/pgp-converter" target="_blank" rel="noopener noreferrer" class="footer-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        GitHub
      </a>
      <span class="divider">·</span>
      <a href="https://openpgpjs.org/" target="_blank" rel="noopener noreferrer" class="footer-link">OpenPGP.js</a>
      <span class="divider">·</span>
      <a href="/help" class="footer-link">Help</a>
      <span class="divider">·</span>
      <span class="credit">by polyym</span>
    </footer>
  </main>
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
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    padding-top: calc(20px + var(--safe-top));
    padding-bottom: calc(20px + var(--safe-bottom));
    padding-left: calc(20px + var(--safe-left));
    padding-right: calc(20px + var(--safe-right));
  }

  .main {
    width: 100%;
    max-width: 420px;
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    color: var(--text);
    flex-shrink: 0;
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  h1 {
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -0.5px;
    margin: 0;
  }

  .version {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-dim);
    font-family: var(--mono);
  }

  /* Description */
  .description {
    font-size: 15px;
    line-height: 1.7;
    color: var(--text-secondary);
    margin: 0 0 24px;
  }

  /* Info Box */
  .info-box {
    padding: 16px 18px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    margin-bottom: 28px;
  }

  .info-box h3 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    margin: 0 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .info-box p {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0;
  }

  .info-box a {
    color: var(--text);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .info-box a:hover {
    color: var(--success);
  }

  /* Cards */
  .cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 32px;
  }

  .card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px 20px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    text-decoration: none;
    transition: all 0.15s ease;
  }

  .card:hover {
    border-color: var(--border-hover);
    background: var(--surface-2);
  }

  .card:active {
    transform: scale(0.99);
  }

  .card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    flex-shrink: 0;
  }

  .card-icon.encrypt {
    background: rgba(34, 197, 94, 0.1);
    color: var(--success);
  }

  .card-icon.decrypt {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }

  .card-icon.generate {
    background: rgba(168, 85, 247, 0.1);
    color: #a855f7;
  }

  .card-content {
    flex: 1;
  }

  .card-content h2 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    margin: 0 0 4px;
  }

  .card-content p {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
  }

  .arrow {
    color: var(--text-dim);
    flex-shrink: 0;
    transition: transform 0.15s ease;
  }

  .card:hover .arrow {
    transform: translateX(4px);
    color: var(--text-secondary);
  }

  /* Footer */
  .footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-size: 13px;
    color: var(--text-dim);
  }

  .footer-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .footer-link:hover {
    color: var(--text);
  }

  .divider {
    color: var(--border);
  }

  .credit {
    color: var(--text-dim);
  }

  /* Responsive - Small Phones */
  @media (max-width: 380px) {
    h1 {
      font-size: 22px;
    }

    .icon {
      width: 48px;
      height: 48px;
    }

    .icon svg {
      width: 24px;
      height: 24px;
    }

    .card {
      padding: 14px 16px;
    }

    .card-icon {
      width: 42px;
      height: 42px;
    }
  }

  /* Responsive - Tablets and larger */
  @media (min-width: 768px) {
    .app {
      padding: 40px;
    }

    h1 {
      font-size: 30px;
    }

    .description {
      font-size: 16px;
    }
  }

  /* Reduce motion for accessibility */
  @media (prefers-reduced-motion: reduce) {
    .card:active {
      transform: none;
    }

    .card:hover .arrow {
      transform: none;
    }
  }
</style>
