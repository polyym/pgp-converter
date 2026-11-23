import {
	PacketList,
	PublicKey,
	armor,
	config,
	createCleartextMessage,
	enums,
	generateKey,
	readKey,
	readPrivateKey,
	revokeKey,
	sign,
	SecretKeyPacket,
	UserIDPacket,
	type AnyPacket,
	type Config,
	type PrivateKey,
	type SignaturePacket,
	type SubkeyOptions
} from 'openpgp';
import { MS_PER_DAY } from './constants.ts';

/**
 * The form a signature's sign method takes for a signature on a key: the
 * things to sign as an object, and the settings to sign under. The published
 * types leave it out.
 */
interface KeySignature {
	sign(
		key: SecretKeyPacket,
		data: object,
		date: Date | undefined,
		detached: boolean,
		config: Config
	): Promise<void>;
}

/** A private key and its public key, armored */
export interface ArmoredKeyPair {
	privateKey: string;
	publicKey: string;
}

/**
 * What the two parts of a key are to say about their use. Each is a set of
 * the library's key flags added together, or null for no flags at all.
 */
export interface KeyFlags {
	primary: number | null;
	subkey: number | null;
}

/** How long ago makeDatedKey says its keys were made. Later changes to such a key can then lie in the past as well. */
export const KEY_AGE_DAYS = 30;

/** The first byte of a signature packet that gives its length in the two bytes after it */
const SIGNATURE_PACKET_START = 0x89;

/**
 * How many zero bytes padRevocation puts in front of a number. One would not
 * do: about one number in 256 is a byte short of its full length, and with one
 * zero in front it is of full length and passes its check.
 */
const PADDING_BYTES = 8;
const BITS_PER_BYTE = 8;

/** The character that a byte order mark is read as */
const BYTE_ORDER_MARK = '\u{FEFF}';

/**
 * Hands back a value that a test expects to be there, and fails the test with
 * a plain message if it is not.
 * @param value - The value, which may be missing
 * @returns The same value, known to be present
 */
export function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error('A value the test relies on is missing');
	}
	return value;
}

/**
 * Makes a key pair that does not say what it may be used for, as keys made by
 * old software do not.
 * @param name - The name on the key
 * @returns The key pair, with no passphrase
 */
export async function makeKeyWithoutFlags(name: string): Promise<ArmoredKeyPair> {
	const { privateKey } = await generateKey({
		type: 'ecc',
		curve: 'curve25519Legacy',
		userIDs: [{ name }],
		format: 'armored'
	});
	return withKeyFlags(privateKey, { primary: null, subkey: null });
}

/**
 * Makes a key say something else about its use than the library wrote. The
 * library gives no way to do that, so the two signatures that carry the key
 * flags are changed and signed again.
 * @param armoredPrivateKey - A private key with no passphrase and one subkey
 * @param flags - What the main part of the key and its subkey are to say
 * @returns The changed key pair
 */
export async function withKeyFlags(
	armoredPrivateKey: string,
	flags: KeyFlags
): Promise<ArmoredKeyPair> {
	const privateKey = await readPrivateKey({ armoredKey: armoredPrivateKey });
	// A signature carries a random value that cannot be added a second time
	const settings = { ...config, nonDeterministicSignaturesViaNotation: false };
	const primary = secretPacketOf(privateKey);

	const signAgain = (signature: SignaturePacket, data: object) =>
		(signature as unknown as KeySignature).sign(
			primary,
			data,
			signature.created ?? undefined,
			false,
			settings
		);

	const user = must(privateKey.users.at(0));
	const certification = must(user.selfCertifications.at(0));
	certification.keyFlags = asFlagBytes(flags.primary);
	await signAgain(certification, { userID: user.userID, key: primary });

	const subkey = must(privateKey.subkeys.at(0));
	const binding = must(subkey.bindingSignatures.at(0));
	binding.keyFlags = asFlagBytes(flags.subkey);
	await signAgain(binding, { key: primary, bind: subkey.keyPacket });

	// Read back from its armored form, as a pasted key would be
	const key = await readPrivateKey({ armoredKey: privateKey.armor() });
	return { privateKey: key.armor(), publicKey: key.toPublic().armor() };
}

/**
 * Names a moment in the past, for a key or a signature that is to have been made then
 * @param days - How many days back
 * @returns That moment
 */
export function daysAgo(days: number): Date {
	return new Date(Date.now() - days * MS_PER_DAY);
}

/**
 * Makes a key that was created KEY_AGE_DAYS ago, so that its owner can have
 * changed it since: revoked it, moved its expiry date, replaced a subkey.
 * @param name - The name on the key
 * @param options - Subkeys other than the usual one, and how many seconds after its creation the key expires
 * @returns The private key, with no passphrase
 */
export async function makeDatedKey(
	name: string,
	options: { subkeys?: SubkeyOptions[]; keyExpirationTime?: number } = {}
): Promise<PrivateKey> {
	const { privateKey } = await generateKey({
		type: 'ecc',
		curve: 'curve25519Legacy',
		userIDs: [{ name }],
		date: daysAgo(KEY_AGE_DAYS),
		format: 'object',
		...options
	});
	return privateKey;
}

