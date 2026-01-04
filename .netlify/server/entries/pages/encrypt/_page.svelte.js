import { b as attr } from "../../../chunks/attributes.js";
import { e as escape_html } from "../../../chunks/escaping.js";
import "openpgp";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let plaintext = "";
    let publicKey = "";
    let encrypted = "";
    let isLoading = false;
    $$renderer2.push(`<main class="flex flex-col items-center font-sans bg-gray-900 text-gray-300 max-w-lg mx-auto p-4 min-h-screen svelte-1rvbs6m"><h2 class="text-2xl text-white svelte-1rvbs6m">Encrypt a message</h2> <div class="w-full my-4"><label for="plaintext" class="block text-lg mb-2 svelte-1rvbs6m">Plaintext:</label> <textarea id="plaintext" placeholder="Enter your plaintext here..." class="w-full h-24 p-2 bg-gray-700 text-white border border-gray-600 rounded svelte-1rvbs6m">`);
    const $$body = escape_html(plaintext);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea></div> <div class="w-full my-4"><label for="publicKey" class="block text-lg mb-2 svelte-1rvbs6m">Public Key:</label> <textarea id="publicKey" placeholder="Enter your public key here..." class="w-full h-24 p-2 bg-gray-700 text-white border border-gray-600 rounded svelte-1rvbs6m">`);
    const $$body_1 = escape_html(publicKey);
    if ($$body_1) {
      $$renderer2.push(`${$$body_1}`);
    }
    $$renderer2.push(`</textarea></div> <button class="my-4 px-4 py-2 text-lg text-white bg-blue-500 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-blue-700"${attr("disabled", isLoading, true)}>`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`Encrypt`);
    }
    $$renderer2.push(`<!--]--></button> <h2 class="text-2xl text-white svelte-1rvbs6m">Encrypted Message:</h2> <textarea class="message w-full h-24 p-2 my-4 bg-gray-700 text-green-400 border border-gray-600 rounded svelte-1rvbs6m" readonly>`);
    const $$body_2 = escape_html(encrypted);
    if ($$body_2) {
      $$renderer2.push(`${$$body_2}`);
    }
    $$renderer2.push(`</textarea> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="flex mt-4"><a href="/" class="px-4 py-2 text-lg text-white bg-gray-600 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-gray-500 mr-2">Go to Home Page</a> <a href="/decrypt" class="px-4 py-2 text-lg text-white bg-gray-600 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-gray-500">Go to Decrypt Page</a></div></main>`);
  });
}
export {
  _page as default
};
