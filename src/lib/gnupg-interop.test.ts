// Checks that keys and messages made by this app work with a real GnuPG, and
// the other way round. The unit tests only prove OpenPGP.js agrees with itself;
// this is the test that would have caught keys GnuPG cannot import.
//
// It runs wherever a working GnuPG 2.1 or later is on the PATH (GitHub's Linux
// runners have one) and is skipped everywhere else.

import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPair, type KeyGenOptions } from './keygen';
import { encryptMessage } from './encryption';
import { decryptMessage } from './decryption';

const PASSPHRASE = 'interop-test-passphrase';
const GPG_TIMEOUT_MS = 30_000;

let home: string | undefined;
// The GnuPG bundled with Git for Windows expects POSIX-style paths (/c/Users/...)
let usesPosixPaths = false;

/** Converts a path into the form the installed GnuPG understands */
function gpgPath(path: string): string {
	if (process.platform !== 'win32' || !usesPosixPaths) return path;
	return path.replace(/^([A-Za-z]):/, (_match, drive: string) => `/${drive.toLowerCase()}`).replace(/\\/g, '/');
}

function gpg(args: string[], input?: string) {
	return spawnSync(
		'gpg',
		['--homedir', gpgPath(home ?? ''), '--batch', '--no-tty', '--yes', '--pinentry-mode', 'loopback', '--passphrase', PASSPHRASE, ...args],
		{ input, encoding: 'utf8', timeout: GPG_TIMEOUT_MS }
	);
}

/** True only if GnuPG is present and can create and use a key of its own here */
function isGnuPGUsable(): boolean {
	try {
		const version = spawnSync('gpg', ['--version'], { encoding: 'utf8', timeout: GPG_TIMEOUT_MS });
		const match = /gpg \(GnuPG\) (\d+)\.(\d+)/.exec(version.stdout ?? '');
		if (version.status !== 0 || !match) return false;
		if (Number(match[1]) < 2 || (Number(match[1]) === 2 && Number(match[2]) < 1)) return false;
		usesPosixPaths = /^Home: \//m.test(version.stdout);

		home = mkdtempSync(join(tmpdir(), 'pgpc-'));
		const control = gpg(['--quick-gen-key', 'Control <control@example.com>', 'default', 'default', 'never']);
		return control.status === 0;
	} catch {
		return false;
	}
}

const gnupgUsable = isGnuPGUsable();

afterAll(() => {
	if (!home) return;
	spawnSync('gpgconf', ['--homedir', gpgPath(home), '--kill', 'all'], { timeout: GPG_TIMEOUT_MS });
	rmSync(home, { recursive: true, force: true, maxRetries: 3 });
});

const keyTypes: Array<{ label: string; options: Partial<KeyGenOptions> }> = [
	{ label: 'the default Curve25519 key', options: { keyType: 'ecc', curve: 'curve25519' } },
	{ label: 'a NIST P-256 key', options: { keyType: 'ecc', curve: 'nistP256' } },
	{ label: 'an RSA key', options: { keyType: 'rsa', rsaBits: 2048 } }
];

describe.skipIf(!gnupgUsable)('GnuPG interoperability', () => {
	for (const [index, { label, options }] of keyTypes.entries()) {
		it(`should exchange messages with GnuPG using ${label}`, async () => {
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
			const keyFile = join(home!, `key${index}.asc`);
			writeFileSync(keyFile, privateKey);
			const imported = gpg(['--import', gpgPath(keyFile)]);
			expect(imported.status, imported.stderr).toBe(0);
			const secretKeys = gpg(['--list-secret-keys', '--with-colons', email]);
			expect(secretKeys.stdout).toContain(email);

			// GnuPG can decrypt a message the app encrypted to that key
			const fromApp = await encryptMessage('from the app', publicKey);
			const messageFile = join(home!, `message${index}.asc`);
			writeFileSync(messageFile, fromApp.data!);
			const decryptedByGnuPG = gpg(['--decrypt', gpgPath(messageFile)]);
			expect(decryptedByGnuPG.status, decryptedByGnuPG.stderr).toBe(0);
			expect(decryptedByGnuPG.stdout).toBe('from the app');

			// The app can decrypt a message GnuPG encrypted to that key
			const fromGnuPG = gpg(['--armor', '--trust-model', 'always', '--recipient', email, '--encrypt'], 'from gnupg');
			expect(fromGnuPG.status, fromGnuPG.stderr).toBe(0);
			const decryptedByApp = await decryptMessage(fromGnuPG.stdout, privateKey, PASSPHRASE);
			expect(decryptedByApp.error).toBeUndefined();
			expect(decryptedByApp.data).toBe('from gnupg');
		}, 60_000);
	}
});
