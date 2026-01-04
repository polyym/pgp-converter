import { x as getContext, y as head, z as escape_html } from "../../chunks/index.js";
import "clsx";
import { n as noop } from "../../chunks/equality.js";
import "@sveltejs/kit/internal/server";
import "@sveltejs/kit/internal";
import { w as writable } from "../../chunks/exports.js";
import "../../chunks/utils.js";
function create_updated_store() {
  const { set, subscribe } = writable(false);
  {
    return {
      subscribe,
      // eslint-disable-next-line @typescript-eslint/require-await
      check: async () => false
    };
  }
}
const is_legacy = noop.toString().includes("$$") || /function \w+\(\) \{\}/.test(noop.toString());
if (is_legacy) {
  ({
    data: {},
    form: null,
    error: null,
    params: {},
    route: { id: null },
    state: {},
    status: -1,
    url: new URL("https://example.com")
  });
}
const stores = {
  updated: /* @__PURE__ */ create_updated_store()
};
({
  check: stores.updated.check
});
function context() {
  return getContext("__request__");
}
const page$1 = {
  get error() {
    return context().page.error;
  },
  get status() {
    return context().page.status;
  }
};
const page = page$1;
function _error($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    head("1j96wlh", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Error - PGP Converter</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen bg-gray-900 flex items-center justify-center px-4"><div class="max-w-md w-full text-center"><div class="mb-8"><span class="text-6xl font-bold text-red-500">${escape_html(page.status)}</span></div> <h1 class="text-2xl font-bold text-white mb-4">`);
    if (page.status === 404) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`Page Not Found`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`Something went wrong`);
    }
    $$renderer2.push(`<!--]--></h1> <p class="text-gray-400 mb-8">`);
    if (page.error?.message) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`${escape_html(page.error.message)}`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (page.status === 404) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`The page you're looking for doesn't exist.`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`An unexpected error occurred.`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></p> <a href="/" class="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">Go Home</a></div></div>`);
  });
}
export {
  _error as default
};
