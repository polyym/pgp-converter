# PGP Converter

PGP Converter is a web app for encrypting, decrypting, signing and verifying text with PGP (Pretty Good Privacy), and for making PGP key pairs. It is built with SvelteKit and Vite, and uses the OpenPGP.js library for all the cryptography.

**Website**: https://pgp-converter.com

**Source Code**: https://github.com/polyym/pgp-converter

## Table of Contents

- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Website Structure](#website-structure)
- [Security](#security)
- [Known Issues](#known-issues)
- [Technology Stack](#technology-stack)
- [Building and Running Locally](#building-and-running-locally)
- [Releases](#releases)
- [Contributions](#contributions)
- [License](#license)

## Key Features

- Encrypt a message to one or more public keys. The app shows whose key each one is, and its fingerprint, before you encrypt
- Decrypt a message with your private key and passphrase, and check the sender's signature at the same time
- Sign a message, on its own or while encrypting
- Verify a signed message against the sender's public key, and see who signed it, when, and whether it was changed
- Generate ECC or RSA key pairs that GnuPG and other mainstream clients can import. An email address on the key is optional, and the page asks before you leave without saving the private key
- Download generated keys as `.asc` or `.txt` files
- After the first visit the app runs with no connection, and it can be installed from the browser's menu
- A tool page left untouched for 15 minutes clears its keys, passphrases and messages
- Keyboard shortcuts for the main actions
- Works on phones, tablets and desktops
- An About page that explains PGP, the threat model and how the site is hosted
- Donations in Solana, Ethereum or Bitcoin

## How It Works

Encryption, decryption, signing, verification and key generation all happen in your browser, using the [OpenPGP.js](https://openpgpjs.org/) library. Keys, messages and passphrases are not sent to any server or stored.

## Website Structure

The site is built with SvelteKit and Svelte 5 runes, and every page is prerendered. The logic is TypeScript in `src/lib`, with reactive state in `src/lib/stores`; a page holds little more than what connects that logic to its markup. The main files and folders:

```
.github/
├── dependabot.yml        # Monthly pull requests for newer versions of the actions and packages
└── workflows/
    ├── deploy.yml        # CI: build, test, sign with Sigstore, deploy to Netlify, check the live site
    └── tests.yml         # CI: unit tests, type check, lint, formatting check and production build

netlify/
└── functions/
    └── wallet-proxy.mts  # Serverless proxy for this project's wallet addresses

scripts/                  # TypeScript that Node runs as it is; no build step
├── check-bundle.ts       # Fails the build if a page without cryptography would download the cryptography library
├── csp.ts                # The Content-Security-Policy, in one place
├── list-files.ts         # Lists the files of a build in the same order on every machine
├── make-icons.ts         # Draws the app icons and the link-preview picture (run only if the design changes)
├── verify-deploy.ts      # Compares the live site with the signed build after a deploy, and checks its content policy
└── write-csp.ts          # After a build, writes the policy with the hash of each page's start-up script into build/_headers

src/
├── lib/
│   ├── components/       # UI that every page uses (PageFrame, NavBar, PageHeader, Icon, SEO)
│   │   └── tool/         # UI that only the tool pages use (ToolFrame, ResultPanel, TextField, etc.)
│   ├── stores/           # Reactive state, as Svelte rune modules
│   │   ├── tool-page.svelte.ts        # Behaviour shared by the tool pages: running the action, copying, shortcuts, clearing
│   │   ├── clear-confirm.svelte.ts    # A Clear that asks twice
│   │   ├── result-freshness.svelte.ts # Whether the result on a page still matches its inputs
│   │   ├── feedback.svelte.ts         # Success and error message state for the tool pages
│   │   ├── copy.svelte.ts             # Copying to the clipboard, and a Copy button's "Copied" state
│   │   ├── key-inspector.svelte.ts    # Describes the keys in a text box while the user types
│   │   ├── unsaved-key.svelte.ts      # Asks before a new private key that has not been saved is lost
│   │   ├── app-update.svelte.ts       # Tells the top bar when a newer version of the app is ready
│   │   ├── on-screen-keyboard.svelte.ts # Tells the page frame while a phone's keyboard is open
│   │   └── wallet-loader.svelte.ts    # The Donate page's loading, QR codes and copying
│   ├── constants.ts      # Shared constants and configuration
│   ├── errors.ts         # User-friendly error mapping
│   ├── armor.ts          # Clean-up of pasted PGP blocks (indentation, email quoting, lost line breaks)
│   ├── keys.ts           # Reading and unlocking keys, and describing them (identity, fingerprint)
│   ├── signatures.ts     # Signing messages, verifying them, and reading signature results
│   ├── verdicts.ts       # Puts the result for each signature into words
│   ├── text-files.ts     # Reading dropped or chosen key and message files, UTF-8 or UTF-16
│   ├── text-entry.ts     # Pasting at the cursor, and what the browser lets a text box do
│   ├── download.ts       # Saving a key or a result as a file; kept apart from the cryptography on purpose
│   ├── key-files.ts      # Names for downloaded key files, and the file that holds both keys
│   ├── keep-out.ts       # Attributes that ask writing-assistant extensions to leave a field alone
│   ├── dot-text.ts       # Lays out the version number as a grid of dots for the homepage
│   ├── dot-pictures.ts   # The pictures the homepage's dot grid can draw
│   ├── structured-data.ts # What the homepage tells search engines about the app
│   ├── sections.ts       # Finds the section being read on the About page
│   ├── page-transition.ts # The cross-fade between pages
│   ├── pages.ts          # The pages the top bar lists
│   ├── icons.ts          # The app's line icons, one set for every page
│   ├── reveal.ts         # Brings a new result, or the field an error is about, into view
│   ├── passphrase.ts     # Rough strength reading for a new passphrase
│   ├── handoff.ts        # Passes a new key from Generate to the next page, in memory only
│   ├── idle.ts           # Decides when an untouched page has waited long enough to be cleared
│   ├── idle-watch.ts     # Listens for activity in the browser, for idle.ts
│   ├── on-screen-keyboard.ts # Recognises a phone's keyboard lying over the page
│   ├── offline.ts        # Chooses which of the app's own files are kept on the device
│   ├── result-state.ts   # Says when a result no longer matches the inputs beside it
│   ├── result-preview.ts # Chooses how much of a very long result is put on the page
│   ├── shortcuts.ts      # What each key press means, and shortcut labels for the user's keyboard (Ctrl or Command)
│   ├── donation-banner.ts # Donation banner cooldown logic
│   ├── donations.ts      # Wallet API fetch, address validation, and QR code generation
│   ├── server/           # Code that runs only while the site is built (the time of the build)
│   ├── testing.ts        # A helper for the unit tests
│   ├── encryption.ts     # Message encryption, with optional signing
│   ├── decryption.ts     # Message decryption, with optional signature check
│   └── keygen.ts         # Key pair generation module
├── routes/
│   ├── +layout.svelte    # App layout wrapper
│   ├── +layout.ts        # Enables static prerendering for all routes
│   ├── +page.svelte      # Homepage
│   ├── +error.svelte     # Error page
│   ├── encrypt/          # Encryption page
│   ├── decrypt/          # Decryption page
│   ├── sign/             # Signing page
│   ├── verify/           # Signature verification page
│   ├── generate/         # Key generation page
│   ├── about/            # About, privacy, and documentation page
│   ├── help/             # Redirect to /about
│   ├── donate/           # Crypto donation page
│   ├── [x+2e]well-known/ # security.txt, at /.well-known/security.txt (the dot is written out so TypeScript checks the folder)
│   └── sitemap.xml/      # Prerendered XML sitemap with per-URL lastmod
├── service-worker/       # Keeps the app's own files on the device so it works offline
├── app.css               # Global styles and self-hosted @font-face declarations
└── app.html              # App shell (theme-color, font preloads, base head)

static/
├── fonts/                # Self-hosted IBM Plex Mono and Inter woff2 subsets
├── icons/                # Icons for the installed app
├── manifest.webmanifest  # Name, colours and icons for installing the app
├── og-image.png          # Picture shown when a link to the site is shared
├── pgp_key_icon.png      # Favicon
├── robots.txt            # Search engine crawl directives
└── archive/              # Previous favicon versions

.gitattributes            # Keeps line endings the same on every system, so builds can be reproduced
eslint.config.js          # The lint rules, with the reason for each one that is switched off
.prettierrc.json          # How the code is formatted: tabs, single quotes, lines of up to 100 characters
netlify.toml              # Security headers (HSTS, COOP, Referrer-Policy, etc.), caching and the /help redirect
vite.config.ts            # Vite and SvelteKit configuration (SvelteKit 3 has no svelte.config.js)
```

## Security

- **Client-Side Only**: All the cryptography runs in your browser. No messages, keys or passphrases are sent to any server. The only outside request is for the donation addresses on the Donate page, and it carries no user data
- **No Tracking**: No cookies, no client-side tracking scripts and no personal data collected. Fonts are served from the site itself, and the site sends no referrer information to the links it leads to
- **Security Headers**: Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy and Cross-Origin-Opener-Policy are applied to every file via `netlify.toml`. The Permissions-Policy switches off the camera, microphone, location and other device features, none of which the app uses
- **Strict Content-Security-Policy**: The policy refuses everything by default and then allows only what the app needs, all of it from this site. No other site is named in it, so a page cannot load scripts from, or connect to, anywhere else. The short script that starts each page is allowed by the hash of its exact text, which the build works out (`scripts/write-csp.ts`). Scripts have no `'unsafe-inline'` and no `'unsafe-eval'`, so a script that reached a page by any other route would not run. The "not found" page is a file like the rest, so it carries the same policy and headers and is part of the signed build
- **Text Stays in the Box**: Fields that take your own text ask writing-assistant extensions and the browser's spelling services to stay out, and results are marked as not to be translated. Extensions can ignore the request, so switch them off for anything sensitive
- **Modern Cryptography**: OpenPGP.js v6. Keys are ECC (Curve25519 by default, or NIST P-256, P-384 and P-521) or RSA (2048 to 4096 bits)
- **Works Offline**: A service worker keeps a copy of the app's own pages, code, fonts and icons so that it runs with no connection. Nothing a visitor types, pastes or generates is kept. When online, the browser still checks this site for a newer version. A new version waits until the visitor presses Update or closes the app, so a page in use is never replaced
- **Attested Builds**: Every production deploy is built in GitHub Actions and signed with a short-lived Sigstore certificate. Attestations are recorded in Sigstore's public transparency log and can be verified against any file served from the live site (see below). The deploy workflow uploads the signed files unchanged and then fails if the live site serves anything else
- **Reproducible Builds**: Each build is named after the commit it was made from, and the same commit always builds the same files, byte for byte. The homepage and the About page show that commit, and anyone can build it and compare the result with what the live site serves (see [Reproducing a Build](#reproducing-a-build))

### Security Considerations

With a web app, you trust the server to deliver the right code every time you open it, as the [OpenPGP.js documentation](https://docs.openpgpjs.org/) points out. If that matters for what you are doing, you can:

- Verify a deployed file against its signed build attestation. With the [GitHub CLI](https://cli.github.com/) installed:

  ```bash
  gh attestation verify <file> --repo polyym/pgp-converter
  ```

- Build the commit the site names and compare your files with the live ones (see [Reproducing a Build](#reproducing-a-build))
- Watch the network requests in your browser's developer tools. None are made while you encrypt or decrypt
- Run the app locally, or use dedicated PGP software such as [GnuPG](https://gnupg.org/)

A decrypted message tells you what it says, not who wrote it, unless it carries a signature and you check it against the sender's public key. A valid signature proves which key signed. Confirming that the key belongs to the person you think it does is up to you. The full threat model is on the [About page](https://pgp-converter.com/about#threat-model).

### Security Best Practices

- Never share your private key
- Protect it with a strong, unique passphrase
- Before encrypting to a public key or trusting its signature, compare the fingerprint the app shows with one the owner gives you through a trusted channel
- Keep secure backups of your key pair

### Reporting Security Issues

Please do not report security vulnerabilities in public issues. Report them privately as described in [SECURITY.md](./SECURITY.md). The site gives the same contact at `/.well-known/security.txt`, where security researchers and their tools look for it.

Bug reports without a security impact, and feature suggestions, are welcome as [GitHub issues](https://github.com/polyym/pgp-converter/issues).

## Known Issues

### GnuPG on Ubuntu 26.04 cannot import Curve25519 private keys

On Ubuntu 26.04, `gpg --import` refuses a Curve25519 private key with `Bad secret key`, and the key cannot then be used to decrypt. In scripts that import with `--batch`, the import appears to succeed and GnuPG instead answers `Bad passphrase` when the key is first used, even though the passphrase is correct. This was confirmed in November 2026.

The fault is in libgcrypt 1.12.0, the cryptography library GnuPG uses on that system, and it is fixed in libgcrypt 1.12.1. It affects every Curve25519 private key that is imported, including ones GnuPG generated itself and exported, so the key file is not damaged: the same file imports normally into a GnuPG built on another libgcrypt version. NIST P-256 and RSA keys are not affected, and neither is encrypting to someone's Curve25519 public key.

To find out whether your system is affected, run `gpg --version`; the second line names the libgcrypt version. If it is `1.12.0`, you can:

- generate a **NIST P-256** or **RSA** key on the Generate page instead of the default Curve25519, or
- keep the Curve25519 key and import it into GnuPG once libgcrypt has been updated to 1.12.1 or later. Until then PGP Converter can still decrypt with it, since it does not use libgcrypt.

### GnuPG warns about "preferences for unavailable algorithms" on import

When you import a private key generated here, GnuPG 2.4 prints a warning like this and suggests that you update your preferences:

```
gpg: WARNING: key 0123456789ABCDEF contains preferences for unavailable
algorithms on these user IDs:
gpg:          "Your Name <you@example.com>": preference for digest algorithm 14
gpg:          "Your Name <you@example.com>": preference for digest algorithm 12
```

The key has been imported and works, so the warning can be ignored. Algorithms 12 and 14 are the SHA-3 hashes. OpenPGP.js lists them in every new key as hashes its owner accepts, after SHA-512 and SHA-256, and GnuPG 2.4 does not implement them; it passes over the entries it does not know. If GnuPG offers to update the preferences, you can decline.

## Technology Stack

- **Runtime**: Node.js 26 or later
- **Framework**: SvelteKit 3.x with Svelte 5 (runes), built as plain files with its static adapter
- **Build Tool**: Vite 8.x
- **Styling**: Hand-written CSS with custom properties, and self-hosted IBM Plex Mono and Inter fonts
- **Cryptography**: OpenPGP.js 6.x
- **QR Codes**: qrcode (for donation wallet addresses)
- **Testing**: Vitest 5.x, including a round trip through a real GnuPG where one is installed
- **Linting and formatting**: ESLint 10 with typescript-eslint, eslint-plugin-svelte and eslint-plugin-unicorn, and Prettier 3. Both are checked on every push
- **TypeScript**: 6.x with strict mode, for the app, its tests and its build scripts, which Node runs directly. The code follows the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- **Serverless**: Netlify Functions v2 (wallet address proxy)
- **CI / Deployment**: GitHub Actions builds, tests and deploys with a pinned version of the Netlify CLI on every push to `main`. The actions are pinned to exact commits, and Dependabot proposes newer ones
- **Build Attestations**: `actions/attest@v4` signs each production build with Sigstore and generates a SLSA build provenance attestation, which is recorded in Rekor's public transparency log and can be checked with `gh attestation verify`

## Building and Running Locally

You need Node.js 26 or later.

### Project Setup

1. Clone the repository: `git clone https://github.com/polyym/pgp-converter.git`
2. Go to the project directory: `cd pgp-converter`
3. Install the dependencies: `npm install`
4. Start the development server: `npm run dev`

`npm run dev -- --open` also opens the app in a new browser tab.

### Available Scripts

| Command                | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Start development server                       |
| `npm run build`        | Build for production                           |
| `npm run preview`      | Preview production build locally               |
| `npm run check`        | Run TypeScript and Svelte checks               |
| `npm run lint`         | Check the code against the lint rules          |
| `npm run format`       | Format every file with Prettier                |
| `npm run format:check` | Check the formatting without changing anything |
| `npm test`             | Run unit tests                                 |
| `npm run test:watch`   | Run tests in watch mode                        |

### Building for Production

```bash
npm run build
```

The build output under `build/` is the whole site: prerendered HTML for every public route, the static assets, and `404.html`, the page Netlify serves for an address that does not exist. No function renders pages. The one Netlify function deployed alongside the files is the wallet-address proxy in `netlify/functions/`, served at `/.netlify/functions/wallet-proxy`. The build also writes `build/_headers`, which holds the Content-Security-Policy for that build. You can preview the production build with `npm run preview`.

A build made by the workflow is named after its commit, and the dates in `sitemap.xml` and `security.txt` come from the commit's own time, so nothing in it depends on when or where it was built. A build on your own machine is named after the current time unless you set the two variables shown under [Reproducing a Build](#reproducing-a-build).

Production deploys run through `.github/workflows/deploy.yml`: pushes to `main` run the test suite, the type check, the lint rules and the formatting check, build the site, sign the build output with Sigstore via `actions/attest@v4`, and deploy that exact output to Netlify using the Netlify CLI with `--no-build`. Before signing, `scripts/check-bundle.ts` fails the run if the homepage, About or Donate would download the cryptography library. A final step, `scripts/verify-deploy.ts`, downloads every file from the live site and fails the workflow if any differs from the signed build, if a page arrives with a content policy that would stop it starting or that allows inline scripts, or if the wallet proxy cannot be reached. It also asks for an address that does not exist and warns if the answer is not the build's `404.html`. Pull requests trigger a preview deploy without an attestation.

The Netlify project has no repository linked, so Netlify never builds the site itself and every deploy comes from this workflow. Linking one would let Netlify publish its own unsigned build over the signed one.

### Verifying a Deployed Build

With the [GitHub CLI](https://cli.github.com/) installed, any file served from the live site can be verified against its signed attestation:

```bash
curl -O https://pgp-converter.com/_app/version.json
gh attestation verify version.json --repo polyym/pgp-converter
```

A successful check confirms that the file was produced by the official GitHub Actions workflow and has not been changed since. `version.json` holds the commit the site was built from. The homepage shows the same commit beside the version number.

### Reproducing a Build

The same commit builds the same files on any machine, so you can check that the live site is running the published source. First ask the site which commit it was built from:

```bash
curl -s https://pgp-converter.com/_app/version.json
```

Then build that commit and compare. Put the commit in place of `<commit>`:

```bash
git clone https://github.com/polyym/pgp-converter.git
cd pgp-converter
git checkout <commit>
npm ci
GITHUB_SHA=$(git rev-parse HEAD) SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) npm run build
node scripts/verify-deploy.ts https://pgp-converter.com build
```

The last command downloads every file from the live site and compares it with your build. It lists any file that differs.

The two variables give the build its name and its dates, as the deploy workflow does. Without them the build is named after the current time and will not match. You need Node.js 26. On Windows, run the commands in Git Bash or WSL.

This was checked on Windows 11 and on Ubuntu 24.04: both built identical files from the same commit.

## Releases

Version numbers follow [Semantic Versioning](https://semver.org/), with one addition. This is an app that people use directly, so a significant change to its existing interface, or to the way it is used, counts as major too:

- **Major** versions (e.g. `v4`) contain breaking changes, such as removing features or changing the fundamental trust model, or significant UI/UX changes, such as a redesign.
- **Minor** versions (e.g. `v3.2`) add new features or meaningful improvements in a backward-compatible way. New pages and tools are minor, unless they break existing functionality or change the existing UX in a large way.
- **Patch** versions (e.g. `v3.2.1`) contain only bug fixes, security updates, and minor corrections. Patch releases never introduce new features.

Only major and minor versions are published as GitHub releases; patch versions are rolled into the current release for their minor line. Each release (for example, `v3.2`) always reflects the latest patch state of that minor line, and its tag carries the full version number (`3.2.2`). When a patch needs to ship, the existing release is deleted and republished with the new patch's tag once the patch is merged. The exact version, including the patch component, is always in [`package.json`](./package.json).

## Contributions

Contributions are welcome. Fork the repository and open a pull request with your changes.

All contributors must sign the [Contributor License Agreement (CLA)](https://github.com/polyym/pgp-converter/blob/main/CONTRIBUTING.md) before their pull request can be merged. The CLA bot prompts you on your first pull request.

Before you open one, check that:

- All tests pass (`npm test`)
- The type check passes (`npm run check`)
- The lint rules pass (`npm run lint`)
- The formatting is right (`npm run format:check`; `npm run format` fixes it)
- The build completes (`npm run build`)

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-or-later).
