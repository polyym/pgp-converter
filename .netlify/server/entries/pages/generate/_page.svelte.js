import { y as head, F as attr, G as attr_class } from "../../../chunks/index.js";
import "openpgp";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let name = "";
    let email = "";
    let passphrase = "";
    let confirmPassphrase = "";
    let keyType = "ecc";
    let curve = "curve25519";
    const isValid = name.trim().length > 0 && email.trim().length > 0 && passphrase.length >= 8 && passphrase === confirmPassphrase;
    head("1a93izo", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Generate Key Pair - PGP Converter</title>`);
      });
      $$renderer3.push(`<meta name="description" content="Generate a new PGP key pair for secure communication. Create public and private keys with customisable settings. All processing happens in your browser."/> <meta property="og:title" content="Generate Key Pair - PGP Converter"/> <meta property="og:description" content="Generate a new PGP key pair for secure communication. All processing happens in your browser - no data is sent to any server."/> <meta property="og:type" content="website"/> <meta property="og:url" content="https://pgp-converter.com/generate"/> <link rel="canonical" href="https://pgp-converter.com/generate"/>`);
    });
    $$renderer2.push(`<div class="app svelte-1a93izo"><nav class="nav svelte-1a93izo"><div class="nav-group svelte-1a93izo"><a href="/" class="nav-link svelte-1a93izo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> <span class="nav-label svelte-1a93izo">Home</span></a> <a href="/encrypt" class="nav-link svelte-1a93izo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> <span class="nav-label svelte-1a93izo">Encrypt</span></a> <a href="/decrypt" class="nav-link svelte-1a93izo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg> <span class="nav-label svelte-1a93izo">Decrypt</span></a> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="nav-link shortcut-toggle svelte-1a93izo" aria-label="Show keyboard shortcuts"><kbd class="svelte-1a93izo">?</kbd></button>`);
    }
    $$renderer2.push(`<!--]--></div></nav> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <main class="main svelte-1a93izo"><header class="header svelte-1a93izo"><div class="icon generate svelte-1a93izo"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg></div> <div class="header-text svelte-1a93izo"><h1 class="svelte-1a93izo">PGP Converter</h1> <span class="page-title svelte-1a93izo">Generate Keys</span></div></header> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="fields svelte-1a93izo"><div class="field-row svelte-1a93izo"><div class="field svelte-1a93izo"><label for="name" class="svelte-1a93izo">Name</label> <input type="text" id="name"${attr("value", name)} placeholder="Your name..." class="svelte-1a93izo"/></div> <div class="field svelte-1a93izo"><label for="email" class="svelte-1a93izo">Email</label> <input type="email" id="email"${attr("value", email)} placeholder="your@email.com" class="svelte-1a93izo"/></div></div> <div class="field-row svelte-1a93izo"><div class="field svelte-1a93izo"><label for="passphrase" class="svelte-1a93izo">Passphrase</label> <input type="password" id="passphrase"${attr("value", passphrase)} placeholder="Min 8 characters..." class="svelte-1a93izo"/> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="field svelte-1a93izo"><label for="confirmPassphrase" class="svelte-1a93izo">Confirm Passphrase</label> <input type="password" id="confirmPassphrase"${attr("value", confirmPassphrase)} placeholder="Confirm passphrase..."${attr_class("svelte-1a93izo", void 0, { "error": false })}/> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div> <div class="field-row svelte-1a93izo"><div class="field svelte-1a93izo"><label for="keyType" class="svelte-1a93izo">Key Type</label> `);
    $$renderer2.select(
      { id: "keyType", value: keyType, class: "" },
      ($$renderer3) => {
        $$renderer3.option({ value: "ecc" }, ($$renderer4) => {
          $$renderer4.push(`ECC (Recommended)`);
        });
        $$renderer3.option({ value: "rsa" }, ($$renderer4) => {
          $$renderer4.push(`RSA`);
        });
      },
      "svelte-1a93izo"
    );
    $$renderer2.push(`</div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="field svelte-1a93izo"><label for="curve" class="svelte-1a93izo">Curve</label> `);
      $$renderer2.select(
        { id: "curve", value: curve, class: "" },
        ($$renderer3) => {
          $$renderer3.option({ value: "curve25519" }, ($$renderer4) => {
            $$renderer4.push(`Curve25519 (Recommended)`);
          });
          $$renderer3.option({ value: "nistP256" }, ($$renderer4) => {
            $$renderer4.push(`NIST P-256`);
          });
          $$renderer3.option({ value: "nistP384" }, ($$renderer4) => {
            $$renderer4.push(`NIST P-384`);
          });
          $$renderer3.option({ value: "nistP521" }, ($$renderer4) => {
            $$renderer4.push(`NIST P-521`);
          });
        },
        "svelte-1a93izo"
      );
      $$renderer2.push(`</div>`);
    }
    $$renderer2.push(`<!--]--></div></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="warning-box svelte-1a93izo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-1a93izo"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> <p class="svelte-1a93izo"><strong class="svelte-1a93izo">Important:</strong> Keep your private key and passphrase safe. Never share your private key with anyone. If you lose your passphrase, you will not be able to decrypt messages.</p></div> <footer class="footer svelte-1a93izo"><a href="https://github.com/polyym/pgp-converter" target="_blank" rel="noopener noreferrer" class="footer-link svelte-1a93izo"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg> View source code on GitHub</a> <span class="footer-divider svelte-1a93izo">·</span> <a href="/help" class="footer-link svelte-1a93izo">Help</a></footer></main> <div class="bottom-actions svelte-1a93izo"><div class="bottom-actions-inner svelte-1a93izo">`);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <button class="btn primary svelte-1a93izo"${attr("disabled", !isValid, true)}>`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>`);
    }
    $$renderer2.push(`<!--]--> Generate `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<kbd class="svelte-1a93izo">⌘↵</kbd>`);
    }
    $$renderer2.push(`<!--]--></button></div></div></div>`);
  });
}
export {
  _page as default
};
