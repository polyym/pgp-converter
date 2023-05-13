import { c as create_ssr_component } from "../../chunks/index2.js";
const _page_svelte_svelte_type_style_lang = "";
const css = {
  code: "a.svelte-193vx4v.svelte-193vx4v:hover{text-decoration:underline}main.svelte-193vx4v.svelte-193vx4v{padding-bottom:6rem}@media(max-width: 768px){main.svelte-193vx4v.svelte-193vx4v{padding-bottom:4rem}}.grid.svelte-193vx4v.svelte-193vx4v{grid-template-columns:1fr minmax(auto, 640px) 1fr;gap:2rem}@media(max-width: 768px){.grid.svelte-193vx4v.svelte-193vx4v{grid-template-columns:1fr}}.grid.svelte-193vx4v>.svelte-193vx4v{max-width:100%}",
  map: null
};
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css);
  return `<main class="grid grid-cols-3 gap-4 items-center justify-center min-h-[calc(100vh-60px)] py-2 px-4 svelte-193vx4v"><section class="max-w-[300px] text-center svelte-193vx4v"><a href="/encrypt" class="inline-block mt-5 py-3 px-6 text-white bg-blue-500 rounded-lg no-underline transition-colors duration-300 ease-out hover:bg-blue-700 text-lg svelte-193vx4v">Encrypt Text</a></section>

  <div class="text-center svelte-193vx4v"><p>PGP Converter is a tool that enables you to encrypt and decrypt text using the PGP (Pretty Good Privacy) protocol. It is built with Node.js, SvelteKit, Vite and tailwindcss. The encryption and decryption process utilizes the OpenPGP.js library.</p></div>

  <section class="max-w-[300px] text-center svelte-193vx4v"><a href="/decrypt" class="inline-block mt-5 py-3 px-6 text-white bg-blue-500 rounded-lg no-underline transition-colors duration-300 ease-out hover:bg-blue-700 text-lg svelte-193vx4v">Decrypt Text</a></section>
</main>`;
});
export {
  Page as default
};
