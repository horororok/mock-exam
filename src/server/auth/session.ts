import { eq } from "drizzle-orm";

import { getDb } from "~/server/db";
import { sessions } from "~/server/db/schema";

import { randomToken, sha256Base64Url } from "./webcrypto";

export const SESSION_COOKIE = "mock-exam-session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

export type SessionUser = {
	id: string;
	email: string;
	name: string | null;
};

/** 새 세션 생성 → 원문 토큰(쿠키에 담을 값)과 만료시각 반환. */
export async function createSession(
	userId: string,
): Promise<{ token: string; expiresAt: Date }> {
	const db = getDb();
	const token = randomToken(32);
	const id = await sha256Base64Url(token);
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
	await db.insert(sessions).values({ id, userId, expiresAt });
	return { token, expiresAt };
}

/** 쿠키 토큰 검증 → 유효하면 사용자 반환, 아니면 null (만료 세션은 정리). */
export async function validateSessionToken(
	token: string,
): Promise<SessionUser | null> {
	const db = getDb();
	const id = await sha256Base64Url(token);
	const row = await db.query.sessions.findFirst({
		where: eq(sessions.id, id),
		with: { user: true },
	});
	if (!row) return null;
	if (row.expiresAt.getTime() < Date.now()) {
		await db.delete(sessions).where(eq(sessions.id, id));
		return null;
	}
	return { id: row.user.id, email: row.user.email, name: row.user.name };
}

export async function invalidateSessionToken(token: string): Promise<void> {
	const db = getDb();
	const id = await sha256Base64Url(token);
	await db.delete(sessions).where(eq(sessions.id, id));
}
