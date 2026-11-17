import {
	config,
	generateKey,
	readPrivateKey,
	SecretKeyPacket,
	type Config,
	type SignaturePacket
} from 'openpgp';

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
	const primary = privateKey.keyPacket;
	if (!(primary instanceof SecretKeyPacket)) {
		throw new TypeError('The key has no secret part to sign with');
	}

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

function asFlagBytes(flags: number | null): Uint8Array | null {
	return flags === null ? null : new Uint8Array([flags]);
}
