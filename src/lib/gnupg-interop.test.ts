// Checks that keys and messages made by this app work with a real GnuPG, and
// the other way round. The unit tests only prove OpenPGP.js agrees with itself;
// this is the test that would have caught keys GnuPG cannot import.
//
// It runs wherever a working GnuPG 2.1 or later is on the PATH and is skipped
// everywhere else. On a build server a skip is reported as a warning, because
// one is expected there and a silent skip would mean nothing is being checked.
//
// Each key type starts with a control: GnuPG is given a key of that type that
// it generated itself, and has to do with it what the test then asks of the
// app's key. Some GnuPG installations fail that. libgcrypt 1.12.0, which Ubuntu
// 26.04 ships, rejects every Curve25519 secret key on import, GnuPG's own
// included (fixed in libgcrypt 1.12.1). A failure of that kind says nothing
// about this app, so the key type is skipped with a warning instead of failing.

import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPair, type KeyGenOptions } from './keygen';
import { encryptMessage } from './encryption';
import { decryptMessage } from './decryption';

const PASSPHRASE = 'interop-test-passphrase';
const GPG_TIMEOUT_MS = 30_000;

// The keyring the test imports into, and a second one where GnuPG generates
// the keys used as controls
let home = '';
let controlHome = '';
// "GnuPG 2.4.8 with libgcrypt 1.12.0", for messages
let installedGnuPG = 'GnuPG';
// The GnuPG bundled with Git for Windows expects POSIX-style paths (/c/Users/...)
let usesPosixPaths = false;

/** Converts a path into the form the installed GnuPG understands */
function gpgPath(path: string): string {
	if (process.platform !== 'win32' || !usesPosixPaths) return path;
	return path.replace(/^([A-Za-z]):/, (_match, drive: string) => `/${drive.toLowerCase()}`).replace(/\\/g, '/');
}

function gpg(homedir: string, args: string[], input?: string) {
	return spawnSync(
		'gpg',
		['--homedir', gpgPath(homedir), '--batch', '--no-tty', '--yes', '--pinentry-mode', 'loopback', '--passphrase', PASSPHRASE, ...args],
		{ input, encoding: 'utf8', timeout: GPG_TIMEOUT_MS }
	);
}

/** GnuPG's own account of a failed command, on one line */
function explain(result: SpawnSyncReturns<string>): string {
	const output = (result.stderr ?? '').replace(/\s+/g, ' ').trim();
	return output || result.error?.message || `exit status ${result.status}`;
}

/** Returns why GnuPG cannot be used here, or undefined if it is present and can create a key of its own */
function findGnuPGProblem(): string | undefined {
	try {
		const version = spawnSync('gpg', ['--version'], { encoding: 'utf8', timeout: GPG_TIMEOUT_MS });
		const match = /gpg \(GnuPG\) ((\d+)\.(\d+)\S*)/.exec(version.stdout ?? '');
		if (version.status !== 0 || !match) return `no working gpg command was found (${explain(version)})`;
		const libgcrypt = /^libgcrypt (\S+)/m.exec(version.stdout)?.[1];
		installedGnuPG = `GnuPG ${match[1]}${libgcrypt ? ` with libgcrypt ${libgcrypt}` : ''}`;
		if (Number(match[2]) < 2 || (Number(match[2]) === 2 && Number(match[3]) < 1)) {
			return `${installedGnuPG} is older than 2.1`;
		}
		usesPosixPaths = /^Home: \//m.test(version.stdout);

		home = mkdtempSync(join(tmpdir(), 'pgpc-'));
		controlHome = mkdtempSync(join(tmpdir(), 'pgpc-'));
		const control = gpg(controlHome, ['--quick-gen-key', 'Control <control@example.com>', 'default', 'default', 'never']);
		return control.status === 0 ? undefined : `${installedGnuPG} could not generate a key (${explain(control)})`;
	} catch (error) {
		return `GnuPG could not be run (${error instanceof Error ? error.message : String(error)})`;
	}
}

/**
 * Has GnuPG do with a key of its own what the test asks of the app's key:
 * import the passphrase-protected secret key into another keyring, then decrypt
 * with it. Returns what went wrong, or undefined if this GnuPG manages it.
 */
function findControlProblem(index: number, algorithms: { primary: string; subkey: string }): string | undefined {
	const email = `control${index}@example.com`;

	const primary = gpg(controlHome, ['--quick-gen-key', `Control <${email}>`, algorithms.primary, 'cert', 'never']);
	if (primary.status !== 0) return `it could not generate one (${explain(primary)})`;
	const listing = gpg(controlHome, ['--list-keys', '--with-colons', email]);
	const fingerprint = /^fpr:{9}([0-9A-F]+):/m.exec(listing.stdout ?? '')?.[1];
	if (!fingerprint) return `it did not list the key it had just generated (${explain(listing)})`;
	const subkey = gpg(controlHome, ['--quick-add-key', fingerprint, algorithms.subkey, 'encr', 'never']);
	if (subkey.status !== 0) return `it could not add an encryption subkey (${explain(subkey)})`;

	const message = gpg(controlHome, ['--armor', '--trust-model', 'always', '--recipient', email, '--encrypt'], 'control');
	if (message.status !== 0) return `it could not encrypt to it (${explain(message)})`;
	const exported = gpg(controlHome, ['--armor', '--export-secret-keys', email]);
	if (exported.status !== 0 || !exported.stdout.includes('PRIVATE KEY BLOCK')) {
		return `it could not export the secret key (${explain(exported)})`;
	}

	const keyFile = join(home, `control${index}.asc`);
	writeFileSync(keyFile, exported.stdout);
	const imported = gpg(home, ['--import', gpgPath(keyFile)]);
	if (imported.status !== 0) return `it could not import the secret key again (${explain(imported)})`;
	const messageFile = join(home, `control-message${index}.asc`);
	writeFileSync(messageFile, message.stdout);
	const decrypted = gpg(home, ['--decrypt', gpgPath(messageFile)]);
	if (decrypted.status !== 0 || decrypted.stdout !== 'control') {
		return `it could not decrypt with the key once it had been imported (${explain(decrypted)})`;
	}
	return undefined;
}

