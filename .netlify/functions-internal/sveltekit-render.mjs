import { init } from '../serverless.js';

export const handler = init((() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["body.css","pgp_key_icon.png"]),
	mimeTypes: {".css":"text/css",".png":"image/png"},
	_: {
		client: {start:"_app/immutable/entry/start.DPPrgqIe.js",app:"_app/immutable/entry/app.CkYk64n9.js",imports:["_app/immutable/entry/start.DPPrgqIe.js","_app/immutable/chunks/CTkuBqxy.js","_app/immutable/chunks/Dgkyq2u0.js","_app/immutable/chunks/C5LGAya5.js","_app/immutable/entry/app.CkYk64n9.js","_app/immutable/chunks/Dgkyq2u0.js","_app/immutable/chunks/Cya0sRKJ.js","_app/immutable/chunks/PxSM4oSO.js","_app/immutable/chunks/C5LGAya5.js","_app/immutable/chunks/BdUbF-zo.js","_app/immutable/chunks/oaJCPF_d.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('../server/nodes/0.js')),
			__memo(() => import('../server/nodes/1.js')),
			__memo(() => import('../server/nodes/2.js')),
			__memo(() => import('../server/nodes/3.js')),
			__memo(() => import('../server/nodes/4.js'))
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
