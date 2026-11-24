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
	/** Creation date as YYYY-MM-DD */
	created: string;
	/** True when the pasted block is a private key */
	isPrivate: boolean;
	/** Why the key cannot be used for its purpose, if it cannot */
	problem?: string;
}

/**
 * What text would bring to a box of public keys that already lists some:
 * - new-key: a key that the box does not hold
 * - new-details: no further key, but something the box does not hold about one of its keys, such as a revocation
 * - private-key: a private key, whatever else comes with it
 * - nothing-new: nothing that the box does not hold
 * - unreadable: the box with the text added cannot be read as keys
 */
export type AdditionOutcome =
	'new-key' | 'new-details' | 'private-key' | 'nothing-new' | 'unreadable';

/** What became of text that was offered to a box of keys */
export interface Addition {
	/** What the text would bring */
	outcome: AdditionOutcome;
	/** What the box is to hold now. The text is in it only if it brought something. */
	box: string;
}

/** One part of a key: the key itself, a user ID, a user attribute or a subkey */
interface KeyPart {
	/** The packet that holds the part */
	packet: AnyPacket;
	/** Every signature about the part, each one once, under its own bytes */
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
/** Named in both the first and the last line of a private key block, so found when one of them is lost */
const PRIVATE_KEY_BLOCK_NAME = 'PGP PRIVATE KEY BLOCK';

/** The library's settings for asking a key whether it can do a job. Those calls take the whole set or none. */
export const KEY_CHECK_CONFIG = { ...defaultConfig, ...KEY_USE_SETTINGS };

/** The library's settings for asking a key whether it can do a job. Those calls take the whole set or none. */
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
 * one after another. Copies of one key are joined into one key, so that what
 * any copy says about the key counts, wherever that copy stands.
 * @param armoredKeys - Text containing one or more armored PGP keys
 * @returns The parsed keys, one for each fingerprint, in the order they were first pasted
 * @throws If the text does not contain a readable PGP key
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
 * Adds text to a box that already lists keys, if the text brings a key or says
 * more about a listed one: a revoked copy of that key, for one. Any other text
 * stays out of the box, where it would sit unseen behind the list of keys.
 * @param held - What the box holds
 * @param text - The text to add
 * @returns What the text would bring, and what the box is to hold now
 */
export async function addToKeys(held: string, text: string): Promise<Addition> {
	const extended = appendBlock(held, text);
	// A private key block that cannot be read is passed over when the box is
	// read, so only its name gives it away. It still holds the secret part.
	const outcome = text.includes(PRIVATE_KEY_BLOCK_NAME)
		? 'private-key'
		: await judgeAddition(held, extended);
	const isKept = outcome === 'new-key' || outcome === 'new-details';
	return { outcome, box: isKept ? extended : held };
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
	return decryptKey({ privateKey, passphrase, config: KEY_USE_SETTINGS });
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

/**
 * Joins the copies of one key into one key that holds every signature any of
 * them holds. Copies can differ: a later one can carry a revocation, a new
 * expiry date or a new subkey. Using the first copy alone would lose what the
 * others say.
 *
 * No signature is checked here. OpenPGP.js checks each one whenever it uses
 * the key, so a signature that the owner did not make is carried along and
 * never counts. A signature that the library cannot write, or cannot read
 * back as it wrote it, is not carried along: the key is then not read, or it
 * is read without that signature. Records dated the same second are told
 * apart only by where they stand, so there the order of the copies still
 * decides.
 *
 * The library's own Key.update is not used, because it leaves signatures out:
 * it keeps one binding signature for a subkey without checking it, and it
 * turns away every further revocation once a key holds one.
 *
 * A key that came once is built again too, so that a key reads the same
 * however many copies of it there are.
 * @param copies - Every copy of one key, in the order they were read
 * @returns The joined key, or the first private copy if there is one
 */
async function joinCopies(copies: Key[]): Promise<Key> {
	// A private key is refused wherever a public one belongs, whatever else is
	// known about it, and it must stay private for the pages to see that
	const privateCopy = copies.find((copy) => copy.isPrivate());
	if (privateCopy) {
		return privateCopy;
	}

	const parts = fileParts(copies);
	const packets = new PacketList<AnyPacket>();
	for (const part of parts.values()) {
		packets.push(part.packet, ...part.signatures.values());
	}
	// The key is read again from the bytes that were compared. The library keeps
	// a number as it was pasted, leading zeros and all, checks it in that form
	// and writes it without them. Two signatures with the same bytes could
	// otherwise differ in what the library makes of them, and one that fails its
	// check could stand in for one that passes.
	const joined = await readKey({ binaryKey: packets.write() });
	// The library does not always read a part as it wrote it: each time it reads
	// a user ID it drops a byte order mark from the front. A part that changed
	// can now equal another part, and the library keeps the two apart, each with
	// its own signatures: a revoked user ID beside itself unrevoked. No honest
	// key is written that way, so such a key is not read.
	if (fileParts([joined]).size !== parts.size) {
		throw new Error('A part of the key reads differently from its own bytes');
	}
	return joined;
}

/**
 * Files every packet of the copies of one key by the part it is about
 * @param copies - Copies of one key, none of them private
 * @returns The parts in the order they first came, each with its signatures
 */
function fileParts(copies: Key[]): Map<string, KeyPart> {
	const parts = new Map<string, KeyPart>();
	for (const copy of copies) {
		let part: KeyPart | undefined;
		// A key lists its parts in turn, each followed by the signatures about it
		for (const packet of copy.toPacketList()) {
			const bytes = packet.write().join(',');
			if (packet instanceof SignaturePacket) {
				part?.signatures.set(bytes, packet);
				continue;
			}
			// The same part of another copy has the same bytes. Its kind is named as
			// well, because a subkey can hold the bytes of the key itself, and a
			// user attribute those of a user ID.
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
 * Says what an addition to a box of keys would bring
 * @param held - What the box holds
 * @param extended - The same text with the addition after it
 * @returns What the addition brings
 */
async function judgeAddition(held: string, extended: string): Promise<AdditionOutcome> {
	try {
		const before = await readPublicKeys(held);
		const after = await readPublicKeys(extended);
		// A private key is refused wherever a public one belongs. Let in beside its
		// own public copy, it would take that copy's place and stop the page. Keys
		// keep the place they were first read in, so a key the addition brings
		// stands after every key the box held.
		if (after.some((key, index) => key.isPrivate() && !before.at(index)?.isPrivate())) {
			return 'private-key';
		}
		if (after.length > before.length) {
			return 'new-key';
		}
		// Whole keys are compared, not their summaries. A copy can change what a
		// key does and leave the summary as it was: one of two encryption subkeys
		// revoked, for one.
		const isChanged = after.some((key, index) => key.armor() !== before.at(index)?.armor());
		return isChanged ? 'new-details' : 'nothing-new';
	} catch {
		return 'unreadable';
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
	// A key that is valid but of a kind the library no longer accepts: every
	// signature it made will be turned away, so say so before the user tries
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
