import Link from "next/link";
import { notFound } from "next/navigation";

import { LEVEL_LABELS } from "~/lib/exam";
import { getServerUser } from "~/server/auth";
import { api } from "~/trpc/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "응시 상세 — Mock Exam" };

const dateFmt = new Intl.DateTimeFormat("ko-KR", {
	dateStyle: "medium",
	timeStyle: "short",
});

const TYPE_LABELS: Record<string, string> = {
	single: "객관식",
	multiple: "객관식(복수)",
	short: "단답형",
	essay: "서술형",
};

type Detail = Awaited<ReturnType<typeof api.attempt.getById>>;

export default async function AttemptDetailPage({
	params,
}: {
	params: Promise<{ attemptId: string }>;
}) {
	const { attemptId } = await params;
	const id = Number(attemptId);
	if (!Number.isInteger(id)) notFound();

	const user = await getServerUser();

	return (
		<main className="min-h-screen bg-slate-50 text-slate-900">
			<div className="container mx-auto max-w-3xl px-4 py-10">
				<Link href="/history" className="text-sm text-sky-600 hover:underline">
					← 내 기록
				</Link>
				{user ? (
					<DetailBody id={id} />
				) : (
					<Notice>
						로그인이 필요합니다.{" "}
						<Link href="/login" className="text-sky-600 underline">
							로그인
						</Link>
					</Notice>
				)}
			</div>
		</main>
	);
}

async function DetailBody({ id }: { id: number }) {
	const detail = await api.attempt.getById({ id }).catch(() => null);
	if (!detail) {
		return <Notice>응시 기록을 찾을 수 없습니다.</Notice>;
	}

	const correctCount = detail.questions.filter(
		(q) => q.response.isCorrect === true,
	).length;
	const autoGradable = detail.questions.filter(
		(q) => q.type !== "essay",
	).length;

	return (
		<>
			<header className="mt-4 flex flex-col gap-2 border-b border-slate-200 pb-5">
				<div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
					<span className="rounded-full bg-slate-200 px-2 py-0.5">
						{LEVEL_LABELS[detail.level]}
					</span>
					{detail.subject && <span>{detail.subject}</span>}
					{detail.submittedAt && (
						<span>· {dateFmt.format(detail.submittedAt)}</span>
					)}
				</div>
				<h1 className="text-2xl font-bold">{detail.examTitle}</h1>
				<p className="text-slate-600">
					자동채점 <strong>{detail.score ?? 0}</strong> / {detail.maxScore ?? 0}
					점 · {autoGradable}문항 중 {correctCount}문항 정답
				</p>
				<Link
					href={`/exam/${detail.examSlug}`}
					className="text-sm text-sky-600 hover:underline"
				>
					다시 풀기 →
				</Link>
			</header>

			<ol className="mt-6 flex flex-col gap-5">
				{detail.questions.map((q, idx) => (
					<QuestionReview key={q.id} q={q} index={idx} />
				))}
			</ol>
		</>
	);
}

function QuestionReview({
	q,
	index,
}: {
	q: Detail["questions"][number];
	index: number;
}) {
	const selected = q.response.selectedChoiceIds;
	return (
		<li className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<p className="font-semibold">
					<span className="mr-2 text-sky-600">{index + 1}.</span>
					{q.prompt}
					<span className="ml-2 text-xs font-normal text-slate-400">
						{TYPE_LABELS[q.type]}
					</span>
				</p>
				<span className="shrink-0 text-xs text-slate-400">
					{q.response.earnedPoints} / {q.points}점
				</span>
			</div>

			{q.passage && (
				<pre className="mt-3 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-700">
					{q.passage}
				</pre>
			)}

			{(q.type === "single" || q.type === "multiple") && (
				<div className="mt-4 flex flex-col gap-2">
					{q.choices.map((c) => {
						const picked = selected.includes(c.id);
						return (
							<div
								key={c.id}
								className={cn(
									"flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm",
									c.isCorrect
										? "border-emerald-400 bg-emerald-50"
										: picked
											? "border-rose-400 bg-rose-50"
											: "border-slate-200",
								)}
							>
								<span>{c.content}</span>
								<span className="flex gap-1 text-xs">
									{c.isCorrect && (
										<span className="text-emerald-600">정답</span>
									)}
									{picked && <span className="text-slate-500">· 내 선택</span>}
								</span>
							</div>
						);
					})}
				</div>
			)}

			{q.type === "short" && (
				<div className="mt-4 text-sm">
					<p>
						내 답안:{" "}
						<span className="font-medium">
							{q.response.responseText || "—"}
						</span>
					</p>
					{q.acceptedAnswers.length > 0 && (
						<p className="mt-1 text-slate-500">
							정답: {q.acceptedAnswers.join(" / ")}
						</p>
					)}
				</div>
			)}

			{q.type === "essay" && (
				<div className="mt-4 text-sm">
					<p className="whitespace-pre-wrap">
						내 답안: {q.response.responseText || "—"}
					</p>
					<div className="mt-2 rounded-lg bg-slate-50 p-3">
						<p className="font-medium text-slate-700">모범답안</p>
						<p className="mt-1 whitespace-pre-wrap text-slate-600">
							{q.modelAnswer ?? "(없음)"}
						</p>
					</div>
				</div>
			)}

			{q.type !== "essay" && (
				<p
					className={cn(
						"mt-3 text-sm font-medium",
						q.response.isCorrect ? "text-emerald-600" : "text-rose-600",
					)}
				>
					{q.response.isCorrect ? "정답 ✓" : "오답 ✗"}
				</p>
			)}
		</li>
	);
}

function Notice({ children }: { children: React.ReactNode }) {
	return (
		<div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
			{children}
		</div>
	);
}

function cn(...classes: Array<string | false | undefined | null>): string {
	return classes.filter(Boolean).join(" ");
}
