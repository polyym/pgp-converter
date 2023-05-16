# PGP Converter

PGP Converter is a web-based tool that enables users to encrypt and decrypt text using the PGP (Pretty Good Privacy) protocol. The application is built with Node.js, SvelteKit, Vite and Tailwind CSS, and it uses the OpenPGP.js library to handle the encryption and decryption process.

<p align="center">
  <img src="https://www.pandasecurity.com/en/mediacenter/src/uploads/2023/03/pgp-encryption-process.png" alt="PGP Process">
</p>

**Website**: https://pgp-converter.com

**Source Code**: https://github.com/polyym/pgp-converter

## Table of Contents

- [Key Features](#key-features)
- [Features to Look Out For in the Next Release](#features-to-look-out-for-in-the-next-release)
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

## Features to Look Out For in the Next Release

Future versions of PGP Converter will provide:

- Key generation capabilities
- Key storage solutions
- Comprehensive PGP instruction guide

## Website Structure

The website is built using SvelteKit. Here's a brief overview of the main directories and their roles:

- `/src/routes`: This directory contains the Svelte components for each page.
- `/static`: This directory houses reusable Svelte components and utility functions.

## Security

Security is paramount for PGP Converter. No data ever leaves your browser — all encryption and decryption is done client-side.

## Building and Running Locally

To build and run PGP Converter locally, ensure that you have Node.js v14.0.0 or later and npm v6.0.0 or later installed on your machine. 

**Project Setup**

To set up the project on your local machine, follow these steps:

1. Clone the repository: `git clone https://github.com/polyym/pgp-converter.git`
2. Navigate to the project directory: `cd pgp-converter`
3. Install the dependencies: `npm install`
4. Start the development server: `npm run dev`

You can open the application in a new browser tab with `npm run dev -- --open`.

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
    ```

You can open the application in a new browser tab with:
    ```
npm run dev -- --open
    ```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.

## Contributions

Contributions are always welcome. Please fork the repository and create a pull request with your changes.