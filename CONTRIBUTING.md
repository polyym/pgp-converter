# Contributing to PGP Converter

Contributions are welcome. Please read this guide before you open a pull request.

## Contributor License Agreement (CLA)

All contributors must sign a Contributor License Agreement before any pull request can be merged. The CLA bot will automatically comment on your first pull request with instructions.

PGP Converter is licensed under the AGPL-3.0. The CLA grants the project maintainer a broad, irrevocable licence to your contributions, including the right to relicense them. This gives the maintainer the freedom to offer commercial dual-licensing or relicense the project in the future, while keeping the open-source version freely available under the AGPL.

You retain copyright ownership of your contributions, but the licence you grant is perpetual and irrevocable.

## Development workflow

1. Fork the repository and clone your fork
2. Install dependencies: `npm install`
3. Create a branch for your changes
4. Make your changes
5. Check that everything passes before you submit:
   - `npm test` (all tests pass)
   - `npm run check` (0 errors, 0 warnings)
   - `npm run lint` (no findings)
   - `npm run format:check` (run `npm run format` if it reports any file)
   - `npm run build` (production build succeeds)
6. Open a pull request against `main`

The `Tests` workflow runs the same checks on every pull request and blocks the merge if any fail.

## Code style

- Follow existing patterns in the codebase
- Write logic in TypeScript, in `src/lib`, with a test beside it. A page or component holds only what connects that logic to its markup
- Reactive state shared by pages or components goes in `src/lib/stores`, as a `.svelte.ts` module. Markup that more than one page needs goes in `src/lib/components`, or in its `tool` folder if only the tool pages use it: the homepage, About and Donate download everything outside that folder
- Follow the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html), with two differences: files are named in `kebab-case`, and functions that can fail return a result (`{ success, data?, error? }`) where the guide would throw
- Use TypeScript strict mode; avoid `any` types, type assertions and `!`
- Build scripts are TypeScript too. Node runs them as they are, so they use only syntax that can be stripped (no enums or namespaces)
- Give a file's ending when importing it (`./keys.ts`, `#lib/keys.ts`)
- Formatting is Prettier's, with the settings in `.prettierrc.json`: tabs, single quotes, lines of up to 100 characters. Put braces on every `if` and loop
- If a lint rule is wrong for a piece of code, change the code or the rule in `eslint.config.js` with the reason beside it; do not switch a rule off with a comment in the code
- In Svelte files, use runes, keyed `{#each}` blocks and the `class` attribute's array and object forms. Keep `$effect` for real side effects
- Use named constants from `src/lib/constants.ts` instead of magic numbers
- Give a boolean a name that says what it answers: `isOpen`, `hasKeys`, `canShare`
- Add JSDoc to all exported functions
- Use British English in user-facing text
- Do not use em dashes; use semicolons or commas instead
- Keep text on the site short and plain: say a thing once, and leave out figures of speech and rhetorical questions

## Dependencies

`package.json` overrides one package, `minimatch`, which ESLint and typescript-eslint use to match file names. Their current releases ask for a version with a known advisory ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)); the override gives them the fixed one. Remove it once `npm audit` stays clean without it.

## Reporting bugs and security issues

Bug reports and feature suggestions go through [GitHub Issues](https://github.com/polyym/pgp-converter/issues).

Security vulnerabilities must not be reported in public issues. Report them privately as described in [SECURITY.md](./SECURITY.md), with clear reproduction steps and, where relevant, the affected commit or deploy.

## Questions

If you have questions about contributing, please open an issue on [GitHub](https://github.com/polyym/pgp-converter/issues).
