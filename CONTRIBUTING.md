# Contributing to PGP Converter

Contributions are welcome. Read this guide before you open a pull request.

## Contributor License Agreement (CLA)

All contributors must sign a Contributor License Agreement before any pull request can be merged. The CLA bot comments on your first pull request with instructions.

PGP Converter is licensed under the AGPL-3.0. The CLA grants the project maintainer a broad, irrevocable licence to your contributions, including the right to relicense them, so that the maintainer can offer commercial dual licensing or relicense the project in future while keeping the open-source version freely available under the AGPL.

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
6. Open a pull request against `dev`

The `Tests` workflow runs the same checks on every pull request, and the `zizmor` workflow checks the workflows themselves for security problems. A pull request that fails them is not merged.

## Branches

- `main` holds what is released. It changes only through a pull request, and every change to it is tested, built, signed and deployed to the live site
- `dev` holds the next version while it is put together, as a series of release candidates (`4.1.0-rc.1`, `4.1.0-rc.2`), numbered in `package.json`. A push to it runs the `Tests` workflow and puts it on the staging address, https://dev--pgp-converter.netlify.app, never on the live site

Pull requests from contributors go to `dev`. Anyone can open one, and only the maintainer merges them. In your pull request, raise `releaseCandidate` in `package.json` by one, so that your change is a candidate of its own, and raise it again if other changes reach `dev` before yours is merged. Leave the version itself as it is: the maintainer sets it. The development server (`npm run dev`) shows a notice under its top bar and its version in pale yellow, as the staging address and a preview do. When a version is ready, a pull request from `dev` into `main` runs the tests again and deploys a preview of the site, and merging it deploys to production.

Rules on GitHub protect both branches. Neither can be deleted or force-pushed, and only the maintainer can push to them or merge a pull request into them. A pull request into `main` cannot be merged until the `Tests` workflow passes, and it is squashed into one commit, so `main` gains one commit for each release.

Dependabot opens its monthly updates against `dev` as well, and leaves the candidate number as it is. Security updates are the exception: GitHub opens those against `main`, and after one is merged `dev` is brought up to date with `main`.

## Code style

- Follow existing patterns in the codebase
- Write logic in TypeScript, in `src/lib`, with a test beside it. A page or component holds only what connects that logic to its markup
- Reactive state shared by pages or components goes in `src/lib/stores`, as a `.svelte.ts` module. Markup that more than one page needs goes in `src/lib/components`, or in its `tool` folder if only the tool pages use it: the homepage, About and Donate download everything outside that folder
- Follow the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html), with two differences: files are named in `kebab-case`, and functions that can fail return a result (`{ success, data?, error? }`) where the guide would throw
- Use TypeScript strict mode; avoid `any` types, type assertions and non-null assertions (`!`)
- Build scripts are TypeScript too. Node runs them directly by stripping the types, so they use only erasable syntax (no enums or namespaces)
- Include the file extension in imports (`./keys.ts`, `#lib/keys.ts`)
- Formatting is Prettier's, with the settings in `.prettierrc.json`: tabs, single quotes, lines of up to 100 characters. Put braces on every `if` and loop
- If a lint rule is wrong for a piece of code, change the code or the rule in `eslint.config.js` with the reason beside it; do not disable a rule with an `eslint-disable` comment in the code
- In Svelte files, use runes, keyed `{#each}` blocks and the `class` attribute's array and object forms. Keep `$effect` for real side effects
- Use named constants from `src/lib/constants.ts` instead of magic numbers
- Give a boolean a name that says what it answers: `isOpen`, `hasKeys`, `canShare`
- Add JSDoc to all exported functions
- Write all prose in British English, comments and documentation included. Identifiers, HTML attribute names and API names keep their own spelling
- Do not use em dashes, en dashes or `--` as punctuation. Use a colon, a comma, brackets or a new sentence
- Keep text on the site short and plain: say a thing once, and leave out figures of speech and rhetorical questions

## Dependencies

`package.json` overrides one package, `minimatch`, which ESLint and typescript-eslint use to match file names. Their current releases ask for a version with a known advisory ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)); the override gives them the fixed one. Remove it once `npm audit` stays clean without it.

## Reporting bugs and security issues

Bug reports and feature suggestions go through [GitHub Issues](https://github.com/polyym/pgp-converter/issues).

Do not report security vulnerabilities in public issues. Report them privately as described in [SECURITY.md](./SECURITY.md), with clear reproduction steps and, where relevant, the affected commit or deploy.

## Questions

If you have questions about contributing, open an issue on [GitHub](https://github.com/polyym/pgp-converter/issues).
