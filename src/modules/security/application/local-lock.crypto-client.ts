const DEFAULT_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

export type PinVerifier = {
	salt: string;
	hash: string;
	iterations: number;
};

export async function createPinVerifier(
	pin: string,
	iterations = DEFAULT_ITERATIONS,
): Promise<PinVerifier> {
	assertWebCrypto();

	const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));

	const hash = await derivePinBytes(pin, salt, iterations);

	return {
		salt: bytesToBase64(salt),
		hash: bytesToBase64(hash),
		iterations,
	};
}

export async function verifyPinVerifier(
	pin: string,
	verifier: PinVerifier,
): Promise<boolean> {
	assertWebCrypto();

	const salt = base64ToBytes(verifier.salt);

	const expected = base64ToBytes(verifier.hash);

	const actual = await derivePinBytes(pin, salt, verifier.iterations);

	return constantTimeEqual(actual, expected);
}

async function derivePinBytes(
	pin: string,
	salt: Uint8Array,
	iterations: number,
): Promise<Uint8Array> {
	const saltBuffer = new Uint8Array(salt).buffer;
	const material = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(pin),
		"PBKDF2",
		false,
		["deriveBits"],
	);

	const bits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: saltBuffer,
			iterations,
			hash: "SHA-256",
		},
		material,
		HASH_BITS,
	);

	return new Uint8Array(bits);
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
	let difference = left.length ^ right.length;
	const length = Math.max(left.length, right.length);

	for (let index = 0; index < length; index += 1) {
		difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
	}

	return difference === 0;
}

function bytesToBase64(value: Uint8Array): string {
	let binary = "";

	for (const byte of value) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes;
}

function assertWebCrypto(): void {
	if (!crypto?.subtle) {
		throw new Error("WEB_CRYPTO_UNAVAILABLE");
	}
}
