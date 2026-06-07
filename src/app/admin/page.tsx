import Link from "next/link";

import { AdminDashboard } from "./admin-dashboard";

export const metadata = {
	title: "관리 — Mock Exam",
};

export default function AdminPage() {
	return (
		<main className="min-h-screen bg-slate-50 text-slate-900">
			<div className="container mx-auto max-w-3xl px-4 py-10">
				<Link href="/" className="text-sm text-sky-600 hover:underline">
					← 목록으로
				</Link>

				<h1 className="mt-4 text-2xl font-bold">시험 관리</h1>
				<p className="mt-1 text-slate-600">시험을 등록·확인·삭제합니다.</p>

				<div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
					⚠️ 이 영역은 <code>ADMIN_TOKEN</code>이 설정된 경우에만 보호됩니다.
					설정 방법은 <code>docs/deployment.md</code> 참고.
				</div>

				<AdminDashboard />
			</div>
		</main>
	);
}
