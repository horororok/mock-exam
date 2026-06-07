import { cookies } from "next/headers";

import {
	SESSION_COOKIE,
	type SessionUser,
	validateSessionToken,
} from "./session";

export type { SessionUser } from "./session";
export type Session = { user: SessionUser } | null;

/** Cookie 헤더에서 특정 쿠키 값을 추출. */
function parseCookie(header: string | null, name: string): string | null {
	if (!header) return null;
	for (const part of header.split(";")) {
		const eq = part.indexOf("=");
		if (eq === -1) continue;
		if (part.slice(0, eq).trim() === name) {
			return decodeURIComponent(part.slice(eq + 1).trim());
		}
	}
	return null;
}

/**
 * tRPC 컨텍스트용. 요청 Headers의 Cookie에서 세션 토큰을 읽어 검증한다.
 * (createTRPCContext가 headers를 그대로 넘겨줌)
 */
export async function getSession(headers: Headers): Promise<Session> {
	const token = parseCookie(headers.get("cookie"), SESSION_COOKIE);
	if (!token) return null;
	const user = await validateSessionToken(token);
	return user ? { user } : null;
}

/**
 * RSC / 서버 액션용. next/headers의 cookies()로 현재 사용자 조회.
 */
export async function getServerUser(): Promise<SessionUser | null> {
	const store = await cookies();
	const token = store.get(SESSION_COOKIE)?.value;
	if (!token) return null;
	return validateSessionToken(token);
}