/**
 * Reads a private key again from its armored form, so that changing the copy
 * leaves the first one as it was.
 * @param key - The key to copy
 * @returns A key that shares nothing with the first
 */
export async function copyKey(key: PrivateKey): Promise<PrivateKey> {
	return readPrivateKey({ armoredKey: key.armor() });
}

/**
 * Hands back the secret part of a key's main packet, which signs every change to the key
 * @param key - A private key
 * @returns Its main packet
 */
export function secretPacketOf(key: PrivateKey): SecretKeyPacket {
	const packet = key.keyPacket;
	if (!(packet instanceof SecretKeyPacket)) {
		throw new TypeError('The key has no secret part to sign with');
	}
	return packet;
}

/**
 * Makes the public copy of a key that its owner gives out after revoking it
 * @param key - The private key, which is left as it was
 * @param flag - The reason given; that the key was stolen, if left out
 * @param date - When the key was revoked; now if left out
 * @returns The revoked public key, armored
 */
export async function revokedCopyOf(
	key: PrivateKey,
	flag = enums.reasonForRevocation.keyCompromised,
	date?: Date
): Promise<string> {
	const revoked = await revokeKey({ key, reasonForRevocation: { flag }, date, format: 'object' });
	return revoked.publicKey.armor();
}

/**
 * Signs a text as a message that anyone can read, at a given moment
 * @param text - The text to sign
 * @param key - The signer's private key
 * @param date - When the signature is to say it was made; now if left out
 * @returns The signed message
 */
export async function signAt(text: string, key: PrivateKey, date?: Date): Promise<string> {
	return sign({ message: await createCleartextMessage({ text }), signingKeys: key, date });
}

/**
 * Builds a public key from packets chosen by hand, as someone without the
 * private key can: they can leave packets out and move them, but not sign.
 * @param packets - The packets, the key's own first
 * @returns The key, armored
 */
export function armorPackets(packets: AnyPacket[]): string {
	return new PublicKey(listOf(packets)).armor();
}

/**
 * Makes a copy of a revoked key as anyone can make one without the private
 * key: the first number of its revocation is written with zero bytes in
 * front. The number is the same. OpenPGP.js keeps the bytes when it reads the
 * signature, fails the check on it, and writes the signature without them.
 * @param revokedKey - A revoked public key, armored
 * @returns The same key with the changed revocation, armored
 */
export async function padRevocation(revokedKey: string): Promise<string> {
	const key = await readKey({ armoredKey: revokedKey });
	const [keyPacket, revocation, ...rest] = key.toPacketList();
	const body = revocation.write();
	const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
	// The numbers follow two lists of subpackets, each behind its length, and two bytes of the hash
	const hashedEnd = 6 + view.getUint16(4);
	const numberAt = hashedEnd + 2 + view.getUint16(hashedEnd) + 2;
	const numberBits = view.getUint16(numberAt) + PADDING_BYTES * BITS_PER_BYTE;
	const padded = [
		...body.subarray(0, numberAt),
		numberBits >> 8,
		numberBits & 0xff,
		...new Uint8Array(PADDING_BYTES),
		...body.subarray(numberAt + 2)
	];
	return armor(
		enums.armor.publicKey,
		Uint8Array.of(
			...listOf([keyPacket]).write(),
			SIGNATURE_PACKET_START,
			padded.length >> 8,
			padded.length & 0xff,
			...padded,
			...listOf(rest).write()
		)
	);
}

/**
 * Makes a copy of a public key as anyone can make one without the private
 * key: every user ID is written with byte order marks in front. OpenPGP.js
 * drops one mark each time it reads a user ID. A user ID behind two marks is
 * another user ID when the key is read, and the key's own once that key is
 * written and read again.
 * @param publicKey - A public key, armored
 * @param marks - How many marks to write in front of each user ID
 * @returns The changed key, armored
 */
export async function markUserIDs(publicKey: string, marks: number): Promise<string> {
	const key = await readKey({ armoredKey: publicKey });
	return armorPackets(
		key
			.toPacketList()
			.map((packet) =>
				packet instanceof UserIDPacket
					? UserIDPacket.fromObject({ name: BYTE_ORDER_MARK.repeat(marks) + packet.userID })
					: packet
			)
	);
}

/**
 * Lists every order a few things can stand in
 * @param items - The things
 * @returns Each order once
 */
export function everyOrder<T>(items: T[]): T[][] {
	if (items.length <= 1) {
		return [items];
	}
	return items.flatMap((item, index) =>
		everyOrder(items.toSpliced(index, 1)).map((rest) => [item, ...rest])
	);
}

function asFlagBytes(flags: number | null): Uint8Array | null {
	return flags === null ? null : new Uint8Array([flags]);
}

function listOf(packets: AnyPacket[]): PacketList<AnyPacket> {
	const list = new PacketList<AnyPacket>();
	list.push(...packets);
	return list;
}
