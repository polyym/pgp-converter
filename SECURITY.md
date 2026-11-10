# Security Policy

PGP Converter handles private keys and passphrases in the browser, so please report security problems privately.

## Reporting a vulnerability

**Please do not report security vulnerabilities in public GitHub issues.** A public report gives attackers the details before a fix is available.

Report privately instead, using GitHub's private vulnerability reporting:

https://github.com/polyym/pgp-converter/security/advisories/new

Please include:

- What the issue is and what an attacker could do with it
- Clear steps to reproduce it
- The affected commit or deploy, if you know it (the version is shown on the homepage and in [`package.json`](./package.json))
- Your browser and operating system, where relevant

Replies come through the same private thread. Once a fix has been deployed, the details can be published, with credit to you if you would like it.

## Scope

In scope:

- The application code in this repository and the site served at https://pgp-converter.com
- The build and deployment pipeline in `.github/workflows/`
- The wallet address proxy in `netlify/functions/`

Out of scope:

- Vulnerabilities in [OpenPGP.js](https://github.com/openpgpjs/openpgpjs/security) itself; please report those to the OpenPGP.js project
- The limits described in the threat model on the [About page](https://pgp-converter.com/about#threat-model), such as a compromised device or browser extension
- Denial of service that only affects your own browser tab

## Supported versions

Only the version currently deployed at https://pgp-converter.com is supported. Fixes are released as a new deploy, not backported.

## Other bugs

Bugs without a security impact, and feature suggestions, are welcome as normal [GitHub issues](https://github.com/polyym/pgp-converter/issues).
