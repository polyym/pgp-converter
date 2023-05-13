# PGP Converter

PGP Converter is a web-based tool that enables users to encrypt and decrypt text using the PGP (Pretty Good Privacy) protocol. The application is built with Node.js, SvelteKit, Vite and Tailwind CSS, and it uses the OpenPGP.js library to handle the encryption and decryption process.

## Project Setup

To set up the project on your local machine, follow these steps:

1. Clone the repository: 
    ```
    git clone https://github.com/polyym/pgp-converter.git
    ```
2. Navigate to the project directory: 
    ```
    cd pgp-converter
    ```
3. Install the dependencies: 
    ```
    npm install
    ```
4. Start the development server:
    ```
    npm run dev
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