import { b as attr } from "../../../chunks/attributes.js";
import { e as escape_html } from "../../../chunks/escaping.js";
import "openpgp";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let encrypted = "";
    let privateKey = "";
    let passphrase = "";
    let decrypted = "";
    let isLoading = false;
    $$renderer2.push(`<main class="flex flex-col items-center font-sans bg-gray-900 text-gray-300 max-w-lg mx-auto p-4 min-h-screen svelte-10tdzze"><h2 class="text-2xl text-white svelte-10tdzze">Decrypt a message</h2> <div class="w-full my-4"><label for="encrypted" class="block text-lg mb-2 svelte-10tdzze">Encrypted Message:</label> <textarea id="encrypted" placeholder="Enter the encrypted message here..." class="w-full h-24 p-2 bg-gray-700 text-white border border-gray-600 rounded svelte-10tdzze">`);
    const $$body = escape_html(encrypted);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea></div> <div class="w-full my-4"><label for="privateKey" class="block text-lg mb-2 svelte-10tdzze">Private Key:</label> <textarea id="privateKey" placeholder="Enter your private key here..." class="w-full h-24 p-2 bg-gray-700 text-white border border-gray-600 rounded svelte-10tdzze">`);
    const $$body_1 = escape_html(privateKey);
    if ($$body_1) {
      $$renderer2.push(`${$$body_1}`);
    }
    $$renderer2.push(`</textarea></div> <div class="w-full my-4"><label for="passphrase" class="block text-lg mb-2 svelte-10tdzze">Passphrase:</label> <input type="password" id="passphrase"${attr("value", passphrase)} placeholder="Enter your passphrase here..." class="w-full p-2 bg-gray-700 text-white border border-gray-600 rounded svelte-10tdzze"/></div> <button class="my-4 px-4 py-2 text-lg text-white bg-blue-500 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-blue-700"${attr("disabled", isLoading, true)}>`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`Decrypt`);
    }
    $$renderer2.push(`<!--]--></button> <h2 class="text-2xl text-white svelte-10tdzze">Decrypted Message:</h2> <textarea class="message w-full h-24 p-2 my-4 bg-gray-700 text-green-400 border border-gray-600 rounded svelte-10tdzze" readonly>`);
    const $$body_2 = escape_html(decrypted);
    if ($$body_2) {
      $$renderer2.push(`${$$body_2}`);
    }
    $$renderer2.push(`</textarea> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="flex mt-4"><a href="/" class="px-4 py-2 text-lg text-white bg-gray-600 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-gray-500 mr-2">Go to Home Page</a> <a href="/encrypt" class="px-4 py-2 text-lg text-white bg-gray-600 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-gray-500">Go to Encrypt Page</a></div></main>`);
  });
}
export {
  _page as default
};
