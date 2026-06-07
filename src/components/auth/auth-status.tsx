"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useSession } from "~/components/auth/auth-provider";
import { useToast } from "~/components/toast/toast-provider";
import { signOut } from "~/server/auth/actions";

/** 헤더용 로그인 상태 표시 + 로그아웃. */
export function AuthStatus() {
	const { user } = useSession();
	const router = useRouter();
	const toast = useToast();
	const [pending, setPending] = useState(false);

	if (!user) {
		return (
			<Link
				href="/login"
				className="shrink-0 rounded-lg border border-white/20 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
			>
				로그인
			</Link>
		);
	}

	async function logout() {
		setPending(true);
		await signOut();
		toast.info("로그아웃되었습니다");
		router.refresh();
	}

	return (
		<div className="flex shrink-0 items-center gap-2 text-sm text-slate-300">
			<Link
				href="/history"
				className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10"
			>
				내 기록
			</Link>
			<span className="hidden max-w-[10rem] truncate sm:inline">
				{user.name ?? user.email}
			</span>
			<button
				type="button"
				onClick={logout}
				disabled={pending}
				className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10 disabled:opacity-60"
			>
				로그아웃
			</button>
		</div>
	);
}
