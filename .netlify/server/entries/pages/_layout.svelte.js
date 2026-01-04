import "clsx";
function _layout($$renderer, $$props) {
  let { children } = $$props;
  $$renderer.push(`<header class="text-center mt-4"><h1 style="color: white; margin-bottom: 1rem; font-size: 3rem;">PGP Converter</h1></header> `);
  children($$renderer);
  $$renderer.push(`<!----> <footer style="background: #4a5568; color: white; padding: 1rem; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid white; position: fixed; bottom: 0; width: 100%; height: 4rem;"><div><p style="margin: 0;">PGP Converter - Version 1.0.0</p></div> <div style="text-align: center; flex-grow: 1;"><div style="display: inline-block;"><a href="https://github.com/polyym/pgp-converter" style="color: white; text-decoration: none;" class="svelte-12qhfyh">The Source Code |</a> <a href="https://openpgpjs.org/" style="color: white; text-decoration: none;" class="svelte-12qhfyh">OpenPGP.js -</a> <a href="https://nodejs.org/en" style="color: white; text-decoration: none;" class="svelte-12qhfyh">Node.js -</a> <a href="https://kit.svelte.dev/" style="color: white; text-decoration: none;" class="svelte-12qhfyh">SvelteKit -</a> <a href="https://vitejs.dev/" style="color: white; text-decoration: none;" class="svelte-12qhfyh">Vite -</a> <a href="https://tailwindcss.com/" style="color: white; text-decoration: none;" class="svelte-12qhfyh">Tailwind CSS</a></div></div> <div><p style="margin: 0;">Created by polyym</p></div></footer>`);
}
export {
  _layout as default
};
