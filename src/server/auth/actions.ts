"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";

import { getDb } from "~/server/db";
import { users } from "~/server/db/schema";

import { hashPassword, verifyPassword } from "./password";
import {
	createSession,
	invalidateSessionToken,
	SESSION_COOKIE,
} from "./session";

export type AuthResult = { ok: true } | { ok: false; error: string };

const credentials = z.object({
	// 형식 검증 + 정규화(앞뒤 공백 제거, 소문자) → 중복 확인이 대소문자/공백에 견고
	email: z.string().trim().toLowerCase().email("올바른 이메일을 입력하세요."),
	password: z
		.string()
		.min(8, "비밀번호는 8자 이상이어야 합니다.")
		.max(200, "비밀번호가 너무 깁니다."),
});

async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
	const store = await cookies();
	store.set(SESSION_COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		expires: expiresAt,
	});
}

export async function signUp(input: {
	email: string;
	password: string;
	name?: string;
}): Promise<AuthResult> {
	const parsed = credentials.safeParse(input);
	if (!parsed.success) {
		return { ok: false, error: parsed.error.issues[0]?.message ?? "입력 오류" };
	}
	const db = getDb();
	const email = parsed.data.email;

	const existing = await db.query.users.findFirst({
		where: eq(users.email, email),
		columns: { id: true },
	});
	if (existing) return { ok: false, error: "이미 가입된 이메일입니다." };

	const id = crypto.randomUUID();
	const passwordHash = await hashPassword(parsed.data.password);
	await db.insert(users).values({
		id,
		email,
		name: input.name?.trim() || null,
		passwordHash,
	});

	const { token, expiresAt } = await createSession(id);
	await setSessionCookie(token, expiresAt);
	return { ok: true };
}

export async function signIn(input: {
	email: string;
	password: string;
}): Promise<AuthResult> {
	const parsed = credentials.safeParse(input);
	if (!parsed.success) {
		return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
	}
	const db = getDb();
	const email = parsed.data.email;

	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	});
	// 사용자 없을 때도 동일 응답 (계정 존재 여부 노출 방지)
	if (
		!user ||
		!(await verifyPassword(parsed.data.password, user.passwordHash))
	) {
		return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
	}

	const { token, expiresAt } = await createSession(user.id);
	await setSessionCookie(token, expiresAt);
	return { ok: true };
}

export async function signOut(): Promise<AuthResult> {
	const store = await cookies();
	const token = store.get(SESSION_COOKIE)?.value;
	if (token) await invalidateSessionToken(token);
	store.delete(SESSION_COOKIE);
	return { ok: true };
}
