// Prerender the whole app as static HTML. The tool is fully client-side, so
// every route can be served as a static file, giving better TTFB / LCP, no cold
// starts, and HTML remains crawlable even when JS is slow.
export const prerender = true;