const gnupgProblem = findGnuPGProblem();

// The tests below are skipped from inside, not with describe.skipIf: a suite
// skipped as a whole never runs this, and would leave the keyrings and their
// gpg-agent processes behind
afterAll(() => {
	for (const homedir of [home, controlHome]) {
		if (!homedir) continue;
		spawnSync('gpgconf', ['--homedir', gpgPath(homedir), '--kill', 'all'], { timeout: GPG_TIMEOUT_MS });
		rmSync(homedir, { recursive: true, force: true, maxRetries: 3 });
	}
});

// `gnupg` names the same kind of key pair in GnuPG's terms, for the control
const keyTypes: Array<{ label: string; options: Partial<KeyGenOptions>; gnupg: { primary: string; subkey: string } }> = [
	{
		label: 'the default Curve25519 key',
		options: { keyType: 'ecc', curve: 'curve25519' },
		gnupg: { primary: 'ed25519', subkey: 'cv25519' }
	},
	{
		label: 'a NIST P-256 key',
		options: { keyType: 'ecc', curve: 'nistP256' },
		gnupg: { primary: 'nistp256', subkey: 'nistp256' }
	},
	{
		label: 'an RSA key',
		options: { keyType: 'rsa', rsaBits: 2048 },
		gnupg: { primary: 'rsa2048', subkey: 'rsa2048' }
	}
];

describe('GnuPG interoperability', () => {
	for (const [index, { label, options, gnupg }] of keyTypes.entries()) {
		it(`should exchange messages with GnuPG using ${label}`, async ({ skip, annotate }) => {
			if (gnupgProblem) {
				const note = `Not checked against GnuPG: ${label}. Here, ${gnupgProblem}.`;
				// Quiet on a developer's machine, where GnuPG is optional
				if (process.env.CI) await annotate(note, 'warning');
				skip(note);
			}

			const controlProblem = findControlProblem(index, gnupg);
			if (controlProblem) {
				const note =
					`Not checked against GnuPG: ${label}. ${installedGnuPG} failed the same steps with a key ` +
					`of that type that it generated itself: ${controlProblem}.`;
				// Shown as a warning on the GitHub run, so lost coverage is not silent
				await annotate(note, 'warning');
				skip(note);
			}
			// From here on GnuPG is known to cope with this type of key, so any
			// failure is about what the app produced
			const about = (result: SpawnSyncReturns<string>) => `${installedGnuPG}: ${explain(result)}`;

			const email = `interop${index}@example.com`;
			const generated = await generateKeyPair({
				name: 'Interop Test',
				email,
				passphrase: PASSPHRASE,
				keyType: 'ecc',
				...options
			});
			expect(generated.success).toBe(true);
			const { publicKey, privateKey } = generated.data!;

			// GnuPG can import the secret key the app generated
			const keyFile = join(home, `key${index}.asc`);
			writeFileSync(keyFile, privateKey);
			const imported = gpg(home, ['--import', gpgPath(keyFile)]);
			expect(imported.status, about(imported)).toBe(0);
			const secretKeys = gpg(home, ['--list-secret-keys', '--with-colons', email]);
			expect(secretKeys.stdout).toContain(email);

			// GnuPG can decrypt a message the app encrypted to that key
			const fromApp = await encryptMessage('from the app', publicKey);
			const messageFile = join(home, `message${index}.asc`);
			writeFileSync(messageFile, fromApp.data!);
			const decryptedByGnuPG = gpg(home, ['--decrypt', gpgPath(messageFile)]);
			expect(decryptedByGnuPG.status, about(decryptedByGnuPG)).toBe(0);
			expect(decryptedByGnuPG.stdout).toBe('from the app');

			// The app can decrypt a message GnuPG encrypted to that key
			const fromGnuPG = gpg(home, ['--armor', '--trust-model', 'always', '--recipient', email, '--encrypt'], 'from gnupg');
			expect(fromGnuPG.status, about(fromGnuPG)).toBe(0);
			const decryptedByApp = await decryptMessage(fromGnuPG.stdout, privateKey, PASSPHRASE);
			expect(decryptedByApp.error).toBeUndefined();
			expect(decryptedByApp.data).toBe('from gnupg');
		}, 120_000);
	}
});
