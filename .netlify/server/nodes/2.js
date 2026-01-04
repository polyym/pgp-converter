

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.C6RBVh--.js","_app/immutable/chunks/PxSM4oSO.js","_app/immutable/chunks/Dgkyq2u0.js","_app/immutable/chunks/Y4QgarlP.js"];
export const stylesheets = ["_app/immutable/assets/2.BDQr3KPA.css"];
export const fonts = [];
