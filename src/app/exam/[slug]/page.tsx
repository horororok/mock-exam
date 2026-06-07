import Link from "next/link";
import { notFound } from "next/navigation";

import { LEVEL_LABELS } from "~/lib/exam";
import { api } from "~/trpc/server";

import { ExamRunner } from "./exam-runner";

// DB를 읽으므로 빌드 시 정적 프리렌더 대신 요청 시 렌더링한다.
export const dynamic = "force-dynamic";

export default async function ExamPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	const exam = await api.exam.getBySlug({ slug }).catch(() => null);
	if (!exam) notFound();

	return (
		<main className="min-h-screen bg-slate-50 text-slate-900">
			<div className="container mx-auto max-w-3xl px-4 py-10">
				<Link href="/" className="text-sm text-sky-600 hover:underline">
					← 목록으로
				</Link>

				<header className="mt-4 flex flex-col gap-2 border-b border-slate-200 pb-6">
					<div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
						<span className="rounded-full bg-slate-200 px-2 py-0.5">
							{LEVEL_LABELS[exam.level]}
						</span>
						{exam.subject && <span>{exam.subject}</span>}
						<span>· 문항 {exam.questions.length}개</span>
						{exam.durationMinutes != null && (
							<span>· 권장 {exam.durationMinutes}분</span>
						)}
					</div>
					<h1 className="text-2xl font-bold">{exam.title}</h1>
					{exam.description && (
						<p className="text-slate-600">{exam.description}</p>
					)}
				</header>

				<ExamRunner exam={exam} />
			</div>
		</main>
	);
}
