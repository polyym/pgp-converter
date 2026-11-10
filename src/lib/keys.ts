import { readKeys, config as defaultConfig, type Key } from 'openpgp';
import { normaliseArmor, splitKeyBlocks } from './armor';

export interface KeyInfo {
	/** User IDs on the key, for example "Ada Lovelace <ada@example.com>" */
	userIDs: string[];
	/** Fingerprint in upper case, grouped in blocks of four */
	fingerprint: string;
	/** Short algorithm label, for example "Curve25519" or "RSA 4096" */
	algorithm: string;
	/** Creation date as YYYY-MM-DD */
	created: string;
	/** True when the pasted block is a private key */
	isPrivate: boolean;
	/** Why the key cannot be used for encryption, if it cannot */
	problem?: string;
}

export const PRIVATE_KEY_PROBLEM =
	"This is a private key. Use the recipient's public key instead, and never share a private key.";

const CURVE_LABELS: Record<string, string> = {
	ed25519Legacy: 'Curve25519',
	curve25519Legacy: 'Curve25519',
	nistP256: 'NIST P-256',
	nistP384: 'NIST P-384',
	nistP521: 'NIST P-521'
};

/**
 * Formats a key fingerprint for reading aloud or comparing by eye
 * @param hex - The fingerprint as a hexadecimal string
 * @returns The fingerprint in upper case, in space-separated blocks of four
 */
export function formatFingerprint(hex: string): string {
	return (hex.toUpperCase().match(/.{1,4}/g) ?? []).join(' ');
}

/** Builds a short, human-readable label for a key's algorithm */
function describeAlgorithm(key: Key): string {
	const info = key.getAlgorithmInfo();
	if (info.algorithm.startsWith('rsa')) return info.bits ? `RSA ${info.bits}` : 'RSA';
	if (info.algorithm === 'ed25519' || info.algorithm === 'x25519') return 'Curve25519';
	if (info.curve) return CURVE_LABELS[info.curve] ?? info.curve;
	return info.algorithm;
}

/** Explains why a key cannot be encrypted to, or returns undefined if it can */
async function findEncryptionProblem(key: Key): Promise<string | undefined> {
	if (key.isPrivate()) return PRIVATE_KEY_PROBLEM;
	try {
		await key.getEncryptionKey(undefined, undefined, undefined, {
			...defaultConfig,
			allowMissingKeyFlags: true
		});
		return undefined;
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : String(e);
		if (/expired/i.test(message)) return 'This key has expired.';
		if (/revoked/i.test(message)) return 'This key has been revoked by its owner.';
		return 'This key cannot be used for encryption.';
	}
}

/**
 * Reads every public key in a pasted block of text.
 * Tolerates indentation and email quoting, and accepts several keys pasted
 * one after another. Duplicate keys are returned once.
 * @param armoredKeys - Text containing one or more armored PGP keys
 * @returns The parsed keys, in the order they were pasted
 * @throws If the text does not contain a readable PGP key
 */
export async function readPublicKeys(armoredKeys: string): Promise<Key[]> {
	const blocks = splitKeyBlocks(normaliseArmor(armoredKeys));
	const parsed = await Promise.all(blocks.map((block) => readKeys({ armoredKeys: block })));
	const seen = new Set<string>();
	return parsed.flat().filter((key) => {
		const fingerprint = key.getFingerprint();
		if (seen.has(fingerprint)) return false;
		seen.add(fingerprint);
		return true;
	});
}

/**
 * Summarises a key so the user can check whose it is before relying on it
 * @param key - A parsed OpenPGP key
 * @returns The key's identity, fingerprint, algorithm and any problem with using it
 */
export async function describeKey(key: Key): Promise<KeyInfo> {
	return {
		userIDs: key.getUserIDs(),
		fingerprint: formatFingerprint(key.getFingerprint()),
		algorithm: describeAlgorithm(key),
		created: key.getCreationTime().toISOString().slice(0, 10),
		isPrivate: key.isPrivate(),
		problem: await findEncryptionProblem(key)
	};
}

/**
 * Describes every key in a pasted block of text without throwing.
 * Used to show recipients while the user is still typing or pasting.
 * @param armoredKeys - Text that may contain one or more armored PGP keys
 * @returns Details of each readable key; an empty list if none can be read yet
 */
export async function inspectPublicKeys(armoredKeys: string): Promise<KeyInfo[]> {
	try {
		const keys = await readPublicKeys(armoredKeys);
		return await Promise.all(keys.map(describeKey));
	} catch {
		return [];
	}
}
