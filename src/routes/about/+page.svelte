<script lang="ts">
  import { NavBar, PageHeader, PageFooter } from '$lib/components';
  import { onMount } from 'svelte';

  let isTouchDevice = $state(false);

  onMount(() => {
    isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });
</script>

<svelte:head>
  <title>About PGP Converter: Privacy, Security &amp; How PGP Works</title>
  <meta name="description" content="Learn about PGP Converter, how it keeps your data private, and how PGP encryption works. Hosted on Netlify, no cookies, no tracking scripts, fully open source." />
  <meta name="keywords" content="pgp converter about, how pgp works, pgp encryption explained, pgp public key private key, what is pgp, pgp security, client side encryption, open source pgp tool" />
  <meta property="og:title" content="About PGP Converter: Privacy, Security & How PGP Works" />
  <meta property="og:description" content="Learn about PGP Converter, how it keeps your data private, and how PGP encryption works. Fully open source, no tracking." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://pgp-converter.com/about" />
  <meta property="og:site_name" content="PGP Converter" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="About PGP Converter: Privacy, Security & How PGP Works" />
  <meta name="twitter:description" content="Learn about PGP Converter, how it keeps your data private, and how PGP encryption works." />
  <link rel="canonical" href="https://pgp-converter.com/about" />
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is PGP encryption?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "PGP (Pretty Good Privacy) uses public-key cryptography. Every user has a public key (shared freely for others to encrypt messages to you) and a private key (kept secret to decrypt messages). Only the matching private key can decrypt a message encrypted with the public key."
        }
      },
      {
        "@type": "Question",
        "name": "Is PGP Converter safe to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. All encryption, decryption, and key generation happens entirely in your browser using the OpenPGP.js library. No data is transmitted to any server. Your private keys and messages never leave your device."
        }
      },
      {
        "@type": "Question",
        "name": "What key types does PGP Converter support?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "PGP Converter supports ECC keys (Curve25519, NIST P-256, P-384, P-521) and RSA keys (2048, 3072, or 4096 bits). ECC with Curve25519 is recommended for optimal security and performance."
        }
      },
      {
        "@type": "Question",
        "name": "Does PGP Converter track its users?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. PGP Converter sets no cookies, runs no client-side tracking scripts, and collects no personal data. The site is hosted on Netlify, which provides basic server-side analytics (page views, unique visitors, top locations) through its standard logs. These metrics are never shared with anyone."
        }
      }
    ]
  })}</script>`}
</svelte:head>

<div class="app">
  <NavBar currentPage="about" showShortcutsToggle={false} {isTouchDevice} />

  <main class="main">
    <PageHeader title="About" iconClass="about">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>
    </PageHeader>

    <section class="section">
      <h2>About This App</h2>
      <p>PGP Converter is a free, open-source tool for encrypting and decrypting messages using PGP (Pretty Good Privacy). It has been free, ad-free, and open source since its launch in May 2023. The application runs entirely in your browser; no data is ever sent to any server.</p>
      <p>This means:</p>
      <ul>
        <li>Your private keys never leave your device</li>
        <li>Your messages are never transmitted over the network</li>
        <li>You can verify the source code on <a href="https://github.com/polyym/pgp-converter" target="_blank" rel="noopener noreferrer">GitHub</a></li>
      </ul>
    </section>

    <section class="section">
      <h2>Hosting &amp; Privacy</h2>
      <div class="info-box">
        <p>PGP Converter is hosted on <a href="https://www.netlify.com/" target="_blank" rel="noopener noreferrer">Netlify</a>. Basic server-side analytics are enabled through Netlify's standard logs, giving us aggregate metrics like page views, unique visitors, and top locations. This data is never shared with anyone.</p>
        <p>Beyond that:</p>
        <ul>
          <li>No cookies are set</li>
          <li>No client-side tracking scripts are loaded</li>
          <li>No third-party code runs on this site besides <a href="https://openpgpjs.org/" target="_blank" rel="noopener noreferrer">OpenPGP.js</a></li>
          <li>No personal data is collected, stored, or transmitted by the application</li>
        </ul>
      </div>
    </section>

    <section class="section">
      <h2>How PGP Works</h2>
      <p>PGP (Pretty Good Privacy) uses a system called <strong>public-key cryptography</strong>. Here's how it works:</p>

      <div class="concept">
        <h3>Key Pairs</h3>
        <p>Every user has two keys that are mathematically linked:</p>
        <ul>
          <li><strong>Public Key:</strong> Share this freely. Others use it to encrypt messages to you.</li>
          <li><strong>Private Key:</strong> Keep this secret. Only you can decrypt messages with it.</li>
        </ul>
      </div>

      <div class="concept">
        <h3>Encryption</h3>
        <p>When someone wants to send you a secret message:</p>
        <ol>
          <li>They obtain your <strong>public key</strong></li>
          <li>They encrypt their message using your public key</li>
          <li>Only your <strong>private key</strong> can decrypt the message</li>
        </ol>
      </div>

      <div class="concept">
        <h3>Decryption</h3>
        <p>When you receive an encrypted message:</p>
        <ol>
          <li>You use your <strong>private key</strong> and <strong>passphrase</strong></li>
          <li>The message is decrypted and readable</li>
        </ol>
      </div>
    </section>

    <section class="section">
      <h2>Using This App</h2>

      <div class="feature-card">
        <div class="feature-icon generate">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
        </div>
        <div class="feature-content">
          <h3>Generate Keys</h3>
          <p>Create a new PGP key pair. You'll need to provide your name, email, and a strong passphrase. Choose between ECC (faster, modern) or RSA (traditional, widely compatible) key types.</p>
          <a href="/generate" class="feature-link">Go to Generate Keys →</a>
        </div>
      </div>

      <div class="feature-card">
        <div class="feature-icon encrypt">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div class="feature-content">
          <h3>Encrypt Messages</h3>
          <p>Enter your message and the recipient's public key. The encrypted output can only be read by the person who has the corresponding private key.</p>
          <a href="/encrypt" class="feature-link">Go to Encrypt →</a>
        </div>
      </div>

      <div class="feature-card">
        <div class="feature-icon decrypt">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
          </svg>
        </div>
        <div class="feature-content">
          <h3>Decrypt Messages</h3>
          <p>Paste the encrypted message, your private key, and enter your passphrase to reveal the original message.</p>
          <a href="/decrypt" class="feature-link">Go to Decrypt →</a>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Security Best Practices</h2>
      <div class="tips">
        <div class="tip">
          <div class="tip-icon">🔐</div>
          <div class="tip-content">
            <strong>Protect your private key</strong>
            <p>Never share your private key with anyone. Store it in a secure location.</p>
          </div>
        </div>
        <div class="tip">
          <div class="tip-icon">🔑</div>
          <div class="tip-content">
            <strong>Use a strong passphrase</strong>
            <p>Choose a long, unique passphrase that you can remember but others cannot guess. This protects your private key.</p>
          </div>
        </div>
        <div class="tip">
          <div class="tip-icon">✅</div>
          <div class="tip-content">
            <strong>Verify public keys</strong>
            <p>Before encrypting, confirm you have the correct public key through a trusted channel.</p>
          </div>
        </div>
        <div class="tip">
          <div class="tip-icon">💾</div>
          <div class="tip-content">
            <strong>Backup your keys</strong>
            <p>Keep secure backups of your key pair. If you lose your private key, you cannot decrypt messages.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Security Considerations</h2>
      <div class="info-box">
        <p>As noted in the <a href="https://docs.openpgpjs.org/" target="_blank" rel="noopener noreferrer">OpenPGP.js documentation</a>, web-hosted cryptographic applications provide a different security model compared to installable applications. With web apps, users trust the server to deliver the correct code each time.</p>
        <p>For maximum security in sensitive contexts:</p>
        <ul>
          <li>Verify the <a href="https://github.com/polyym/pgp-converter" target="_blank" rel="noopener noreferrer">source code</a> matches what is deployed</li>
          <li>Use browser developer tools to confirm no network requests are made during crypto operations</li>
          <li>For high-security needs, consider running locally or using dedicated PGP software</li>
        </ul>
      </div>
    </section>

    <section class="section">
      <h2>Useful Resources</h2>
      <div class="resources">
        <a href="https://openpgpjs.org/" target="_blank" rel="noopener noreferrer" class="resource">
          <div class="resource-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </div>
          <div class="resource-content">
            <strong>OpenPGP.js</strong>
            <span>The library that powers this application</span>
          </div>
        </a>
        <a href="https://www.openpgp.org/" target="_blank" rel="noopener noreferrer" class="resource">
          <div class="resource-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </div>
          <div class="resource-content">
            <strong>OpenPGP.org</strong>
            <span>Official OpenPGP standard documentation</span>
          </div>
        </a>
        <a href="https://emailselfdefense.fsf.org/" target="_blank" rel="noopener noreferrer" class="resource">
          <div class="resource-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </div>
          <div class="resource-content">
            <strong>Email Self-Defense</strong>
            <span>FSF's guide to email encryption</span>
          </div>
        </a>
        <a href="https://github.com/polyym/pgp-converter" target="_blank" rel="noopener noreferrer" class="resource">
          <div class="resource-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          </div>
          <div class="resource-content">
            <strong>Source Code</strong>
            <span>View and contribute on GitHub</span>
          </div>
        </a>
      </div>
    </section>

    <PageFooter />
  </main>
</div>

<style>
  .app {
    padding-bottom: 0;
  }

  .app :global(.nav-group) {
    flex-wrap: wrap;
    justify-content: center;
  }

  .main {
    max-width: 640px;
    margin: 0 auto;
    padding: 12px 20px 60px;
    padding-left: calc(20px + var(--safe-left));
    padding-right: calc(20px + var(--safe-right));
    padding-bottom: calc(60px + var(--safe-bottom));
  }

  @media (min-width: 768px) {
    .main {
      max-width: 820px;
    }
  }

  .app :global(.header) {
    margin-bottom: 32px;
  }

  .section { margin-bottom: 40px; }
  .section h2 { font-size: 18px; font-weight: 600; margin: 0 0 16px; color: var(--text); }
  .section p { font-size: 15px; line-height: 1.7; color: var(--text-secondary); margin: 0 0 12px; }
  .section ul, .section ol { margin: 0 0 16px; padding-left: 24px; }
  .section li { font-size: 15px; line-height: 1.7; color: var(--text-secondary); margin-bottom: 8px; }
  .section a { color: var(--info); text-decoration: underline; text-underline-offset: 2px; }
  .section a:hover { color: var(--text); }
  .section strong { color: var(--text); font-weight: 500; }

  .info-box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px 18px;
  }
  .info-box p { font-size: 14px; line-height: 1.7; margin: 0 0 12px; }
  .info-box ul { margin: 0; padding-left: 20px; }
  .info-box li { font-size: 14px; line-height: 1.7; margin-bottom: 6px; }

  .concept {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px 18px;
    margin-bottom: 12px;
  }
  .concept h3 { font-size: 14px; font-weight: 600; color: var(--text); margin: 0 0 10px; }
  .concept p { margin: 0 0 8px; font-size: 14px; }
  .concept ul, .concept ol { margin: 0; padding-left: 20px; }
  .concept li { font-size: 14px; margin-bottom: 4px; }

  .feature-card {
    display: flex;
    gap: 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px 18px;
    margin-bottom: 12px;
  }

  .feature-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    flex-shrink: 0;
  }
  .feature-icon.encrypt { background: rgba(34, 197, 94, 0.1); color: var(--success); }
  .feature-icon.decrypt { background: rgba(59, 130, 246, 0.1); color: var(--info); }
  .feature-icon.generate { background: rgba(167, 139, 250, 0.1); color: var(--purple); }

  .feature-content { flex: 1; }
  .feature-content h3 { font-size: 15px; font-weight: 600; color: var(--text); margin: 0 0 6px; }
  .feature-content p { font-size: 14px; line-height: 1.6; margin: 0 0 10px; }
  .feature-link { font-size: 13px; font-weight: 500; color: var(--info); text-decoration: none; }
  .feature-link:hover { text-decoration: underline; }

  .tips { display: flex; flex-direction: column; gap: 12px; }
  .tip {
    display: flex;
    gap: 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 16px;
  }
  .tip-icon { font-size: 20px; flex-shrink: 0; }
  .tip-content { flex: 1; }
  .tip-content strong { display: block; font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .tip-content p { font-size: 13px; line-height: 1.5; margin: 0; }

  .resources { display: flex; flex-direction: column; gap: 10px; }
  .resource {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 16px;
    text-decoration: none;
    transition: all 0.15s ease;
  }
  .resource:hover { border-color: var(--border-hover); background: var(--surface-2); }
  .resource-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--surface-2);
    border-radius: 10px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }
  .resource:hover .resource-icon { color: var(--text); }
  .resource-content { flex: 1; }
  .resource-content strong { display: block; font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
  .resource-content span { font-size: 13px; color: var(--text-secondary); }

  @media (max-width: 380px) {
    .app :global(h1) { font-size: 18px; }
    .section h2 { font-size: 16px; }
    .feature-card { flex-direction: column; gap: 12px; }
    .tip { flex-direction: column; gap: 10px; }
  }
</style>
