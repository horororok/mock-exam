/**
 * WebCrypto 유틸 (라이브러리 없음). Cloudflare Workers / Node 20+ 모두 전역
 * `crypto`(subtle, getRandomValues, randomUUID)를 제공한다.
 */

export function toBase64Url(bytes: Uint8Array): string {
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(str: string): Uint8Array<ArrayBuffer> {
	const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
	const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
	const bin = atob(padded);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

/** 고엔트로피 랜덤 토큰 (base64url). 기본 32바이트. */
export function randomToken(byteLength = 32): string {
	const bytes = new Uint8Array(byteLength);
	crypto.getRandomValues(bytes);
	return toBase64Url(bytes);
}

/** 문자열의 SHA-256 해시를 base64url로 반환. */
export async function sha256Base64Url(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return toBase64Url(new Uint8Array(digest));
}

/** 길이가 같은 두 바이트 배열의 상수시간 비교. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
	return diff === 0;
}
