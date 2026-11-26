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
			// TypeScript reports undefined names, and no-undef does not know the globals
			// declared in src/app.d.ts
			'no-undef': 'off',
			// The catch binding is `e` throughout
			'unicorn/catch-error-name': ['error', { name: 'e' }],
			// Flags short names the code uses widely (e, res, msg, args, dir), even the catch
			// binding `e` that catch-error-name requires
			'unicorn/name-replacements': 'off',
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
			// Documentation is written as JSDoc blocks, one-line ones included
			'unicorn/single-line-block-comment-style': 'off',
			'unicorn/no-asterisk-prefix-in-documentation-comments': 'off',
			// Node built-ins are imported by name (import { join } from 'node:path')
			'unicorn/import-style': 'off',
			// The DOM and OpenPGP.js use null, so the code does too
			'unicorn/no-null': 'off',
			// Elements with an id are found with getElementById
			'unicorn/prefer-query-selector': 'off',
			// Browser-only code refers to `window`, not globalThis
			'unicorn/prefer-global-this': 'off',
			// Guard clauses stay separate if statements, so each can have its own comment
			'unicorn/prefer-ternary': 'off',
			'unicorn/prefer-combined-guards': 'off',
			// Conditions are ordered for the reader, not by how cheap they are to evaluate
			'unicorn/prefer-simple-condition-first': 'off',
			// A fallback for one call that may fail is written with .catch()
			'unicorn/prefer-await': 'off',
			// 'utf-8', as the WHATWG Encoding Standard spells it
			'unicorn/text-encoding-identifier-case': ['error', { withDash: true }],
			// Also fires on functions that report success and on SvelteKit's own `prerender`
			'unicorn/consistent-boolean-name': 'off',
			// Components and modules here keep state at the top level and change it in their functions
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
			// Asks to move nested functions that use nothing from the function around them, such as
			// an onMount cleanup or a listener in watchForUpdates, away from the code they belong with
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
		// {@html} here renders only constants from the source: the SVG icons, the
		// coin logos and the JSON-LD structured data
		files: [
			'src/lib/components/Icon.svelte',
			'src/routes/+page.svelte',
			'src/routes/donate/+page.svelte'
		],
		rules: { 'svelte/no-at-html-tags': 'off' }
	},
	{
		// document.execCommand('insertText') is the only way to insert text that Undo
		// can remove, and some browsers report IME composition only as keyCode 229
		files: ['src/lib/text-entry.ts', 'src/lib/stores/tool-page.svelte.ts'],
		rules: {
			'@typescript-eslint/no-deprecated': 'off',
			'unicorn/prefer-keyboard-event-key': 'off'
		}
	},
	{
		// The build scripts are CLIs that end with an exit code
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
