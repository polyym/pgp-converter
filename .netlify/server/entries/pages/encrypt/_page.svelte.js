import { c as create_ssr_component } from "../../../chunks/index2.js";
import "openpgp";
const _page_svelte_svelte_type_style_lang = "";
const css = {
  code: "main.svelte-1of4hbl{display:flex;flex-direction:column;align-items:center;font-family:Arial, sans-serif;background-color:#1e1e1e;color:#ddd;max-width:800px;margin:0 auto;padding:20px;box-sizing:border-box;min-height:100vh}h2.svelte-1of4hbl{color:#fff}label.svelte-1of4hbl{display:block;font-size:18px;margin-bottom:10px}textarea.svelte-1of4hbl{width:100%;min-height:100px;padding:10px;box-sizing:border-box;font-size:18px;background-color:#444;color:#fff;border:1px solid #666;border-radius:4px;transition:border-color 0.3s ease}textarea.svelte-1of4hbl:focus{border-color:#007BFF}.message.svelte-1of4hbl{color:#28A745}",
  map: null
};
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css);
  return `<main class="flex flex-col items-center font-sans bg-gray-900 text-gray-300 max-w-lg mx-auto p-4 min-h-screen svelte-1of4hbl"><h2 class="text-2xl text-white svelte-1of4hbl">Encrypt a message</h2>
  <div class="w-full my-4"><label for="plaintext" class="block text-lg mb-2 svelte-1of4hbl">Plaintext:</label>
      <textarea id="plaintext" placeholder="Enter your plaintext here..." class="w-full h-24 p-2 bg-gray-700 text-white border border-gray-600 rounded svelte-1of4hbl">${""}</textarea></div>
  <div class="w-full my-4"><label for="publicKey" class="block text-lg mb-2 svelte-1of4hbl">Public Key:</label>
      <textarea id="publicKey" placeholder="Enter your public key here..." class="w-full h-24 p-2 bg-gray-700 text-white border border-gray-600 rounded svelte-1of4hbl">${""}</textarea></div>
  <button class="my-4 px-4 py-2 text-lg text-white bg-blue-500 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-blue-700" ${""}>${`Encrypt`}</button>
  <h2 class="text-2xl text-white svelte-1of4hbl">Encrypted Message:</h2>
  <textarea class="message w-full h-24 p-2 my-4 bg-gray-700 text-green-400 border border-gray-600 rounded svelte-1of4hbl" readonly>${""}</textarea>
  ${``}
  <div class="flex mt-4"><a href="/" class="px-4 py-2 text-lg text-white bg-gray-600 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-gray-500 mr-2">Go to Home Page</a>
    <a href="/decrypt" class="px-4 py-2 text-lg text-white bg-gray-600 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-gray-500">Go to Decrypt Page</a></div>
</main>`;
});
export {
  Page as default
};
