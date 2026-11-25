import {
	PacketList,
	SignaturePacket,
	UserAttributePacket,
	UserIDPacket,
	readKey,
	readKeys,
	readPrivateKey,
	decryptKey,
	config as defaultConfig,
	type AnyPacket,
	type Key,
	type PrivateKey
} from 'openpgp';
import { normaliseArmor, splitKeyBlocks } from './armor.ts';
import { KEY_USE_SETTINGS } from './constants.ts';
import { WEAK_KEY_PATTERN, type ErrorStage } from './errors.ts';
import { appendBlock } from './text-entry.ts';

/** What a pasted key is about to be used for, which decides what counts as a problem with it */
export type KeyPurpose = 'encrypt' | 'decrypt' | 'sign' | 'verify';

export interface KeyInfo {
	/** User IDs on the key, for example "Ada Lovelace <ada@example.com>" */
	userIDs: string[];
	/** Fingerprint in upper case, grouped in blocks of four */
	fingerprint: string;
	/** Short algorithm label, for example "Curve25519" or "RSA 4096" */
	algorithm: string;
	/** Creation date as YYYY-MM-DD, in UTC */
	created: string;
	isPrivate: boolean;
	/** User-facing reason the key is unfit for the purpose it was checked for; undefined if fit */
	problem?: string;
}

/**
 * What appending text to a public key field that already holds keys would do:
 * - new-key: adds a key whose fingerprint the field does not hold
 * - new-details: adds no key, but changes one the field holds, for example with a revocation
 * - private-key: the text contains a private key, whatever else it holds
 * - nothing-new: adds nothing the field does not already hold
 * - unreadable: the field with the text appended no longer parses as keys
 */
export type AdditionOutcome =
	'new-key' | 'new-details' | 'private-key' | 'nothing-new' | 'unreadable';

/** The result of addToKeys */
export interface Addition {
	outcome: AdditionOutcome;
	/** The new field value: `held` with the text appended for new-key and new-details, else `held` */
	box: string;
}

