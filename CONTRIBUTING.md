# Contributing to PGP Converter

Contributions are welcome! Before submitting a pull request, please read through this guide.

## Contributor License Agreement (CLA)

All contributors must sign a Contributor License Agreement before any pull request can be merged. The CLA bot will automatically comment on your first pull request with instructions.

**Why a CLA?** PGP Converter is licensed under the AGPL-3.0. The CLA grants the project maintainer a broad, irrevocable licence to your contributions, including the right to relicense them. This gives the maintainer the freedom to offer commercial dual-licensing or relicense the project in the future, while keeping the open-source version freely available under the AGPL.

You retain copyright ownership of your contributions, but the licence you grant is perpetual and irrevocable.

## Development workflow

1. Fork the repository and clone your fork
2. Install dependencies: `npm install`
3. Create a branch for your changes
4. Make your changes
5. Ensure everything passes before submitting:
   - `npm test` (all tests pass)
   - `npm run check` (0 errors, 0 warnings)
   - `npm run build` (production build succeeds)
6. Open a pull request against `main`

## Code style

- Follow existing patterns in the codebase
- Use TypeScript strict mode; avoid `any` types and unsafe assertions
- Use named constants from `src/lib/constants.ts` instead of magic numbers
- Add JSDoc to all exported functions
- Use British English in user-facing text
- Do not use em dashes; use semicolons or commas instead

## Questions

If you have questions about contributing, please open an issue on [GitHub](https://github.com/polyym/pgp-converter/issues).
