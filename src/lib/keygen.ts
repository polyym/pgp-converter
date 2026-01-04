import { generateKey, type EllipticCurveName } from 'openpgp';

export interface KeyPair {
	publicKey: string;
	privateKey: string;
}

export interface KeyGenResult {
	success: boolean;
	data?: KeyPair;
	error?: string;
}

export interface KeyGenOptions {
	name: string;
	email: string;
	passphrase: string;
	keyType: 'ecc' | 'rsa';
	curve?: 'curve25519' | 'nistP256' | 'nistP384' | 'nistP521';
	rsaBits?: 2048 | 3072 | 4096;
}

export async function generateKeyPair(options: KeyGenOptions): Promise<KeyGenResult> {
	try {
		const { name, email, passphrase, keyType, curve, rsaBits } = options;

		if (!name.trim() || !email.trim()) {
			return {
				success: false,
				error: 'Name and email are required'
			};
		}

		const userIDs = [{ name: name.trim(), email: email.trim() }];

		let result: { privateKey: string; publicKey: string };

		if (keyType === 'ecc') {
			result = await generateKey({
				type: 'ecc',
				curve: (curve || 'curve25519') as EllipticCurveName,
				userIDs,
				passphrase,
				format: 'armored'
			});
		} else {
			result = await generateKey({
				type: 'rsa',
				rsaBits: rsaBits || 4096,
				userIDs,
				passphrase,
				format: 'armored'
			});
		}

		return {
			success: true,
			data: {
				publicKey: result.publicKey,
				privateKey: result.privateKey
			}
		};
	} catch (e) {
		console.error(e);
		return {
			success: false,
			error: `Error generating key pair: ${(e as Error).message}`
		};
	}
}

export function downloadKey(content: string, filename: string): void {
	const blob = new Blob([content], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
