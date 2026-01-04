import { w as head, y as attr_class, x as attr } from "../../../chunks/index.js";
import "openpgp";
import { e as escape_html } from "../../../chunks/context.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let plaintext = "";
    let publicKey = "";
    let encrypted = "";
    const isValid = plaintext.trim().length > 0 && publicKey.trim().length > 0;
    head("1rvbs6m", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Encrypt Message - PGP Converter</title>`);
      });
      $$renderer3.push(`<meta name="description" content="Encrypt your messages securely using PGP encryption. Paste your message and public key to generate an encrypted message. All processing happens in your browser."/> <meta property="og:title" content="Encrypt Message - PGP Converter"/> <meta property="og:description" content="Encrypt your messages securely using PGP encryption. All processing happens in your browser - no data is sent to any server."/> <meta property="og:type" content="website"/> <meta property="og:url" content="https://pgp-converter.com/encrypt"/> <link rel="canonical" href="https://pgp-converter.com/encrypt"/>`);
    });
    $$renderer2.push(`<div class="app svelte-1rvbs6m"><nav class="nav svelte-1rvbs6m"><div class="nav-group svelte-1rvbs6m"><a href="/" class="nav-link svelte-1rvbs6m"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> <span class="nav-label svelte-1rvbs6m">Home</span></a> <a href="/decrypt" class="nav-link svelte-1rvbs6m"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg> <span class="nav-label svelte-1rvbs6m">Decrypt</span></a> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="nav-link shortcut-toggle svelte-1rvbs6m" aria-label="Show keyboard shortcuts"><kbd class="svelte-1rvbs6m">?</kbd></button>`);
    }
    $$renderer2.push(`<!--]--></div></nav> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <main class="main svelte-1rvbs6m"><header class="header svelte-1rvbs6m"><div class="icon svelte-1rvbs6m"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div> <div class="header-text svelte-1rvbs6m"><h1 class="svelte-1rvbs6m">PGP Converter</h1> <span class="page-title svelte-1rvbs6m">Encrypt</span></div></header> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="fields svelte-1rvbs6m"><div class="field svelte-1rvbs6m"><label for="plaintext" class="svelte-1rvbs6m">Message</label> <textarea id="plaintext" placeholder="Enter message..." rows="4" class="svelte-1rvbs6m">`);
    const $$body = escape_html(plaintext);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea></div> <div class="field svelte-1rvbs6m"><label for="publicKey" class="svelte-1rvbs6m">Public Key</label> <textarea id="publicKey" placeholder="Paste public key..." rows="4" class="mono svelte-1rvbs6m">`);
    const $$body_1 = escape_html(publicKey);
    if ($$body_1) {
      $$renderer2.push(`${$$body_1}`);
    }
    $$renderer2.push(`</textarea></div></div> <div${attr_class("output svelte-1rvbs6m", void 0, { "has-content": encrypted })}><div class="output-header svelte-1rvbs6m"><span>Output</span> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="output-body svelte-1rvbs6m">`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<span class="placeholder svelte-1rvbs6m">Encrypted message appears here</span>`);
    }
    $$renderer2.push(`<!--]--></div></div> <footer class="footer svelte-1rvbs6m"><a href="https://github.com/polyym/pgp-converter" target="_blank" rel="noopener noreferrer" class="footer-link svelte-1rvbs6m"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg> View source code on GitHub</a></footer></main> <div class="bottom-actions svelte-1rvbs6m"><div class="bottom-actions-inner svelte-1rvbs6m">`);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <button class="btn primary svelte-1rvbs6m"${attr("disabled", !isValid, true)}>`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`);
    }
    $$renderer2.push(`<!--]--> Encrypt `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<kbd class="svelte-1rvbs6m">⌘↵</kbd>`);
    }
    $$renderer2.push(`<!--]--></button></div></div></div>`);
  });
}
export {
  _page as default
};
