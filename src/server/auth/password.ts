import { fromBase64Url, timingSafeEqual, toBase64Url } from "./webcrypto";

/**
 * 비밀번호 해싱 (PBKDF2-SHA256, 라이브러리 없음).
 * 저장 형식: `pbkdf2$<iterations>$<saltB64url>$<hashB64url>`
 */

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

async function deriveBits(
	password: string,
	salt: Uint8Array<ArrayBuffer>,
	iterations: number,
	keyBytes: number,
): Promise<Uint8Array> {
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", salt, iterations, hash: "SHA-256" },
		keyMaterial,
		keyBytes * 8,
	);
	return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
	const salt = new Uint8Array(SALT_BYTES);
	crypto.getRandomValues(salt);
	const hash = await deriveBits(password, salt, ITERATIONS, KEY_BYTES);
	return `pbkdf2$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(
	password: string,
	stored: string,
): Promise<boolean> {
	const parts = stored.split("$");
	if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
	const iterations = Number(parts[1]);
	if (!Number.isFinite(iterations) || iterations <= 0) return false;
	const salt = fromBase64Url(parts[2]!);
	const expected = fromBase64Url(parts[3]!);
	const actual = await deriveBits(password, salt, iterations, expected.length);
	return timingSafeEqual(actual, expected);
}
