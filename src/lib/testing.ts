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
 * SignaturePacket.sign in the form used for key signatures: the signed data as an
 * object (a user ID or subkey with the primary key) and a config. OpenPGP.js's
 * published types do not declare this form, so withKeyFlags casts to it.
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

/** A private key and its public key, both ASCII-armoured */
export interface ArmoredKeyPair {
	privateKey: string;
	publicKey: string;
}

/**
 * Key flags for the primary key's self-certification and for the subkey's binding
 * signature: a sum of enums.keyFlags values, or null to leave the subpacket out.
 */
export interface KeyFlags {
	primary: number | null;
	subkey: number | null;
}

/** Age of the keys makeDatedKey generates, so later changes can still be dated in the past */
export const KEY_AGE_DAYS = 30;

/**
 * Legacy-format packet header for a signature packet (tag 2) with a two-octet
 * length, RFC 9580 section 4.2.2
 */
const SIGNATURE_PACKET_START = 0x89;

/**
 * Zero bytes padRevocation puts in front of the signature's first MPI. One is not
 * enough: about one value in 256 has a leading zero byte and is stored a byte
 * short, and a single zero byte would bring it back to the full 32 bytes, which
 * verifies.
 */
const PADDING_BYTES = 8;
const BITS_PER_BYTE = 8;

const BYTE_ORDER_MARK = '\u{FEFF}';

/**
 * Returns `value` if it is neither null nor undefined, and throws otherwise.
 * Tests use it in place of a non-null assertion.
 */
export function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error('A value the test relies on is missing');
	}
	return value;
}

/**
 * Generates an unencrypted Curve25519 key pair whose self-certification and
 * subkey binding signature have no key flags subpacket, like keys from older
 * software.
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
 * Replaces the key flags on the first user ID's self-certification and on the
 * first subkey's binding signature, and signs both again; OpenPGP.js has no API
 * for this. Takes an unencrypted armoured private key with at least one user ID
 * and one subkey.
 */
export async function withKeyFlags(
	armoredPrivateKey: string,
	flags: KeyFlags
): Promise<ArmoredKeyPair> {
	const privateKey = await readPrivateKey({ armoredKey: armoredPrivateKey });
	// OpenPGP.js adds a random salt notation to each signature it makes. These
	// signatures already carry one, and it cannot be added a second time.
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

	// Read back from armour, as a pasted key would be
	const key = await readPrivateKey({ armoredKey: privateKey.armor() });
	return { privateKey: key.armor(), publicKey: key.toPublic().armor() };
}

/** Returns the time that many 24-hour days before now */
export function daysAgo(days: number): Date {
	return new Date(Date.now() - days * MS_PER_DAY);
}

/**
 * Generates an unencrypted Curve25519 key created KEY_AGE_DAYS ago, so a test can
 * revoke it, change its expiry or replace a subkey at a time that is still in
 * the past.
 * @param options - Passed to generateKey: `subkeys` replaces the default
 *   encryption subkey, and `keyExpirationTime` is in seconds after creation
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

/** Returns a deep copy of a private key, made by armouring it and reading it back */
export async function copyKey(key: PrivateKey): Promise<PrivateKey> {
	return readPrivateKey({ armoredKey: key.armor() });
}

/**
 * Returns the primary key's secret key packet, which signs changes to the key.
 * Throws a TypeError if there is none.
 */
export function secretPacketOf(key: PrivateKey): SecretKeyPacket {
	const packet = key.keyPacket;
	if (!(packet instanceof SecretKeyPacket)) {
		throw new TypeError('The key has no secret part to sign with');
	}
	return packet;
}

/**
 * Returns the armoured public key with a revocation signature, as its owner would
 * publish it. `key` is not changed. The reason defaults to key compromise and the
 * date to now.
 */
export async function revokedCopyOf(
	key: PrivateKey,
	flag = enums.reasonForRevocation.keyCompromised,
	date?: Date
): Promise<string> {
	const revoked = await revokeKey({ key, reasonForRevocation: { flag }, date, format: 'object' });
	return revoked.publicKey.armor();
}

/** Returns `text` as a cleartext signed message whose signature is dated `date`, or now */
export async function signAt(text: string, key: PrivateKey, date?: Date): Promise<string> {
	return sign({ message: await createCleartextMessage({ text }), signingKeys: key, date });
}

/**
 * Armours a public key built from the given packets, primary key packet first.
 * Tests use it to do what an attacker without the private key can: drop or
 * reorder packets, but not make new signatures.
 */
export function armorPackets(packets: AnyPacket[]): string {
	return new PublicKey(listOf(packets)).armor();
}

/**
 * Returns a copy of a revoked public key whose revocation signature has
 * PADDING_BYTES zero bytes in front of its first MPI, which anyone can do
 * without the private key. The value is unchanged, but OpenPGP.js keeps the
 * extra bytes when it parses the signature, so verification fails, and drops
 * them when it serialises it, so the copy writes out the same bytes as the valid
 * revocation. Expects a V4 revocation directly after the primary key packet,
 * with a body under 64 KiB.
 */
export async function padRevocation(revokedKey: string): Promise<string> {
	const key = await readKey({ armoredKey: revokedKey });
	const [keyPacket, revocation, ...rest] = key.toPacketList();
	const body = revocation.write();
	const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
	// V4 signature body (RFC 9580 section 5.2.3): four octets of header, the hashed
	// and unhashed subpackets each behind a two-octet length, two octets of the hash,
	// then the MPIs, each a two-octet bit count and its value
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
	// Written by hand: serialising through OpenPGP.js would drop the zero bytes again
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
 * Returns a copy of an armoured public key with `marks` byte order marks (U+FEFF)
 * in front of every user ID, which anyone can do without the private key.
 * OpenPGP.js strips one leading mark each time it reads a user ID, so with two
 * marks the user ID differs from the original on the first read and matches it
 * once the key is written and read again.
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

/** Returns every permutation of `items`: n items give n! arrays, so keep the list short */
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
