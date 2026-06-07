"use client";

import { useEffect, useState } from "react";

import { api } from "~/trpc/react";

const STORAGE_KEY = "mock-exam:admin-token";

/**
 * 관리자 토큰 입력 필드. 값은 이 브라우저의 localStorage에만 저장되고,
 * tRPC 요청 시 `x-admin-token` 헤더로 전송된다(`trpc/react.tsx`).
 * 서버에 ADMIN_TOKEN이 설정된 경우에만 필요하다.
 */
export function AdminTokenField() {
	const [token, setToken] = useState("");
	const [saved, setSaved] = useState(false);
	const utils = api.useUtils();

	useEffect(() => {
		setToken(window.localStorage.getItem(STORAGE_KEY) ?? "");
	}, []);

	function save() {
		if (token) window.localStorage.setItem(STORAGE_KEY, token);
		else window.localStorage.removeItem(STORAGE_KEY);
		setSaved(true);
		// 토큰이 바뀌었으니 admin 쿼리 재요청
		void utils.exam.invalidate();
		setTimeout(() => setSaved(false), 1500);
	}

	return (
		<div className="rounded-lg border border-slate-200 bg-white p-3">
			<div className="flex items-end gap-2">
				<label className="flex-1 text-sm">
					<span className="text-slate-600">관리자 토큰</span>
					<input
						type="password"
						aria-label="관리자 토큰"
						value={token}
						onChange={(e) => setToken(e.target.value)}
						placeholder="ADMIN_TOKEN (설정된 경우)"
						className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
					/>
				</label>
				<button
					type="button"
					onClick={save}
					className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
				>
					저장
				</button>
			</div>
			<p className="mt-1 text-xs text-slate-500">
				{saved ? "저장됨 ✓ " : ""}
				이 브라우저에만 저장됩니다. 서버에 ADMIN_TOKEN이 설정된 경우에만
				필요합니다.
			</p>
		</div>
	);
}
