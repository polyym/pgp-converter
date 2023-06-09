import { init } from '../serverless.js';

export const handler = init({
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["body.css","pgp_key_icon.png"]),
	mimeTypes: {".css":"text/css",".png":"image/png"},
	_: {
		client: {"start":"_app/immutable/entry/start.86df5d92.js","app":"_app/immutable/entry/app.a7c100e9.js","imports":["_app/immutable/entry/start.86df5d92.js","_app/immutable/chunks/index.a58d2f33.js","_app/immutable/chunks/singletons.6ffd9d79.js","_app/immutable/entry/app.a7c100e9.js","_app/immutable/chunks/index.a58d2f33.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			() => import('../server/nodes/0.js'),
			() => import('../server/nodes/1.js'),
			() => import('../server/nodes/2.js'),
			() => import('../server/nodes/3.js'),
			() => import('../server/nodes/4.js')
		],
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
		matchers: async () => {
			
			return {  };
		}
	}
});
