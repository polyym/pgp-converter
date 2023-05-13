import { c as create_ssr_component } from "../../chunks/index2.js";
const app = "";
const _layout_svelte_svelte_type_style_lang = "";
const css = {
  code: "a.svelte-1gkwchd:hover{text-decoration:underline}",
  map: null
};
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css);
  return `<header class="text-center mt-4"><h1 style="color: white; margin-bottom: 1rem; font-size: 3rem;">PGP Converter</h1></header>

${slots.default ? slots.default({}) : ``}

<footer style="background: #4a5568; color: white; padding: 1rem; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid white; position: fixed; bottom: 0; width: 100%; height: 4rem;"><div><p style="margin: 0;">PGP Converter - Version 1.0.0</p></div>
<div style="text-align: center; flex-grow: 1;"><div style="display: inline-block;"><a href="https://github.com/polyym/pgp-converter" style="color: white; text-decoration: none;" class="svelte-1gkwchd">The Source Code |</a>
    <a href="https://openpgpjs.org/" style="color: white; text-decoration: none;" class="svelte-1gkwchd">OpenPGP.js -</a>
    <a href="https://nodejs.org/en" style="color: white; text-decoration: none;" class="svelte-1gkwchd">Node.js -</a>
    <a href="https://kit.svelte.dev/" style="color: white; text-decoration: none;" class="svelte-1gkwchd">SvelteKit -</a>
    <a href="https://vitejs.dev/" style="color: white; text-decoration: none;" class="svelte-1gkwchd">Vite -</a>
    <a href="https://tailwindcss.com/" style="color: white; text-decoration: none;" class="svelte-1gkwchd">Tailwind CSS</a></div></div>
<div><p style="margin: 0;">Created by polyym</p></div>
</footer>`;
});
export {
  Layout as default
};
