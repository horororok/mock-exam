import Link from "next/link";

import { AuthStatus } from "~/components/auth/auth-status";
import { LEVEL_LABELS, LEVEL_ORDER } from "~/lib/exam";
import { getServerUser } from "~/server/auth";
import { getAdminEmails, isAdminEmail } from "~/server/auth/admin";
import type { ExamLevel } from "~/server/db/schema";
import { api } from "~/trpc/server";

// DB를 읽으므로 빌드 시 정적 프리렌더 대신 요청 시 렌더링한다.
export const dynamic = "force-dynamic";

export default async function Home() {
	const exams = await api.exam.list();

	const user = await getServerUser();
	const admins = getAdminEmails();
	const canAdmin =
		admins.length === 0
			? process.env.NODE_ENV !== "production"
			: isAdminEmail(user?.email);

	const byLevel = LEVEL_ORDER.map((level) => ({
		level,
		exams: exams.filter((e) => e.level === level),
	})).filter((group) => group.exams.length > 0);

	return (
		<main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100">
			<div className="container mx-auto flex max-w-5xl flex-col gap-12 px-4 py-16">
				<header className="flex flex-col gap-3">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
						<h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
							Mock <span className="text-sky-400">Exam</span>
						</h1>
						<div className="flex flex-wrap items-center gap-2">
							<AuthStatus />
							{canAdmin && (
								<Link
									href="/admin"
									className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
								>
									시험 관리
								</Link>
							)}
						</div>
					</div>
					<p className="text-lg text-slate-300">
						중학교 · 고등학교 · 대학 · 대학원 모의고사를 풀고 바로 채점받으세요.
					</p>
				</header>

				{byLevel.length === 0 ? (
					<EmptyState />
				) : (
					<div className="flex flex-col gap-10">
						{byLevel.map((group) => (
							<LevelSection
								key={group.level}
								level={group.level}
								exams={group.exams}
							/>
						))}
					</div>
				)}
			</div>
		</main>
	);
}

function LevelSection({
	level,
	exams,
}: {
	level: ExamLevel;
	exams: Awaited<ReturnType<typeof api.exam.list>>;
}) {
	return (
		<section className="flex flex-col gap-4">
			<h2 className="text-2xl font-bold text-slate-200">
				{LEVEL_LABELS[level]}
			</h2>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{exams.map((exam) => (
					<Link
						key={exam.id}
						href={`/exam/${exam.slug}`}
						className="flex flex-col gap-2 rounded-xl bg-white/5 p-5 ring-1 ring-white/10 transition hover:bg-white/10 hover:ring-sky-400/40"
					>
						<div className="flex items-center gap-2 text-xs text-slate-400">
							{exam.subject && <span>{exam.subject}</span>}
							<span>· 문항 {exam.questionCount}개</span>
							{exam.durationMinutes != null && (
								<span>· {exam.durationMinutes}분</span>
							)}
						</div>
						<h3 className="text-lg font-semibold text-slate-100">
							{exam.title}
						</h3>
						{exam.description && (
							<p className="line-clamp-2 text-sm text-slate-400">
								{exam.description}
							</p>
						)}
					</Link>
				))}
			</div>
		</section>
	);
}

function EmptyState() {
	return (
		<div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-10 text-center">
			<p className="text-lg font-medium text-slate-200">
				아직 공개된 모의고사가 없습니다.
			</p>
			<p className="mt-2 text-sm text-slate-400">
				샘플 데이터를 넣으려면{" "}
				<code className="rounded bg-black/40 px-1.5 py-0.5">pnpm db:seed</code>{" "}
				를 실행하세요.
			</p>
		</div>
	);
}
