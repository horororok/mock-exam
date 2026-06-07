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

type CreatedState = {
	created: { title: string; slug: string; questionCount: number }[];
	failed: { title: string; error: string }[];
};

function typeCountLabel(exam: ExamUpload): string {
	const counts = exam.questions.reduce<Record<string, number>>((acc, q) => {
		acc[q.type] = (acc[q.type] ?? 0) + 1;
		return acc;
	}, {});
	return Object.entries(counts)
		.map(([t, n]) => `${TYPE_LABELS[t as keyof typeof TYPE_LABELS]} ${n}`)
		.join(" · ");
}

export function UploadForm() {
	const [jsonText, setJsonText] = useState("");
	const [errors, setErrors] = useState<string[]>([]);
	const [preview, setPreview] = useState<ExamUpload[] | null>(null);
	const [created, setCreated] = useState<CreatedState | null>(null);

	const toast = useToast();

	const create = api.exam.create.useMutation({
		onSuccess: (data) => {
			setCreated({
				created: [
					{
						title: preview?.[0]?.title ?? data.slug,
						slug: data.slug,
						questionCount: data.questionCount,
					},
				],
				failed: [],
			});
			toast.success(`시험 1개 생성 완료 (${data.questionCount}문항)`);
		},
		onError: (err) => toast.error(`생성 실패: ${err.message}`),
	});

	const createMany = api.exam.createMany.useMutation({
		onSuccess: (data) => {
			setCreated({
				created: data.results.flatMap((r) =>
					r.ok
						? [{ title: r.title, slug: r.slug, questionCount: r.questionCount }]
						: [],
				),
				failed: data.results.flatMap((r) =>
					r.ok ? [] : [{ title: r.title, error: r.error }],
				),
			});
			toast.success(`${data.created}/${data.total}개 시험 생성`);
		},
		onError: (err) => toast.error(`생성 실패: ${err.message}`),
	});

	const submitting = create.isPending || createMany.isPending;

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

		const list = Array.isArray(raw) ? raw : [raw];
		const valid: ExamUpload[] = [];
		const errs: string[] = [];
		list.forEach((item, idx) => {
			const parsed = examUploadSchema.safeParse(item);
			if (parsed.success) {
				valid.push(parsed.data);
			} else {
				const prefix = list.length > 1 ? `[${idx + 1}번 시험] ` : "";
				for (const i of parsed.error.issues) {
					errs.push(`${prefix}${i.path.join(".") || "(root)"} — ${i.message}`);
				}
			}
		});

		if (errs.length > 0) {
			setErrors(errs);
			toast.error(`검증 오류 ${errs.length}건 — 아래를 확인하세요`);
			return;
		}

		setErrors([]);
		setPreview(valid);
		toast.success(`검증 통과 — 시험 ${valid.length}개`);
	}

	async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		const items: unknown[] = [];
		const parseErrs: string[] = [];
		for (const file of Array.from(files)) {
			try {
				const parsed: unknown = JSON.parse(await file.text());
				if (Array.isArray(parsed)) items.push(...parsed);
				else items.push(parsed);
			} catch {
				parseErrs.push(`${file.name}: JSON 파싱 실패`);
			}
		}

		// 같은 파일 재선택 가능하도록 초기화
		e.target.value = "";

		if (parseErrs.length > 0) {
			setErrors(parseErrs);
			toast.error(`${parseErrs.length}개 파일 파싱 실패`);
		}
		if (items.length > 0) {
			setJsonText(
				JSON.stringify(items.length === 1 ? items[0] : items, null, 2),
			);
			toast.info(
				`${files.length}개 파일에서 ${items.length}개 시험 로드 — 검증을 눌러주세요`,
			);
		}
	}

	function submit() {
		if (!preview || preview.length === 0) return;
		if (preview.length === 1) create.mutate(preview[0]!);
		else createMany.mutate(preview);
	}

	return (
		<div className="mt-6 flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-3">
				<label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100">
					파일 선택(.json, 여러 개 가능)
					<input
						type="file"
						aria-label="시험 JSON 파일 선택"
						accept="application/json,.json"
						multiple
						onChange={onFiles}
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

			<p className="text-xs text-slate-500">
				단일 시험은 객체 <code>{"{ … }"}</code>, 여러 시험은 배열{" "}
				<code>{"[ {…}, {…} ]"}</code> 로. 파일 여러 개를 한 번에 선택해도
				됩니다.
			</p>

			<textarea
				aria-label="시험 JSON"
				value={jsonText}
				onChange={(e) => setJsonText(e.target.value)}
				placeholder='{"title": "...", "level": "high", "questions": [...]}  또는  [ {...}, {...} ]'
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
					onClick={submit}
					disabled={!preview || submitting}
					className="rounded-lg bg-sky-600 px-5 py-2 font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
				>
					{submitting
						? "생성 중..."
						: preview && preview.length > 1
							? `${preview.length}개 시험 생성`
							: "시험 생성"}
				</button>
			</div>

			{errors.length > 0 && (
				<ul className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
					{errors.map((msg, i) => (
						<li key={i}>• {msg}</li>
					))}
				</ul>
			)}

			{(create.error || createMany.error) && (
				<p className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
					생성 실패: {(create.error ?? createMany.error)?.message}
				</p>
			)}

			{created && (
				<div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
					<p className="font-semibold">
						✓ {created.created.length}개 시험 생성 완료
					</p>
					<ul className="mt-2 flex flex-col gap-1">
						{created.created.map((c) => (
							<li key={c.slug}>
								<Link
									href={`/exam/${c.slug}`}
									className="text-sky-700 underline"
								>
									{c.title}
								</Link>{" "}
								<span className="text-emerald-700/70">
									({c.questionCount}문항)
								</span>
							</li>
						))}
					</ul>
					{created.failed.length > 0 && (
						<div className="mt-3 text-rose-700">
							<p className="font-medium">실패 {created.failed.length}개:</p>
							<ul className="mt-1 flex flex-col gap-1">
								{created.failed.map((f, i) => (
									<li key={i}>
										{f.title} — {f.error}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}

			{preview && !created && (
				<div className="rounded-lg border border-slate-200 bg-white p-4">
					<p className="font-semibold">미리보기 — 시험 {preview.length}개</p>
					<ol className="mt-3 flex flex-col gap-2">
						{preview.map((exam, i) => (
							<li
								key={i}
								className="rounded-lg border border-slate-100 bg-slate-50 p-3"
							>
								<p className="font-medium">
									<span className="mr-1 text-slate-400">{i + 1}.</span>
									{exam.title}
								</p>
								<p className="mt-0.5 text-xs text-slate-500">
									{LEVEL_LABELS[exam.level]}
									{exam.subject && ` · ${exam.subject}`}
									{exam.durationMinutes != null &&
										` · ${exam.durationMinutes}분`}
									{` · 총 ${exam.questions.length}문항`}
								</p>
								<p className="mt-0.5 text-xs text-slate-400">
									{typeCountLabel(exam)}
								</p>
							</li>
						))}
					</ol>
				</div>
			)}
		</div>
	);
}
