"use client";

import { createContext, useContext, useMemo } from "react";

export type SessionUser = {
	id: string;
	email: string;
	name?: string | null;
};

type AuthStatus = "authenticated" | "unauthenticated";

type AuthContextValue = {
	user: SessionUser | null;
	status: AuthStatus;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * `const { user, status } = useSession()`.
 *
 * 현재는 항상 비로그인(user=null). auth seam이므로, better-auth 연결 시:
 *  - 서버: RootLayout(RSC)에서 세션을 읽어 `initialUser`로 내려주거나
 *  - 클라이언트: 이 Provider 내부를 better-auth의 useSession 구독으로 교체
 * 하면 앱 전체가 그대로 동작한다.
 */
export function useSession(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useSession must be used within <AuthProvider>");
	return ctx;
}

export function AuthProvider({
	children,
	initialUser = null,
}: {
	children: React.ReactNode;
	initialUser?: SessionUser | null;
}) {
	const value = useMemo<AuthContextValue>(
		() => ({
			user: initialUser,
			status: initialUser ? "authenticated" : "unauthenticated",
		}),
		[initialUser],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
