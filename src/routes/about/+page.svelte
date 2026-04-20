<script lang="ts">
  import { NavBar, PageHeader, PageFooter, SEO } from '$lib/components';
</script>

<SEO
  title="About PGP Converter: Privacy, Security &amp; How PGP Works"
  description="Learn about PGP Converter, how it keeps your data private, and how PGP encryption works. Hosted on Netlify, no cookies, no tracking scripts, fully open source."
  path="/about"
/>

<div class="app">
  <NavBar currentPage="about" />

  <main class="main">
    <PageHeader title="About PGP Converter" iconClass="about">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>
    </PageHeader>

    <nav class="toc" aria-label="On this page">
      <p class="toc-title">On this page</p>
      <div class="toc-grid">
        <a href="#about-this-app" class="toc-link">About This App</a>
        <a href="#hosting-privacy" class="toc-link">Hosting &amp; Privacy</a>
        <a href="#how-pgp-works" class="toc-link">How PGP Works</a>
        <a href="#using-this-app" class="toc-link">Using This App</a>
        <a href="#security-best-practices" class="toc-link">Security Best Practices</a>
        <a href="#threat-model" class="toc-link">Threat Model</a>
        <a href="#verifying-this-deployment" class="toc-link">Verifying This Deployment</a>
        <a href="#reporting-issues" class="toc-link">Reporting Issues</a>
        <a href="#useful-resources" class="toc-link">Useful Resources</a>
      </div>
    </nav>

    <section class="section" id="about-this-app">
      <h2>About This App</h2>
      <p>PGP Converter is a free, open-source tool for encrypting and decrypting messages using PGP (Pretty Good Privacy). It has been free, ad-free, and open source since its launch in May 2023. No sponsors, no affiliate links, no paid placements; the project is supported solely by optional donations, and donors receive nothing in return. All cryptographic operations run entirely in your browser; no keys, messages, or passphrases are ever sent to any server.</p>
      <p>This means:</p>
      <ul>
        <li>Your private keys never leave your device</li>
        <li>Your messages are never transmitted over the network</li>
        <li>The only external request the app makes is to fetch up-to-date donation wallet addresses on the donate page, and no user data is involved</li>
        <li>You can verify the source code on <a href="https://github.com/polyym/pgp-converter" target="_blank" rel="noopener noreferrer">GitHub</a></li>
      </ul>
    </section>

    <section class="section" id="hosting-privacy">
      <h2>Hosting &amp; Privacy</h2>
      <div class="info-box">
        <p>PGP Converter is hosted on <a href="https://www.netlify.com/" target="_blank" rel="noopener noreferrer">Netlify</a>. Basic server-side analytics are enabled through Netlify's standard logs, giving us aggregate metrics like page views, unique visitors, and top locations. This data is never shared with anyone.</p>
        <p>Beyond that:</p>
        <ul>
          <li>No cookies are set</li>
          <li>No client-side tracking scripts are loaded</li>
          <li>No third-party code runs on this site besides <a href="https://openpgpjs.org/" target="_blank" rel="noopener noreferrer">OpenPGP.js</a> and a private API used solely to retrieve donation wallet addresses</li>
          <li>No personal data, user accounts, databases, or per-user logs; beyond the aggregate Netlify metrics above, nothing about you or your activity is retained</li>
          <li>Because user data is never collected or stored, it cannot be produced in response to a subpoena; we simply do not have it</li>
        </ul>
        <p><strong>Prefer to verify this independently?</strong> You don't have to take our word for it. Routing your traffic through a trustworthy VPN hides your IP address and approximate location from the aggregate analytics described above; however, a VPN shifts trust to the VPN provider rather than removing it and does not provide anonymity on its own. For genuine anonymity, use <a href="https://www.torproject.org/" target="_blank" rel="noopener noreferrer">Tor Browser</a>, which is purpose-built for it. <a href="https://www.privacyguides.org/" target="_blank" rel="noopener noreferrer">Privacy Guides</a> maintains vetted recommendations for both.</p>
      </div>
    </section>

    <section class="section" id="how-pgp-works">
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

    <section class="section" id="using-this-app">
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

    <section class="section" id="security-best-practices">
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

    <section class="section" id="threat-model">
      <h2>Threat Model</h2>
      <p>Every security tool has a scope. Here is what this one does and does not protect you from.</p>

      <div class="concept">
        <h3>What this tool is designed to protect against</h3>
        <ul>
          <li>Passive network eavesdroppers reading your messages in transit</li>
          <li>Tampering of ciphertext in transit: OpenPGP v6 uses authenticated encryption (AEAD), which detects and rejects modified messages before revealing plaintext</li>
          <li>Server-side key theft, because there is no server-side key storage</li>
          <li>Server-side logging of your inputs, because there is no server-side processing</li>
          <li>Cryptanalysis of the underlying ciphers with current classical computing power: Curve25519 provides around 128-bit security, and RSA at 3072+ bits remains unbroken against known attacks</li>
          <li>Accidental transmission of plaintext when you intended to encrypt</li>
        </ul>
      </div>

      <div class="concept">
        <h3>What this tool does not protect against</h3>
        <ul>
          <li><strong>A compromised deployment.</strong> If an attacker gained control of this site's hosting or build pipeline, they could serve tampered JavaScript that exfiltrates your keys. This is the inherent limitation of any web-based cryptographic tool, and the reason we recommend a local PGP client for high-stakes use.</li>
          <li><strong>Endpoint compromise.</strong> If your device has a keylogger, malware, or a compromised browser extension, nothing done in-browser can save you.</li>
          <li><strong>Metadata leakage.</strong> PGP encrypts message content, but not the email subject line, sender or recipient addresses, or the timestamp. Who talked to whom and when remains visible to anyone with access to the headers.</li>
          <li><strong>Loss of forward secrecy.</strong> PGP does not provide forward secrecy. If your private key is ever compromised, every past message encrypted to that key can be decrypted.</li>
          <li><strong>High-value targeted adversaries.</strong> For journalistic sources, legal material, long-term archives, or any threat model at that level, use <a href="https://gnupg.org/" target="_blank" rel="noopener noreferrer">GnuPG</a> locally or a desktop PGP mail client.</li>
        </ul>
      </div>
    </section>

    <section class="section" id="verifying-this-deployment">
      <h2>Verifying This Deployment</h2>
      <div class="info-box">
        <p>As noted in the <a href="https://docs.openpgpjs.org/" target="_blank" rel="noopener noreferrer">OpenPGP.js documentation</a>, web-hosted cryptographic applications provide a different security model compared to installable applications. With web apps, users trust the server to deliver the correct code each time.</p>
        <p><strong>What:</strong> Every production deploy is built and signed by GitHub Actions using a short-lived <a href="https://www.sigstore.dev/" target="_blank" rel="noopener noreferrer">Sigstore</a>-issued certificate. The attestation links each deployed file to a specific commit and workflow run, and is recorded in Sigstore's public transparency log.</p>
        <p><strong>Why:</strong> A web app's security depends on the deployed JavaScript matching the reviewed source code; attestation makes this a check you can run, not a promise you have to take on faith.</p>
        <p><strong>How to verify:</strong> Install the <a href="https://cli.github.com/" target="_blank" rel="noopener noreferrer">GitHub CLI</a> and run:</p>
        <pre class="verify-cmd"><code>gh attestation verify &lt;file&gt; --repo polyym/pgp-converter</code></pre>
        <p>For additional assurance:</p>
        <ul>
          <li>Use browser developer tools to confirm no unexpected network requests are made during crypto operations</li>
          <li>For high-security needs, consider running locally or using dedicated PGP software like <a href="https://gnupg.org/" target="_blank" rel="noopener noreferrer">GnuPG</a></li>
        </ul>
      </div>
    </section>

    <section class="section" id="reporting-issues">
      <h2>Reporting Issues</h2>
      <p>Found a bug, have a suggestion, or want to report a security issue? Please open an issue on <a href="https://github.com/polyym/pgp-converter/issues" target="_blank" rel="noopener noreferrer">GitHub</a>.</p>
    </section>

    <section class="section" id="useful-resources">
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
        <a href="https://ssd.eff.org/" target="_blank" rel="noopener noreferrer" class="resource">
          <div class="resource-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </div>
          <div class="resource-content">
            <strong>Surveillance Self-Defense</strong>
            <span>EFF's guide to digital security and privacy</span>
          </div>
        </a>
        <a href="https://www.privacyguides.org/" target="_blank" rel="noopener noreferrer" class="resource">
          <div class="resource-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </div>
          <div class="resource-content">
            <strong>Privacy Guides</strong>
            <span>Independent recommendations for privacy tools</span>
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

  .section { margin-bottom: 40px; scroll-margin-top: 80px; }

  .toc {
    margin-bottom: 40px;
    padding: 16px 18px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .toc-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 12px;
  }
  .toc-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px 16px;
  }
  .toc-link {
    font-size: 14px;
    color: var(--text);
    text-decoration: none;
    padding: 2px 0;
    transition: color 0.15s ease;
  }
  .toc-link:hover {
    color: var(--info);
  }
  @media (max-width: 500px) {
    .toc-grid { grid-template-columns: 1fr; }
  }
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

  .verify-cmd {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    margin: 0 0 12px;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--text);
    overflow-x: auto;
    white-space: pre;
  }
  .verify-cmd code { font-family: inherit; }

  @media (max-width: 380px) {
    .app :global(h1) { font-size: 18px; }
    .section h2 { font-size: 16px; }
    .feature-card { flex-direction: column; gap: 12px; }
    .tip { flex-direction: column; gap: 10px; }
  }
</style>
