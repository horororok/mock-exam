"use client";

import Link from "next/link";

import { LEVEL_LABELS } from "~/lib/exam";
import { api } from "~/trpc/react";

const dateFmt = new Intl.DateTimeFormat("ko-KR", {
	dateStyle: "medium",
	timeStyle: "short",
});

export function HistoryList() {
	const history = api.attempt.history.useQuery();

	if (history.isLoading) {
		return <p className="mt-8 text-sm text-slate-500">불러오는 중…</p>;
	}
	if (history.error) {
		return (
			<p className="mt-8 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
				기록을 불러오지 못했습니다: {history.error.message}
			</p>
		);
	}

	const items = history.data ?? [];
	if (items.length === 0) {
		return (
			<div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
				아직 응시 기록이 없습니다. 시험을 풀어보세요!
			</div>
		);
	}

	return (
		<ul className="mt-8 flex flex-col gap-2">
			{items.map((a) => {
				const pct =
					a.maxScore && a.maxScore > 0
						? Math.round(((a.score ?? 0) / a.maxScore) * 100)
						: null;
				return (
					<li
						key={a.id}
						className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
					>
						<div className="min-w-0">
							<div className="flex items-center gap-2 text-xs text-slate-500">
								<span className="rounded-full bg-slate-100 px-2 py-0.5">
									{LEVEL_LABELS[a.level]}
								</span>
								{a.subject && <span>{a.subject}</span>}
								{a.submittedAt && (
									<span>· {dateFmt.format(a.submittedAt)}</span>
								)}
							</div>
							<Link
								href={`/history/${a.id}`}
								className="font-medium text-slate-900 hover:text-sky-600 hover:underline"
							>
								{a.examTitle}
							</Link>
							<div className="mt-0.5 flex gap-3 text-xs">
								<Link
									href={`/history/${a.id}`}
									className="text-sky-600 hover:underline"
								>
									상세 보기
								</Link>
								<Link
									href={`/exam/${a.examSlug}`}
									className="text-slate-500 hover:underline"
								>
									다시 풀기
								</Link>
							</div>
						</div>
						<div className="shrink-0 text-right">
							<div className="text-lg font-bold tabular-nums">
								{a.score ?? 0}
								<span className="text-sm font-normal text-slate-400">
									{" "}
									/ {a.maxScore ?? 0}
								</span>
							</div>
							{pct != null && (
								<div className="text-xs text-slate-500">{pct}점</div>
							)}
						</div>
					</li>
				);
			})}
		</ul>
	);
}
