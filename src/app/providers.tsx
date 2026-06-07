"use client";

import {
	AuthProvider,
	type SessionUser,
} from "~/components/auth/auth-provider";
import { ModalProvider } from "~/components/modal/modal-provider";
import { ToastProvider } from "~/components/toast/toast-provider";
import { TRPCReactProvider } from "~/trpc/react";

/**
 * 모든 클라이언트 Provider를 한 곳에서 합성한다.
 * 새 전역 Provider가 필요하면 여기 트리에 한 줄 추가하면 된다.
 *
 * 순서(외곽 → 내부): 데이터 → 세션 → 토스트 → 모달
 *  - TRPCReactProvider가 최외곽 (Auth가 세션 쿼리에 의존할 수 있음)
 *  - Toast/Modal은 Auth·앱 어디서든 호출되므로 안쪽
 */
export function Providers({
	children,
	initialUser = null,
}: {
	children: React.ReactNode;
	initialUser?: SessionUser | null;
}) {
	return (
		<TRPCReactProvider>
			<AuthProvider initialUser={initialUser}>
				<ToastProvider>
					<ModalProvider>{children}</ModalProvider>
				</ToastProvider>
			</AuthProvider>
		</TRPCReactProvider>
	);
}
