// The lint rules. The presets are strict; every rule switched off below says why.
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Files at the root that tsconfig.json does not include
const outsideTsconfig = ['eslint.config.js', 'postcss.config.js'];

export default defineConfig(
	js.configs.recommended,
	tseslint.configs.strictTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	svelte.configs.recommended,
	unicorn.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: { allowDefaultProject: outsideTsconfig },
				extraFileExtensions: ['.svelte']
			},
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/require-await': 'error',
			'@typescript-eslint/consistent-type-imports': 'error',
			// TypeScript reports undefined names itself, and knows the build's constants
			'no-undef': 'off',
			// The catch binding is `e` throughout
			'unicorn/catch-error-name': ['error', { name: 'e' }],
			// Too noisy on standard short names (props, args, refs)
			'unicorn/name-replacements': 'off',
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
			// Documentation is written as JSDoc blocks, one-line ones included
			'unicorn/single-line-block-comment-style': 'off',
			'unicorn/no-asterisk-prefix-in-documentation-comments': 'off',
			// Individual symbols are imported by name
			'unicorn/import-style': 'off',
			// The DOM and OpenPGP.js both speak in null
			'unicorn/no-null': 'off',
			// An element known by its id is looked up by its id
			'unicorn/prefer-query-selector': 'off',
			// Code that only runs in a browser says `window`
			'unicorn/prefer-global-this': 'off',
			// Guard clauses are written one to a line, each with its own reason
			'unicorn/prefer-ternary': 'off',
			'unicorn/prefer-combined-guards': 'off',
			'unicorn/prefer-simple-condition-first': 'off',
			// A fallback for one call that may fail is written with .catch()
			'unicorn/prefer-await': 'off',
			// Encodings are named as the WHATWG standard spells them
			'unicorn/text-encoding-identifier-case': ['error', { withDash: true }],
			// Also fires on functions that report success and on SvelteKit's own `prerender`
			'unicorn/consistent-boolean-name': 'off',
			// State kept in a module and changed through its functions is how the
			// modules in src/lib/stores work
			'unicorn/no-top-level-assignment-in-function': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: {
				projectService: { allowDefaultProject: outsideTsconfig },
				extraFileExtensions: ['.svelte'],
				parser: tseslint.parser
			}
		},
		rules: {
			// Links are plain hrefs; resolve() adds nothing on a site with no base path
			'svelte/no-navigation-without-resolve': 'off',
			// A component's functions close over its state; there is no outer scope to move them to
			'unicorn/consistent-function-scoping': 'off'
		}
	},
	{
		// Component files are named in PascalCase; SEO keeps its capitals
		files: ['src/lib/components/**/*.svelte'],
		rules: {
			'unicorn/filename-case': [
				'error',
				{ case: 'pascalCase', checkDirectories: false, ignore: ['^SEO[.]svelte$'] }
			]
		}
	},
	{
		// SvelteKit names route files itself
		files: ['src/routes/**'],
		rules: { 'unicorn/filename-case': 'off' }
	},
	{
		// Each of these places a fixed string from this app's own source: the icon
		// drawings, the coin logos, and the data for search engines
		files: [
			'src/lib/components/Icon.svelte',
			'src/routes/+page.svelte',
			'src/routes/donate/+page.svelte'
		],
		rules: { 'svelte/no-at-html-tags': 'off' }
	},
	{
		// Two old browser calls are used on purpose: one keeps Undo working after
		// Paste, the other is how some browsers report a key pressed mid-composition
		files: ['src/lib/text-entry.ts', 'src/lib/stores/tool-page.svelte.ts'],
		rules: {
			'@typescript-eslint/no-deprecated': 'off',
			'unicorn/prefer-keyboard-event-key': 'off'
		}
	},
	{
		// The build scripts are command-line programs
		files: ['scripts/**'],
		rules: { 'unicorn/no-process-exit': 'off' }
	},
	{
		files: ['**/*.test.ts'],
		rules: {
			// Tests routinely use throwaway promises
			'@typescript-eslint/no-floating-promises': 'off',
			// An expectation reads best with the awaited call inside it
			'unicorn/no-await-expression-member': 'off'
		}
	},
	prettierConfig,
	{
		// Braces on every branch and loop. Set after the Prettier preset, which
		// switches the rule off; in this form it does not clash with Prettier.
		rules: { curly: ['error', 'all'] }
	},
	{ ignores: ['build/', '.svelte-kit/', 'node_modules/', '.netlify/', 'static/'] }
);
