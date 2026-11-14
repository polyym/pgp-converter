import {
	readKeys,
	readPrivateKey,
	decryptKey,
	config as defaultConfig,
	type Key,
	type PrivateKey
} from 'openpgp';
import { normaliseArmor, splitKeyBlocks } from './armor.ts';
import { WEAK_KEY_PATTERN, type ErrorStage } from './errors.ts';

/** What a pasted key is about to be used for, which decides what counts as a problem with it */
export type KeyPurpose = 'encrypt' | 'decrypt' | 'sign' | 'verify';

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
	/** Why the key cannot be used for its purpose, if it cannot */
	problem?: string;
}

export const PRIVATE_KEY_PROBLEM =
	"This is a private key. Use the recipient's public key instead, and never share a private key.";
export const PRIVATE_KEY_AS_SENDER_PROBLEM =
	"This is a private key. Checking a signature needs the sender's public key; never paste or share a private key.";
export const PUBLIC_KEY_AS_SIGNER_PROBLEM =
	'This is a public key. Signing needs your own private key.';
export const PUBLIC_KEY_AS_READER_PROBLEM =
	'This is a public key. Decrypting needs your own private key.';
export const WEAK_KEY_PROBLEM =
	'This key is of an old kind that is no longer considered safe (DSA, ElGamal, or RSA under 2048 bits).';
export const WEAK_VERIFYING_KEY_PROBLEM = `${WEAK_KEY_PROBLEM} Its signatures cannot be relied on.`;

const PRIVATE_KEY_HEADER = '-----BEGIN PGP PRIVATE KEY BLOCK-----';

/** Names for the older algorithms, which the library reports in lower case */
const ALGORITHM_LABELS: Record<string, string> = {
	dsa: 'DSA',
	elgamal: 'ElGamal'
};

const CURVE_LABELS: Record<string, string> = {
	ed25519Legacy: 'Curve25519',
	curve25519Legacy: 'Curve25519',
	nistP256: 'NIST P-256',
	nistP384: 'NIST P-384',
	nistP521: 'NIST P-521'
};

/** Thrown when a protected private key is used without its passphrase */
export class PassphraseRequiredError extends Error {
	constructor() {
		super('Passphrase required');
		this.name = 'PassphraseRequiredError';
	}
}

const problemFinders: Record<KeyPurpose, (key: Key) => Promise<string | undefined>> = {
	encrypt: findEncryptionProblem,
	decrypt: findDecryptionProblem,
	sign: findSigningProblem,
	verify: findVerificationProblem
};

/**
 * Formats a key fingerprint for reading aloud or comparing by eye
 * @param hex - The fingerprint as a hexadecimal string
 * @returns The fingerprint in upper case, in space-separated blocks of four
 */
export function formatFingerprint(hex: string): string {
	return (hex.toUpperCase().match(/.{1,4}/g) ?? []).join(' ');
}

/**
 * Reads every key in a pasted block of text.
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
		if (seen.has(fingerprint)) {
			return false;
		}
		seen.add(fingerprint);
		return true;
	});
}

/**
 * Reads a private key and unlocks it if it is protected by a passphrase
 * @param armoredPrivateKey - Text containing an armored PGP private key
 * @param passphrase - The key's passphrase; ignored if the key is not protected
 * @param onStage - Told which step is running, so a failure can name the input at fault
 * @returns The private key, ready to decrypt or sign
 * @throws PassphraseRequiredError if the key is protected and no passphrase was given
 */
export async function readUsablePrivateKey(
	armoredPrivateKey: string,
	passphrase: string,
	onStage?: (stage: ErrorStage) => void
): Promise<PrivateKey> {
	onStage?.('private-key');
	const privateKey = await readPrivateKey({ armoredKey: pickPrivateKeyBlock(armoredPrivateKey) });

	onStage?.('passphrase');
	// A key exported without a passphrase is already unlocked; asking the library
	// to unlock it again fails, so only do so when the key is protected.
	if (privateKey.isDecrypted()) {
		return privateKey;
	}
	if (!passphrase) {
		throw new PassphraseRequiredError();
	}
	return decryptKey({ privateKey, passphrase });
}

/**
 * Summarises a key so the user can check whose it is before relying on it
 * @param key - A parsed OpenPGP key
 * @param purpose - What the key is about to be used for
 * @returns The key's identity, fingerprint, algorithm and any problem with using it
 */
export async function describeKey(key: Key, purpose: KeyPurpose = 'encrypt'): Promise<KeyInfo> {
	return {
		userIDs: key.getUserIDs(),
		fingerprint: formatFingerprint(key.getFingerprint()),
		algorithm: describeAlgorithm(key),
		created: key.getCreationTime().toISOString().slice(0, 10),
		isPrivate: key.isPrivate(),
		problem: await problemFinders[purpose](key)
	};
}