/** A key component (primary key, user ID, user attribute or subkey) and its signatures */
interface KeyPart {
	packet: AnyPacket;
	/** Keyed by the serialised signature packet, so a duplicate signature is stored once */
	signatures: Map<string, SignaturePacket>;
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
/** In both the BEGIN and the END armour line, so it still matches when one of them is missing */
const PRIVATE_KEY_BLOCK_NAME = 'PGP PRIVATE KEY BLOCK';

/**
 * KEY_USE_SETTINGS spread over the OpenPGP.js defaults. Key methods such as
 * getSigningKey and getEncryptionKey use their config argument as given,
 * without merging in the defaults, so they need a complete config.
 */
export const KEY_CHECK_CONFIG = { ...defaultConfig, ...KEY_USE_SETTINGS };

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

/** Upper-cases a hex fingerprint and splits it into space-separated groups of four. */
export function formatFingerprint(hex: string): string {
	return (hex.toUpperCase().match(/.{1,4}/g) ?? []).join(' ');
}

/**
 * Parses every armoured key in pasted text, after normaliseArmor has removed
 * indentation and email quoting. Copies of one key (same fingerprint) are
 * merged, so a revocation or a newer self-signature in any copy applies. A
 * private key is returned as it is, so that callers can reject it.
 * @returns One key per fingerprint, in the order each was first pasted
 * @throws If the text holds no key, a key block fails to parse, or a merged key
 *   does not survive being written and parsed again (see joinCopies)
 */
export async function readPublicKeys(armoredKeys: string): Promise<Key[]> {
	const blocks = splitKeyBlocks(normaliseArmor(armoredKeys));
	const parsed = await Promise.all(blocks.map((block) => readKeys({ armoredKeys: block })));
	const copiesOf = new Map<string, Key[]>();
	for (const key of parsed.flat()) {
		const fingerprint = key.getFingerprint();
		copiesOf.set(fingerprint, [...(copiesOf.get(fingerprint) ?? []), key]);
	}
	return Promise.all(Array.from(copiesOf.values(), (copies) => joinCopies(copies)));
}

/**
 * Appends pasted text to a public key field's value when it adds a key or
 * changes one the field holds (with a revocation, for example). Other text is
 * left out, because the field is shown as a list of keys and the text would be
 * hidden behind it. Never throws: text that does not parse gives 'unreadable'.
 * @param held - The field's current value
 */
export async function addToKeys(held: string, text: string): Promise<Addition> {
	const extended = appendBlock(held, text);
	// Match the armour name instead of parsing: splitKeyBlocks skips a private key
	// block that has lost its BEGIN or END line, but the text still holds the secret key.
	const outcome = text.includes(PRIVATE_KEY_BLOCK_NAME)
		? 'private-key'
		: await judgeAddition(held, extended);
	const isKept = outcome === 'new-key' || outcome === 'new-details';
	return { outcome, box: isKept ? extended : held };
}

/**
 * Parses the private key in pasted text, which may also hold the public key,
 * and decrypts it with the passphrase if it is protected.
 * @param passphrase - Ignored when the key is not protected
 * @param onStage - Called with 'private-key' before parsing and 'passphrase' before
 *   decrypting, so the caller can tell which input a later error is about
 * @throws PassphraseRequiredError if the key is protected and the passphrase is
 *   empty; the OpenPGP.js error if the key does not parse or the passphrase is wrong
 */
export async function readUsablePrivateKey(
	armoredPrivateKey: string,
	passphrase: string,
	onStage?: (stage: ErrorStage) => void
): Promise<PrivateKey> {
	onStage?.('private-key');
	const privateKey = await readPrivateKey({ armoredKey: pickPrivateKeyBlock(armoredPrivateKey) });

	onStage?.('passphrase');
	// A key exported without a passphrase is not encrypted, and decryptKey throws on one
	if (privateKey.isDecrypted()) {
		return privateKey;
	}
	if (!passphrase) {
		throw new PassphraseRequiredError();
	}
	return decryptKey({ privateKey, passphrase, config: KEY_USE_SETTINGS });
}

/**
 * Summarises a key for display and checks whether it is fit for `purpose` at
 * the current time. `problem` holds the user-facing reason when it is not.
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
 * Runs describeKey on every key in pasted text, but returns an empty array
 * instead of throwing, because it runs on every edit while the input may be
 * incomplete. For 'sign' and 'decrypt' only the private key block is read, so
 * the combined key pair file from the Generate page shows one key.
 */
export async function inspectKeys(armoredKeys: string, purpose: KeyPurpose): Promise<KeyInfo[]> {
	try {
		const isOwnKey = purpose === 'sign' || purpose === 'decrypt';
		const keys = await readPublicKeys(isOwnKey ? pickPrivateKeyBlock(armoredKeys) : armoredKeys);
		return await Promise.all(keys.map((key) => describeKey(key, purpose)));
	} catch {
		return [];
	}
}

/**
 * Merges the copies of one key into a key that holds every component and every
 * distinct signature from all of them, so that a revocation, new expiry or new
 * subkey in any copy applies whatever order the copies were pasted in.
 * Signatures are not verified here: OpenPGP.js verifies them each time it uses
 * the key, so a forged one is carried along but never counts.
 *
 * Key.update is not used because it drops signatures: it keeps one subkey
 * binding signature without verifying it, and ignores further revocations once
 * the key has one. A key with a single copy is rebuilt too, so that one copy
 * and several give the same result. Where two self-signatures have the same
 * creation time, OpenPGP.js falls back to their position, so there the copy
 * order still decides.
 * @param copies - Every copy of one key, in the order they were parsed
 * @returns The merged key, or the first private copy if there is one
 */
async function joinCopies(copies: Key[]): Promise<Key> {
	// Return a private copy unmerged so that isPrivate() stays true: callers
	// reject a private key wherever a public key belongs
	const privateCopy = copies.find((copy) => copy.isPrivate());
	if (privateCopy) {
		return privateCopy;
	}

	const parts = fileParts(copies);
	const packets = new PacketList<AnyPacket>();
	for (const part of parts.values()) {
		packets.push(part.packet, ...part.signatures.values());
	}
	// Parse again from the serialised packets so each signature is the one its
	// bytes describe. OpenPGP.js keeps an MPI's leading zero bytes when parsing, and
	// enough of them make verification fail, but strips them when writing. So a
	// zero-padded copy of a revocation dedupes with the real one and could replace it.
	const joined = await readKey({ binaryKey: packets.write() });
	// OpenPGP.js strips one leading byte order mark from a user ID each time it
	// parses one, so parsing again can make two distinct user IDs equal, each with
	// its own signatures: a revoked user ID next to an unrevoked copy of itself.
	// A key whose components change when it is parsed again was crafted, so reject it.
	if (fileParts([joined]).size !== parts.size) {
		throw new Error('A part of the key reads differently from its own bytes');
	}
	return joined;
}

/**
 * Groups the packets of every copy by key component, deduplicating components
 * and signatures by their serialised bytes. Relies on the transferable key
 * packet order, where each component is followed by its own signatures
 * (RFC 9580 section 10.1: https://www.rfc-editor.org/rfc/rfc9580#section-10.1).
 * @param copies - Copies of one public key
 * @returns The components in first-seen order
 */
function fileParts(copies: Key[]): Map<string, KeyPart> {
	const parts = new Map<string, KeyPart>();
	for (const copy of copies) {
		let part: KeyPart | undefined;
		for (const packet of copy.toPacketList()) {
			const bytes = packet.write().join(',');
			if (packet instanceof SignaturePacket) {
				part?.signatures.set(bytes, packet);
				continue;
			}
			// write() returns the packet body without its tag, and a subkey can have
			// the same body as the primary key, or a user attribute the same body as
			// a user ID, so the kind is part of the identity.
			const kind =
				packet === copy.keyPacket
					? 'key'
					: packet instanceof UserIDPacket
						? 'user ID'
						: packet instanceof UserAttributePacket
							? 'user attribute'
							: 'subkey';
			const id = `${kind} ${bytes}`;
			part = parts.get(id) ?? { packet, signatures: new Map<string, SignaturePacket>() };
			parts.set(id, part);
		}
	}
	return parts;
}

/**
 * Classifies an addition by parsing the field before and after it. `extended`
 * is `held` with the addition appended.
 */
async function judgeAddition(held: string, extended: string): Promise<AdditionOutcome> {
	try {
		const before = await readPublicKeys(held);
		const after = await readPublicKeys(extended);
		// Reject a private key at any index that did not hold one before. Merging
		// returns the private copy of a key, so a private key pasted with its public
		// key takes that key's index, and a new key comes after every held one.
		if (after.some((key, index) => key.isPrivate() && !before.at(index)?.isPrivate())) {
			return 'private-key';
		}
		if (after.length > before.length) {
			return 'new-key';
		}
		// Compare the serialised keys, not describeKey summaries: revoking one of two
		// encryption subkeys changes the key but not its summary.
		const isChanged = after.some((key, index) => key.armor() !== before.at(index)?.armor());
		return isChanged ? 'new-details' : 'nothing-new';
	} catch {
		return 'unreadable';
	}
}

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
		await key.getEncryptionKey(undefined, undefined, undefined, KEY_CHECK_CONFIG);
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
		await key.getSigningKey(undefined, undefined, undefined, KEY_CHECK_CONFIG);
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
	// verifyPrimaryKey does not check key strength, but OpenPGP.js rejects every
	// signature from a weak key, so warn before the user tries to verify one
	try {
		await key.getSigningKey(undefined, undefined, undefined, KEY_CHECK_CONFIG);
	} catch (e: unknown) {
		if (WEAK_KEY_PATTERN.test(e instanceof Error ? e.message : String(e))) {
			return WEAK_VERIFYING_KEY_PROBLEM;
		}
	}
	return undefined;
}

/**
 * Returns the first private key block in pasted text, or the normalised text if
 * there is none. The combined key pair file from the Generate page puts the
 * public key first, and OpenPGP.js parses only the first armoured block.
 */
function pickPrivateKeyBlock(text: string): string {
	const normalised = normaliseArmor(text);
	return (
		splitKeyBlocks(normalised).find((block) => block.startsWith(PRIVATE_KEY_HEADER)) ?? normalised
	);
}
