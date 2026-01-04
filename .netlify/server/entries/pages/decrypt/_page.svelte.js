import { w as head, x as attr, y as attr_class } from "../../../chunks/index.js";
import "openpgp";
import { e as escape_html } from "../../../chunks/context.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let encrypted = "";
    let privateKey = "";
    let passphrase = "";
    let decrypted = "";
    const isValid = encrypted.trim().length > 0 && privateKey.trim().length > 0;
    head("10tdzze", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Decrypt Message - PGP Converter</title>`);
      });
      $$renderer3.push(`<meta name="description" content="Decrypt PGP-encrypted messages securely. Paste your encrypted message, private key, and passphrase to reveal the original content. All processing happens in your browser."/> <meta property="og:title" content="Decrypt Message - PGP Converter"/> <meta property="og:description" content="Decrypt PGP-encrypted messages securely. All processing happens in your browser - no data is sent to any server."/> <meta property="og:type" content="website"/> <meta property="og:url" content="https://pgp-converter.com/decrypt"/> <link rel="canonical" href="https://pgp-converter.com/decrypt"/>`);
    });
    $$renderer2.push(`<div class="app svelte-10tdzze"><nav class="nav svelte-10tdzze"><div class="nav-group svelte-10tdzze"><a href="/" class="nav-link svelte-10tdzze"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> <span class="nav-label svelte-10tdzze">Home</span></a> <a href="/encrypt" class="nav-link svelte-10tdzze"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> <span class="nav-label svelte-10tdzze">Encrypt</span></a> <a href="/generate" class="nav-link svelte-10tdzze"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg> <span class="nav-label svelte-10tdzze">Generate</span></a> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="nav-link shortcut-toggle svelte-10tdzze" aria-label="Show keyboard shortcuts"><kbd class="svelte-10tdzze">?</kbd></button>`);
    }
    $$renderer2.push(`<!--]--></div></nav> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <main class="main svelte-10tdzze"><header class="header svelte-10tdzze"><div class="icon svelte-10tdzze"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg></div> <div class="header-text svelte-10tdzze"><h1 class="svelte-10tdzze">PGP Converter</h1> <span class="page-title svelte-10tdzze">Decrypt</span></div></header> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="fields svelte-10tdzze"><div class="field svelte-10tdzze"><label for="encrypted" class="svelte-10tdzze">Encrypted Message</label> <textarea id="encrypted" placeholder="Paste encrypted message..." rows="4" class="mono svelte-10tdzze">`);
    const $$body = escape_html(encrypted);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea></div> <div class="field svelte-10tdzze"><label for="privateKey" class="svelte-10tdzze">Private Key</label> <textarea id="privateKey" placeholder="Paste private key..." rows="4" class="mono svelte-10tdzze">`);
    const $$body_1 = escape_html(privateKey);
    if ($$body_1) {
      $$renderer2.push(`${$$body_1}`);
    }
    $$renderer2.push(`</textarea></div> <div class="field svelte-10tdzze"><label for="passphrase" class="svelte-10tdzze">Passphrase</label> <input type="password" id="passphrase"${attr("value", passphrase)} placeholder="Enter passphrase..." class="svelte-10tdzze"/></div></div> <div${attr_class("output svelte-10tdzze", void 0, { "has-content": decrypted })}><div class="output-header svelte-10tdzze"><span>Output</span> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="output-body svelte-10tdzze">`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<span class="placeholder svelte-10tdzze">Decrypted message appears here</span>`);
    }
    $$renderer2.push(`<!--]--></div></div> <footer class="footer svelte-10tdzze"><a href="https://github.com/polyym/pgp-converter" target="_blank" rel="noopener noreferrer" class="footer-link svelte-10tdzze"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg> GitHub</a> <span class="divider svelte-10tdzze">·</span> <a href="/help" class="footer-link svelte-10tdzze">Help</a></footer></main> <div class="bottom-actions svelte-10tdzze"><div class="bottom-actions-inner svelte-10tdzze">`);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <button class="btn primary svelte-10tdzze"${attr("disabled", !isValid, true)}>`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`);
    }
    $$renderer2.push(`<!--]--> Decrypt `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<kbd class="svelte-10tdzze">⌘↵</kbd>`);
    }
    $$renderer2.push(`<!--]--></button></div></div></div>`);
  });
}
export {
  _page as default
};