/**
 * Describes every key in a pasted block of text without throwing.
 * Used to show whose keys they are while the user is still typing or pasting.
 * @param armoredKeys - Text that may contain one or more armored PGP keys
 * @param purpose - What the keys are about to be used for
 * @returns Details of each readable key; an empty list if none can be read yet
 */
export async function inspectKeys(armoredKeys: string, purpose: KeyPurpose): Promise<KeyInfo[]> {
	try {
		// Someone signing or decrypting pastes one private key, possibly inside the "both keys" file
		const isOwnKey = purpose === 'sign' || purpose === 'decrypt';
		const keys = await readPublicKeys(isOwnKey ? pickPrivateKeyBlock(armoredKeys) : armoredKeys);
		return await Promise.all(keys.map((key) => describeKey(key, purpose)));
	} catch {
		return [];
	}
}

/** Builds a short, human-readable label for a key's algorithm */
function describeAlgorithm(key: Key): string {
	const info = key.getAlgorithmInfo();
	if (info.algorithm.startsWith('rsa')) {
		return info.bits ? `RSA ${String(info.bits)}` : 'RSA';
	}
	if (info.algorithm === 'ed25519' || info.algorithm === 'x25519') {
		return 'Curve25519';
	}
	if (info.curve) {
		return CURVE_LABELS[info.curve] ?? info.curve;
	}
	return ALGORITHM_LABELS[info.algorithm] ?? info.algorithm;
}

/** Explains why a key cannot be encrypted to, or returns undefined if it can */
async function findEncryptionProblem(key: Key): Promise<string | undefined> {
	if (key.isPrivate()) {
		return PRIVATE_KEY_PROBLEM;
	}
	try {
		await key.getEncryptionKey(undefined, undefined, undefined, {
			...defaultConfig,
			allowMissingKeyFlags: true
		});
		return undefined;
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : String(e);
		if (/expired/i.test(message)) {
			return 'This key has expired.';
		}
		if (/revoked/i.test(message)) {
			return 'This key has been revoked by its owner.';
		}
		if (WEAK_KEY_PATTERN.test(message)) {
			return WEAK_KEY_PROBLEM;
		}
		return 'This key cannot be used for encryption.';
	}
}

/** Explains why a key cannot decrypt, or returns undefined if it can */
function findDecryptionProblem(key: Key): Promise<string | undefined> {
	// Whether it is the right key for a given message is only known once decryption is tried
	return Promise.resolve(key.isPrivate() ? undefined : PUBLIC_KEY_AS_READER_PROBLEM);
}

/** Explains why a key cannot sign, or returns undefined if it can */
async function findSigningProblem(key: Key): Promise<string | undefined> {
	if (!key.isPrivate()) {
		return PUBLIC_KEY_AS_SIGNER_PROBLEM;
	}
	try {
		await key.getSigningKey();
		return undefined;
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : String(e);
		if (/expired/i.test(message)) {
			return 'This key has expired, so it can no longer sign.';
		}
		if (/revoked/i.test(message)) {
			return 'This key has been revoked, so it can no longer sign.';
		}
		if (WEAK_KEY_PATTERN.test(message)) {
			return WEAK_KEY_PROBLEM;
		}
		return 'This key cannot be used for signing.';
	}
}

/** Explains why a key is a poor choice for checking signatures, or returns undefined if it is fine */
async function findVerificationProblem(key: Key): Promise<string | undefined> {
	if (key.isPrivate()) {
		return PRIVATE_KEY_AS_SENDER_PROBLEM;
	}
	try {
		await key.verifyPrimaryKey();
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : String(e);
		if (/expired/i.test(message)) {
			return 'This key has expired. Only signatures made before it expired can be valid.';
		}
		if (/revoked/i.test(message)) {
			return 'This key has been revoked by its owner. Its signatures should not be trusted.';
		}
		return 'This key cannot be used to check signatures.';
	}
	// A key that is valid but of a kind the library no longer accepts: every
	// signature it made will be turned away, so say so before the user tries
	try {
		await key.getSigningKey();
	} catch (e: unknown) {
		if (WEAK_KEY_PATTERN.test(e instanceof Error ? e.message : String(e))) {
			return WEAK_VERIFYING_KEY_PROBLEM;
		}
	}
	return undefined;
}

/**
 * Picks the private key out of pasted text that may hold other blocks too.
 * The "Download Both Keys" file from the generate page puts the public key
 * first, and the library would otherwise read only that one.
 * @param text - Raw text pasted into a private key box
 * @returns The private key block if there is one, otherwise the cleaned-up text
 */
function pickPrivateKeyBlock(text: string): string {
	const normalised = normaliseArmor(text);
	return (
		splitKeyBlocks(normalised).find((block) => block.startsWith(PRIVATE_KEY_HEADER)) ?? normalised
	);
}
