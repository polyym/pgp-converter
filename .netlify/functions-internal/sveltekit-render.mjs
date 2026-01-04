import { init } from '../serverless.js';

export const handler = init((() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["body.css","old_pgp_key_icon.png","pgp_key_icon.png"]),
	mimeTypes: {".css":"text/css",".png":"image/png"},
	_: {
		client: {start:"_app/immutable/entry/start.rhQbs0-U.js",app:"_app/immutable/entry/app.7n-3OU8U.js",imports:["_app/immutable/entry/start.rhQbs0-U.js","_app/immutable/chunks/C8tF7hj1.js","_app/immutable/chunks/Cis852S_.js","_app/immutable/chunks/C_agyyW5.js","_app/immutable/entry/app.7n-3OU8U.js","_app/immutable/chunks/Cis852S_.js","_app/immutable/chunks/yo_XsYKl.js","_app/immutable/chunks/CQePt9EA.js","_app/immutable/chunks/C_agyyW5.js","_app/immutable/chunks/CR1Swj-b.js","_app/immutable/chunks/CNdnUJee.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('../server/nodes/0.js')),
			__memo(() => import('../server/nodes/1.js')),
			__memo(() => import('../server/nodes/2.js')),
			__memo(() => import('../server/nodes/3.js')),
			__memo(() => import('../server/nodes/4.js')),
			__memo(() => import('../server/nodes/5.js')),
			__memo(() => import('../server/nodes/6.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/decrypt",
				pattern: /^\/decrypt\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/encrypt",
				pattern: /^\/encrypt\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/generate",
				pattern: /^\/generate\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/help",
				pattern: /^\/help\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})());
