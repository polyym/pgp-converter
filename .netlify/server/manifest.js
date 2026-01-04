export const manifest = (() => {
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
		client: {start:"_app/immutable/entry/start.GfyTln3-.js",app:"_app/immutable/entry/app.BIy8neQW.js",imports:["_app/immutable/entry/start.GfyTln3-.js","_app/immutable/chunks/DiZCsdUp.js","_app/immutable/chunks/BSxgazJ1.js","_app/immutable/chunks/CA4SMY3K.js","_app/immutable/entry/app.BIy8neQW.js","_app/immutable/chunks/BSxgazJ1.js","_app/immutable/chunks/CzEOOxpE.js","_app/immutable/chunks/DfERk5ox.js","_app/immutable/chunks/CA4SMY3K.js","_app/immutable/chunks/8nD881Kp.js","_app/immutable/chunks/BBRshnga.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js'))
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
})();
