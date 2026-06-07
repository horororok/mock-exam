import Link from "next/link";

import { getServerUser } from "~/server/auth";

import { HistoryList } from "./history-list";

export const metadata = {
	title: "내 응시 기록 — Mock Exam",
};

// 세션을 읽으므로 동적 렌더링
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
	const user = await getServerUser();

	return (
		<main className="min-h-screen bg-slate-50 text-slate-900">
			<div className="container mx-auto max-w-3xl px-4 py-10">
				<Link href="/" className="text-sm text-sky-600 hover:underline">
					← 목록으로
				</Link>
				<h1 className="mt-4 text-2xl font-bold">내 응시 기록</h1>

				{user ? (
					<HistoryList />
				) : (
					<div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
						<p className="text-slate-600">
							로그인하면 응시 기록을 볼 수 있습니다.
						</p>
						<Link
							href="/login"
							className="mt-3 inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
						>
							로그인
						</Link>
					</div>
				)}
			</div>
		</main>
	);
}
