import { c as create_ssr_component, d as add_attribute } from "../../../chunks/index2.js";
import "openpgp";
const _page_svelte_svelte_type_style_lang = "";
const css = {
  code: 'main.svelte-1u9viua{display:flex;flex-direction:column;align-items:center;font-family:Arial, sans-serif;background-color:#1e1e1e;color:#ddd;max-width:800px;margin:0 auto;padding:20px;box-sizing:border-box;min-height:100vh}h2.svelte-1u9viua{color:#fff}label.svelte-1u9viua{display:block;font-size:18px;margin-bottom:10px}textarea.svelte-1u9viua,input[type="password"].svelte-1u9viua{width:100%;padding:10px;box-sizing:border-box;font-size:18px;background-color:#444;color:#fff;border:1px solid #666;border-radius:4px;transition:border-color 0.3s ease}textarea.svelte-1u9viua{min-height:100px}textarea.svelte-1u9viua:focus,input[type="password"].svelte-1u9viua:focus{border-color:#007BFF}#passphrase.svelte-1u9viua{width:100%;padding:10px;box-sizing:border-box;font-size:16px;background-color:#333;color:#fff;border:1px solid #444}.message.svelte-1u9viua{color:#28A745}',
  map: null
};
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let passphrase = "";
  $$result.css.add(css);
  return `<main class="flex flex-col items-center font-sans bg-gray-900 text-gray-300 max-w-lg mx-auto p-4 min-h-screen svelte-1u9viua"><h2 class="text-2xl text-white svelte-1u9viua">Decrypt a message</h2>
  <div class="w-full my-4"><label for="encrypted" class="block text-lg mb-2 svelte-1u9viua">Encrypted Message:</label>
      <textarea id="encrypted" placeholder="Enter the encrypted message here..." class="w-full h-24 p-2 bg-gray-700 text-white border border-gray-600 rounded svelte-1u9viua">${""}</textarea></div>
  <div class="w-full my-4"><label for="privateKey" class="block text-lg mb-2 svelte-1u9viua">Private Key:</label>
      <textarea id="privateKey" placeholder="Enter your private key here..." class="w-full h-24 p-2 bg-gray-700 text-white border border-gray-600 rounded svelte-1u9viua">${""}</textarea></div>
  <div class="w-full my-4"><label for="passphrase" class="block text-lg mb-2 svelte-1u9viua">Passphrase:</label>
      <input type="password" id="passphrase" placeholder="Enter your passphrase here..." class="w-full p-2 bg-gray-700 text-white border border-gray-600 rounded svelte-1u9viua"${add_attribute("value", passphrase, 0)}></div>
  <button class="my-4 px-4 py-2 text-lg text-white bg-blue-500 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-blue-700" ${""}>${`Decrypt`}</button>
  <h2 class="text-2xl text-white svelte-1u9viua">Decrypted Message:</h2>
  <textarea class="message w-full h-24 p-2 my-4 bg-gray-700 text-green-400 border border-gray-600 rounded svelte-1u9viua" readonly>${""}</textarea>
  ${``}
  <div class="flex mt-4"><a href="/" class="px-4 py-2 text-lg text-white bg-gray-600 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-gray-500 mr-2">Go to Home Page</a>
    <a href="/encrypt" class="px-4 py-2 text-lg text-white bg-gray-600 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-gray-500">Go to Encrypt Page</a></div>
</main>`;
});
export {
  Page as default
};
