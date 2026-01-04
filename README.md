# PGP Converter

PGP Converter is a web-based tool that enables users to encrypt and decrypt text using the PGP (Pretty Good Privacy) protocol. The application is built with Node.js, SvelteKit, Vite and Tailwind CSS, and it utilises the OpenPGP.js library to handle the encryption and decryption process.

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
- [Building and Running Locally](#building-and-running-locally)
- [Contributions](#contributions)

## Key Features

PGP Converter offers:

- Easy-to-use PGP encryption and decryption
- Secure implementation using client-side operations
- Cross-platform compatibility
- Open-source code for transparency and contributions
- Modern, responsive user interface

## How It Works

All encryption and decryption happens entirely in your browser using the [OpenPGP.js](https://openpgpjs.org/) library. No data is transmitted to any server — the processing is between you, your browser, and OpenPGP.js.

This means:
- Your private keys never leave your device
- Your messages are never sent over the network
- You can verify exactly what the code does by viewing the source

## Website Structure

The website is built using SvelteKit. Here's a brief overview of the main directories and their roles:

- `/src/routes`: This directory contains the Svelte components for each page
- `/src/lib`: This directory houses reusable TypeScript modules for encryption and decryption
- `/static`: This directory contains static assets such as icons

## Security

Security is paramount for PGP Converter. No data ever leaves your browser — all encryption and decryption is done client-side. The source code is fully open and available on GitHub for inspection.

## Building and Running Locally

To build and run PGP Converter locally, ensure that you have Node.js v24.0.0 or later installed on your machine.

### Project Setup

To set up the project on your local machine, follow these steps:

1. Clone the repository: `git clone https://github.com/polyym/pgp-converter.git`
2. Navigate to the project directory: `cd pgp-converter`
3. Install the dependencies: `npm install`
4. Start the development server: `npm run dev`

You can open the application in a new browser tab with `npm run dev -- --open`.

### Building for Production

To create a production version of the application:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your application, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.

## Contributions

Contributions are always welcome. Please fork the repository and create a pull request with your changes.
