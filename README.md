# PGP Converter

PGP Converter is a web-based tool that enables users to encrypt and decrypt text, as well as generate PGP key pairs, using the PGP (Pretty Good Privacy) protocol. The application is built with Node.js, SvelteKit, Vite and Tailwind CSS, and utilises the OpenPGP.js library to handle all cryptographic operations.

<p align="center">
  <img src="https://www.pandasecurity.com/en/mediacenter/src/uploads/2023/03/pgp-encryption-process.png" alt="PGP Process">
</p>

**Website**: https://pgp-converter.com

**Source Code**: https://github.com/polyym/pgp-converter

## Table of Contents

- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Website Structure](#website-structure)
- [Security](#security)
- [Technology Stack](#technology-stack)
- [Building and Running Locally](#building-and-running-locally)
- [Contributions](#contributions)

## Key Features

PGP Converter offers:

- **Encrypt Messages**: Secure your messages using a recipient's public key
- **Decrypt Messages**: Unlock encrypted messages with your private key and passphrase
- **Generate Key Pairs**: Create new ECC or RSA key pairs with customisable settings
- **Export Keys**: Download generated keys as `.asc` or `.txt` files
- **Help Documentation**: In-app guide explaining PGP concepts and best practices
- **Keyboard Shortcuts**: Quick actions for power users
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Open Source**: Full transparency with source code available for inspection

## How It Works

All encryption, decryption, and key generation happens entirely in your browser using the [OpenPGP.js](https://openpgpjs.org/) library. No data is transmitted to any server — the processing is between you, your browser, and OpenPGP.js.

This means:
- Your private keys never leave your device
- Your messages are never sent over the network
- Your passphrases are never stored or transmitted
- You can verify exactly what the code does by viewing the source

## Website Structure

The website is built using SvelteKit with Svelte 5 runes. Here's a brief overview of the main directories and their roles:

```
src/
├── lib/
│   ├── encryption.ts    # Message encryption module
│   ├── decryption.ts    # Message decryption module
│   └── keygen.ts        # Key pair generation module
├── routes/
│   ├── +page.svelte     # Homepage
│   ├── encrypt/         # Encryption page
│   ├── decrypt/         # Decryption page
│   ├── generate/        # Key generation page
│   └── help/            # Help and documentation page
└── app.html             # App shell
```

## Security

Security is paramount for PGP Converter:

- **Client-Side Only**: All cryptographic operations happen in your browser
- **No Data Transmission**: No messages, keys, or passphrases are ever sent to any server
- **Open Source**: The complete source code is available on GitHub for inspection
- **Modern Cryptography**: Uses OpenPGP.js v6 with support for modern ECC curves (Curve25519, NIST P-256/384/521) and RSA (2048-4096 bits)
- **Secure Defaults**: ECC with Curve25519 is recommended for optimal security and performance

### Security Considerations

As noted in the [OpenPGP.js documentation](https://docs.openpgpjs.org/), web-hosted cryptographic applications provide users with a different security model compared to installable applications with auditable static versions. With web-hosted apps, users trust the server to deliver the correct code each time. For maximum security in sensitive contexts, consider:

- Verifying the source code on GitHub matches what is deployed
- Using browser developer tools to inspect network requests (you'll see none are made during crypto operations)
- For high-security needs, running the application locally or using dedicated PGP software

### Security Best Practices

- Protect your private key — never share it with anyone
- Use a strong, unique passphrase to protect your private key
- Verify public keys through a trusted channel before encrypting
- Keep secure backups of your key pair

## Technology Stack

- **Runtime**: Node.js v24.0.0+
- **Framework**: SvelteKit 2.x with Svelte 5
- **Build Tool**: Vite 6.x
- **Styling**: Tailwind CSS 3.x
- **Cryptography**: OpenPGP.js 6.x
- **TypeScript**: Full type safety throughout
- **Deployment**: Netlify adapter included

## Building and Running Locally

To build and run PGP Converter locally, ensure that you have Node.js v24.0.0 or later installed on your machine.

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

### Building for Production

To create a production version of the application:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your application, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment. The Netlify adapter is included by default.

## Contributions

Contributions are always welcome. Please fork the repository and create a pull request with your changes.

When contributing, please ensure:
- All TypeScript checks pass (`npm run check`)
- The build completes successfully (`npm run build`)
- You follow existing code style and conventions
