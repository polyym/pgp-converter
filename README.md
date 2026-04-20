# PGP Converter

PGP Converter is a web-based tool that enables users to encrypt and decrypt text, as well as generate PGP key pairs, using the PGP (Pretty Good Privacy) protocol. The application is built with SvelteKit and Vite, and utilises the OpenPGP.js library to handle all cryptographic operations.

**Website**: https://pgp-converter.com

**Source Code**: https://github.com/polyym/pgp-converter

## Table of Contents

- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Website Structure](#website-structure)
- [Security](#security)
- [Technology Stack](#technology-stack)
- [Building and Running Locally](#building-and-running-locally)
- [Releases](#releases)
- [Contributions](#contributions)
- [License](#license)

## Key Features

PGP Converter offers:

- **Encrypt Messages**: Secure your messages using a recipient's public key
- **Decrypt Messages**: Unlock encrypted messages with your private key and passphrase
- **Generate Key Pairs**: Create new ECC or RSA key pairs with customisable settings
- **Export Keys**: Download generated keys as `.asc` or `.txt` files
- **About & Documentation**: In-app guide explaining PGP concepts, security best practices, and hosting transparency
- **Keyboard Shortcuts**: Quick actions for power users
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Crypto Donations**: Support the project with Solana, Ethereum, or Bitcoin
- **Open Source**: Full transparency with source code available for inspection

## How It Works

All encryption, decryption, and key generation happens entirely in your browser using the [OpenPGP.js](https://openpgpjs.org/) library. No data is transmitted to any server; the processing is between you, your browser, and OpenPGP.js.

This means:
- Your private keys never leave your device
- Your messages are never sent over the network
- Your passphrases are never stored or transmitted
- You can verify exactly what the code does by viewing the source

## Website Structure

The website is built using SvelteKit with Svelte 5 runes and ships as a fully prerendered static site. Here's a brief overview of the main directories and their roles:

```
.github/
└── workflows/
    ├── deploy.yml        # CI: build, test, sign with Sigstore, deploy to Netlify
    └── tests.yml         # CI: unit tests, type check, and production build

netlify/
└── functions/
    └── wallet-proxy.mts  # Serverless proxy for wallet address API

src/
├── lib/
│   ├── components/       # Shared UI components (NavBar, Toast, SEO, etc.)
│   ├── constants.ts      # Shared constants and configuration
│   ├── errors.ts         # User-friendly error mapping
│   ├── donation-banner.ts # Donation banner cooldown logic
│   ├── donations.ts      # Wallet API fetch, UI config, and QR code generation
│   ├── encryption.ts     # Message encryption module
│   ├── decryption.ts     # Message decryption module
│   └── keygen.ts         # Key pair generation module
├── routes/
│   ├── +layout.svelte    # App layout wrapper
│   ├── +layout.ts        # Enables static prerendering for all routes
│   ├── +page.svelte      # Homepage
│   ├── +error.svelte     # Error page
│   ├── encrypt/          # Encryption page
│   ├── decrypt/          # Decryption page
│   ├── generate/         # Key generation page
│   ├── about/            # About, privacy, and documentation page
│   ├── help/             # Redirect to /about
│   ├── donate/           # Crypto donation page
│   └── sitemap.xml/      # Prerendered XML sitemap with per-URL lastmod
├── app.css               # Global styles and self-hosted @font-face declarations
└── app.html              # App shell (theme-color, font preloads, base head)

static/
├── fonts/                # Self-hosted IBM Plex Mono and Inter woff2 subsets
├── pgp_key_icon.png      # Favicon
├── robots.txt            # Search engine crawl directives
└── archive/              # Previous favicon versions

netlify.toml              # Security headers (CSP, COOP, Referrer-Policy, etc.)
```

## Security

Security is paramount for PGP Converter:

- **Client-Side Only**: All cryptographic operations happen in your browser
- **No Data Transmission**: No messages, keys, or passphrases are ever sent to any server. The only external request is fetching donation wallet addresses on the donate page; no user data is involved
- **Self-Hosted Fonts**: Fonts are served from the same origin as the app; no third-party font CDN requests during normal use
- **Security Headers**: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and Cross-Origin-Opener-Policy are applied to every response via `netlify.toml`
- **Open Source**: The complete source code is available on GitHub for inspection
- **Modern Cryptography**: Uses OpenPGP.js v6 with support for modern ECC curves (Curve25519, NIST P-256/384/521) and RSA (2048-4096 bits)
- **Secure Defaults**: ECC with Curve25519 is recommended for optimal security and performance
- **No Tracking**: No cookies, no client-side tracking scripts, no personal data collection
- **Attested Builds**: Every production deploy is built in GitHub Actions and signed with a short-lived Sigstore-issued certificate. Attestations are recorded in Sigstore's public transparency log and can be verified against any file served from the live site (see below).

### Security Considerations

As noted in the [OpenPGP.js documentation](https://docs.openpgpjs.org/), web-hosted cryptographic applications provide users with a different security model compared to installable applications with auditable static versions. With web-hosted apps, users trust the server to deliver the correct code each time. For maximum security in sensitive contexts, consider:

- Verifying a deployed file against its signed build attestation. With the [GitHub CLI](https://cli.github.com/) installed:

  ```bash
  gh attestation verify <file> --repo polyym/pgp-converter
  ```

- Using browser developer tools to inspect network requests (you'll see none are made during crypto operations)
- For high-security needs, running the application locally or using dedicated PGP software such as [GnuPG](https://gnupg.org/)

### Security Best Practices

- Protect your private key; never share it with anyone
- Use a strong, unique passphrase to protect your private key
- Verify public keys through a trusted channel before encrypting
- Keep secure backups of your key pair

### Reporting Security Issues

Please open an issue on [GitHub](https://github.com/polyym/pgp-converter/issues) for bug reports, feature suggestions, and security disclosures.

## Technology Stack

- **Runtime**: Node.js v22.0.0+
- **Framework**: SvelteKit 2.x with Svelte 5 (runes)
- **Build Tool**: Vite 8.x
- **Styling**: Hand-written CSS with custom properties; self-hosted IBM Plex Mono and Inter
- **Cryptography**: OpenPGP.js 6.x
- **QR Codes**: qrcode (for donation wallet addresses)
- **Testing**: Vitest 4.x
- **TypeScript**: 6.x with strict mode
- **Serverless**: Netlify Functions v2 (wallet address proxy)
- **CI / Deployment**: GitHub Actions builds, tests, and deploys via the Netlify CLI on every push to `main`. All public routes are prerendered as static HTML
- **Build Attestations**: `actions/attest@v4` signs each production build using Sigstore and auto-generates a SLSA build provenance attestation; the result is recorded in Rekor's public transparency log and verifiable with `gh attestation verify`

## Building and Running Locally

To build and run PGP Converter locally, ensure that you have Node.js v22.0.0 or later installed on your machine.

### Project Setup

To set up the project on your local machine, follow these steps:

1. Clone the repository: `git clone https://github.com/polyym/pgp-converter.git`
2. Navigate to the project directory: `cd pgp-converter`
3. Install the dependencies: `npm install`
4. Start the development server: `npm run dev`

You can open the application in a new browser tab with `npm run dev -- --open`.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run check` | Run TypeScript and Svelte checks |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |

### Building for Production

To create a production version of the application:

```bash
npm run build
```

The build output under `build/` contains fully prerendered HTML for every public route plus static assets; the Netlify function for the wallet-address proxy is bundled separately under `.netlify/functions-internal/`. You can preview the production build with `npm run preview`.

Production deploys run through `.github/workflows/deploy.yml`: pushes to `main` trigger a build, run the test suite, sign the build output with Sigstore via `actions/attest@v4`, and deploy to Netlify using the Netlify CLI. Pull requests trigger a preview deploy without an attestation.

### Verifying a Deployed Build

With the [GitHub CLI](https://cli.github.com/) installed, any file served from the live site can be verified against its signed attestation:

```bash
curl -O https://pgp-converter.com/_app/version.json
gh attestation verify version.json --repo polyym/pgp-converter
```

A successful verification confirms the file was produced by the official GitHub Actions workflow and has not been tampered with since.

## Releases

This project follows [Semantic Versioning](https://semver.org/):

- **Major** versions (e.g. `v4`) contain breaking changes, such as removing features or changing the fundamental trust model.
- **Minor** versions (e.g. `v3.2`) add new features or meaningful improvements in a backward-compatible way.
- **Patch** versions (e.g. `v3.2.1`) contain only bug fixes, security updates, and minor corrections. Patch releases never introduce new features.

Only major and minor versions are published as GitHub releases; patch versions are rolled into the current release for their minor line. Each release tag (for example, `v3.2`) always reflects the latest patch state of that minor line. When a patch needs to ship, the existing release is deleted and republished under the same tag once the patch is merged. The exact version, including the patch component, is always in [`package.json`](./package.json).

## Contributions

Contributions are welcome. Please fork the repository and create a pull request with your changes.

All contributors must sign the [Contributor License Agreement (CLA)](https://github.com/polyym/pgp-converter/blob/main/CONTRIBUTING.md) before their pull request can be merged. The CLA bot will prompt you automatically on your first PR.

When contributing, please ensure:
- All tests pass (`npm test`)
- All TypeScript checks pass (`npm run check`)
- The build completes successfully (`npm run build`)
- You follow existing code style and conventions

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-or-later).
