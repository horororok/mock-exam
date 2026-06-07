"use client";

import Link from "next/link";
import { useState } from "react";

import { useToast } from "~/components/toast/toast-provider";
import { LEVEL_LABELS } from "~/lib/exam";
import {
	type ExamUpload,
	examUploadSchema,
	SAMPLE_EXAM_UPLOAD_JSON,
} from "~/lib/exam-upload";
import { api } from "~/trpc/react";

const TYPE_LABELS: Record<ExamUpload["questions"][number]["type"], string> = {
	single: "객관식(단일)",
	multiple: "객관식(복수)",
	short: "단답형",
	essay: "서술형",
};

export function UploadForm() {
	const [jsonText, setJsonText] = useState("");
	const [errors, setErrors] = useState<string[]>([]);
	const [preview, setPreview] = useState<ExamUpload | null>(null);
	const [created, setCreated] = useState<{
		slug: string;
		questionCount: number;
	} | null>(null);

	const toast = useToast();
	const create = api.exam.create.useMutation({
		onSuccess: (data) => {
			setCreated(data);
			toast.success(`시험이 생성되었습니다 (${data.questionCount}문항)`);
		},
		onError: (err) => toast.error(`생성 실패: ${err.message}`),
	});

	function validate() {
		setCreated(null);
		setPreview(null);

		let raw: unknown;
		try {
			raw = JSON.parse(jsonText);
		} catch (e) {
			const msg = `JSON 파싱 오류: ${e instanceof Error ? e.message : String(e)}`;
			setErrors([msg]);
			toast.error(msg);
			return;
		}

		const parsed = examUploadSchema.safeParse(raw);
		if (!parsed.success) {
			const issues = parsed.error.issues.map(
				(i) => `${i.path.join(".") || "(root)"} — ${i.message}`,
			);
			setErrors(issues);
			toast.error(`검증 오류 ${issues.length}건 — 아래를 확인하세요`);
			return;
		}

		setErrors([]);
		setPreview(parsed.data);
		toast.success(`검증 통과 — ${parsed.data.questions.length}문항`);
	}

	async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setJsonText(await file.text());
	}

	const typeCounts =
		preview?.questions.reduce<Record<string, number>>((acc, q) => {
			acc[q.type] = (acc[q.type] ?? 0) + 1;
			return acc;
		}, {}) ?? {};

	return (
		<div className="mt-6 flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-3">
				<label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100">
					파일 선택(.json)
					<input
						type="file"
						aria-label="시험 JSON 파일 선택"
						accept="application/json,.json"
						onChange={onFile}
						className="hidden"
					/>
				</label>
				<button
					type="button"
					onClick={() => setJsonText(SAMPLE_EXAM_UPLOAD_JSON)}
					className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
				>
					예시 채우기
				</button>
			</div>

			<textarea
				aria-label="시험 JSON"
				value={jsonText}
				onChange={(e) => setJsonText(e.target.value)}
				placeholder='{"title": "...", "level": "high", "questions": [...]}'
				rows={14}
				className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm"
			/>

			<div className="flex gap-3">
				<button
					type="button"
					onClick={validate}
					className="rounded-lg bg-slate-800 px-5 py-2 font-semibold text-white hover:bg-slate-700"
				>
					검증 / 미리보기
				</button>
				<button
					type="button"
					onClick={() => preview && create.mutate(preview)}
					disabled={!preview || create.isPending}
					className="rounded-lg bg-sky-600 px-5 py-2 font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
				>
					{create.isPending ? "생성 중..." : "시험 생성"}
				</button>
			</div>

			{errors.length > 0 && (
				<ul className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
					{errors.map((msg, i) => (
						<li key={i}>• {msg}</li>
					))}
				</ul>
			)}

			{create.error && (
				<p className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
					생성 실패: {create.error.message}
				</p>
			)}

			{created && (
				<div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
					<p className="font-semibold">
						✓ 생성 완료 ({created.questionCount}문항)
					</p>
					<Link
						href={`/exam/${created.slug}`}
						className="mt-1 inline-block text-sky-700 underline"
					>
						/exam/{created.slug} 로 이동
					</Link>
				</div>
			)}

			{preview && !created && (
				<div className="rounded-lg border border-slate-200 bg-white p-4">
					<p className="font-semibold">{preview.title}</p>
					<p className="mt-1 text-sm text-slate-500">
						{LEVEL_LABELS[preview.level]}
						{preview.subject && ` · ${preview.subject}`}
						{preview.durationMinutes != null &&
							` · ${preview.durationMinutes}분`}
						{` · 총 ${preview.questions.length}문항`}
					</p>
					<p className="mt-1 text-xs text-slate-500">
						{Object.entries(typeCounts)
							.map(
								([t, n]) =>
									`${TYPE_LABELS[t as keyof typeof TYPE_LABELS]} ${n}`,
							)
							.join(" · ")}
					</p>
					<ol className="mt-3 flex flex-col gap-2">
						{preview.questions.map((q, i) => (
							<li key={i} className="text-sm">
								<span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
									{TYPE_LABELS[q.type]}
								</span>
								{q.prompt}
								<span className="ml-2 text-xs text-slate-400">
									{(q.type === "single" || q.type === "multiple") &&
										`보기 ${q.choices.length} · 정답 ${q.choices.filter((c) => c.correct).length}`}
									{q.type === "short" && `허용답안 ${q.answers.length}`}
									{q.type === "essay" &&
										(q.modelAnswer ? "모범답안 있음" : "모범답안 없음")}
									{` · ${q.points}점`}
								</span>
							</li>
						))}
					</ol>
				</div>
			)}
		</div>
	);
}
