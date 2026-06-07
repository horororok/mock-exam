"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { useEffect, useMemo, useRef, useState } from "react";

import { useModal } from "~/components/modal/modal-provider";
import { useToast } from "~/components/toast/toast-provider";
import { getAnonId } from "~/lib/exam";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";

type ExamDetail = inferRouterOutputs<AppRouter>["exam"]["getBySlug"];
type SubmitResult = inferRouterOutputs<AppRouter>["exam"]["submit"];
type Question = ExamDetail["questions"][number];

type AnswerState = {
	selectedChoiceIds?: number[];
	responseText?: string;
};

/** 서술형 자기채점 등급 */
type SelfGrade = "correct" | "partial" | "wrong";

function selfGradePoints(grade: SelfGrade | undefined, points: number): number {
	if (grade === "correct") return points;
	if (grade === "partial") return Math.floor(points / 2);
	return 0;
}

export function ExamRunner({ exam }: { exam: ExamDetail }) {
	const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
	const [result, setResult] = useState<SubmitResult | null>(null);
	const [selfGrades, setSelfGrades] = useState<Record<number, SelfGrade>>({});

	const toast = useToast();
	const { openModal, closeModal } = useModal();

	// 응시 타이머 (durationMinutes가 있을 때만)
	const timed = exam.durationMinutes != null;
	const [secondsLeft, setSecondsLeft] = useState<number | null>(() =>
		exam.durationMinutes != null ? exam.durationMinutes * 60 : null,
	);
	const autoSubmittedRef = useRef(false);

	const submit = api.exam.submit.useMutation({
		onSuccess: (data) => {
			setResult(data);
			const autoCount = data.results.filter((r) => r.type !== "essay").length;
			toast.success(
				`채점 완료 — 자동채점 ${data.score} / ${data.maxScore}점 (${autoCount}문항)`,
			);
			if (typeof window !== "undefined") {
				window.scrollTo({ top: 0, behavior: "smooth" });
			}
		},
		onError: (err) => toast.error(`제출 실패: ${err.message}`),
	});

	const resultByQuestion = useMemo(() => {
		if (!result) return null;
		return new Map(result.results.map((r) => [r.questionId, r]));
	}, [result]);

	const isDone = result != null;

	const answeredCount = exam.questions.filter((q) => {
		const a = answers[q.id];
		return (
			(a?.selectedChoiceIds?.length ?? 0) > 0 ||
			(a?.responseText ?? "").trim() !== ""
		);
	}).length;

	// 서술형 문항 (자기채점 대상)
	const essayResults = result?.results.filter((r) => r.type === "essay") ?? [];
	const essaySelfTotal = essayResults.reduce(
		(sum, r) => sum + selfGradePoints(selfGrades[r.questionId], r.points),
		0,
	);

	function toggleChoice(q: Question, choiceId: number) {
		setAnswers((prev) => {
			if (q.type === "multiple") {
				const cur = prev[q.id]?.selectedChoiceIds ?? [];
				const next = cur.includes(choiceId)
					? cur.filter((id) => id !== choiceId)
					: [...cur, choiceId];
				return { ...prev, [q.id]: { selectedChoiceIds: next } };
			}
			return { ...prev, [q.id]: { selectedChoiceIds: [choiceId] } };
		});
	}

	function setText(questionId: number, text: string) {
		setAnswers((prev) => ({ ...prev, [questionId]: { responseText: text } }));
	}

	function doSubmit() {
		submit.mutate({
			slug: exam.slug,
			anonId: getAnonId(),
			answers: exam.questions.map((q) => ({
				questionId: q.id,
				selectedChoiceIds: answers[q.id]?.selectedChoiceIds,
				responseText: answers[q.id]?.responseText,
			})),
		});
	}

	// 제출 전 확인 모달 (미응답 문항이 있으면 경고)
	function requestSubmit() {
		const unanswered = exam.questions.length - answeredCount;
		openModal(
			<ConfirmSubmit
				total={exam.questions.length}
				unanswered={unanswered}
				onCancel={closeModal}
				onConfirm={() => {
					closeModal();
					doSubmit();
				}}
			/>,
		);
	}

	// 타이머 카운트다운
	useEffect(() => {
		if (!timed || isDone) return;
		const handle = setInterval(() => {
			setSecondsLeft((s) => (s != null && s > 0 ? s - 1 : 0));
		}, 1000);
		return () => clearInterval(handle);
	}, [timed, isDone]);

	// 시간 종료 시 1회 자동 제출
	useEffect(() => {
		if (secondsLeft === 0 && !isDone && !autoSubmittedRef.current) {
			autoSubmittedRef.current = true;
			toast.info("시간이 종료되어 자동 제출됩니다.");
			doSubmit();
		}
		// doSubmit/toast는 매 렌더 동일 동작 — 가드(ref)로 중복 제출 방지
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [secondsLeft, isDone]);

	return (
		<div className="mt-8 flex flex-col gap-6">
			{isDone && (
				<ScoreBanner
					result={result}
					essayCount={essayResults.length}
					essaySelfTotal={essaySelfTotal}
				/>
			)}

			<ol className="flex flex-col gap-8">
				{exam.questions.map((q, idx) => {
					const r = resultByQuestion?.get(q.id);
					const a = answers[q.id];
					return (
						<li
							key={q.id}
							className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
						>
							<div className="flex items-start justify-between gap-3">
								<p className="font-semibold">
									<span className="mr-2 text-sky-600">{idx + 1}.</span>
									{q.prompt}
									{q.type === "multiple" && (
										<span className="ml-2 text-xs font-normal text-slate-400">
											(복수 선택)
										</span>
									)}
								</p>
								<span className="shrink-0 text-xs text-slate-400">
									{q.points}점
								</span>
							</div>

							{q.passage && (
								<pre className="mt-3 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-700">
									{q.passage}
								</pre>
							)}

							<div className="mt-4 flex flex-col gap-2">
								{q.type === "short" ? (
									<input
										type="text"
										aria-label="단답형 답 입력"
										disabled={isDone}
										value={a?.responseText ?? ""}
										onChange={(e) => setText(q.id, e.target.value)}
										placeholder="답을 입력하세요"
										className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
									/>
								) : q.type === "essay" ? (
									<textarea
										aria-label="서술형 답 입력"
										disabled={isDone}
										value={a?.responseText ?? ""}
										onChange={(e) => setText(q.id, e.target.value)}
										placeholder="답안을 작성하세요"
										rows={5}
										className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
									/>
								) : (
									q.choices.map((c) => {
										const selected = (a?.selectedChoiceIds ?? []).includes(
											c.id,
										);
										const isAnswer =
											r?.correctChoiceIds.includes(c.id) ?? false;
										return (
											<label
												key={c.id}
												className={cn(
													"flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2",
													selected
														? "border-sky-400 bg-sky-50"
														: "border-slate-200",
													isDone &&
														isAnswer &&
														"border-emerald-400 bg-emerald-50",
													isDone &&
														selected &&
														!isAnswer &&
														"border-rose-400 bg-rose-50",
												)}
											>
												<input
													type={q.type === "multiple" ? "checkbox" : "radio"}
													aria-label={c.content}
													name={`q-${q.id}`}
													disabled={isDone}
													checked={selected}
													onChange={() => toggleChoice(q, c.id)}
												/>
												<span>{c.content}</span>
											</label>
										);
									})
								)}
							</div>

							{isDone && r && (
								<QuestionReview
									review={r}
									selfGrade={selfGrades[q.id]}
									onSelfGrade={(g) =>
										setSelfGrades((prev) => ({ ...prev, [q.id]: g }))
									}
								/>
							)}
						</li>
					);
				})}
			</ol>

			{!isDone && (
				<div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-lg backdrop-blur">
					<div className="flex items-center gap-3 text-sm">
						{secondsLeft != null && (
							<span
								className={cn(
									"font-semibold tabular-nums",
									secondsLeft <= 60 ? "text-rose-600" : "text-slate-700",
								)}
							>
								⏱ {formatTime(secondsLeft)}
							</span>
						)}
						<span className="text-slate-500">
							{answeredCount} / {exam.questions.length} 응답
						</span>
					</div>
					<button
						type="button"
						onClick={requestSubmit}
						disabled={submit.isPending}
						className="rounded-lg bg-sky-600 px-6 py-2 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
					>
						{submit.isPending ? "채점 중..." : "제출하고 채점하기"}
					</button>
				</div>
			)}

			{submit.error && (
				<p className="text-sm text-rose-600">
					제출에 실패했습니다: {submit.error.message}
				</p>
			)}
		</div>
	);
}

function QuestionReview({
	review,
	selfGrade,
	onSelfGrade,
}: {
	review: SubmitResult["results"][number];
	selfGrade: SelfGrade | undefined;
	onSelfGrade: (grade: SelfGrade) => void;
}) {
	if (review.type === "essay") {
		return (
			<div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
				<p className="font-medium text-slate-700">모범답안</p>
				<p className="mt-1 whitespace-pre-wrap text-slate-600">
					{review.modelAnswer ?? "(모범답안이 없습니다)"}
				</p>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<span className="text-slate-500">자기채점:</span>
					{(
						[
							["correct", "정답"],
							["partial", "부분"],
							["wrong", "오답"],
						] as const
					).map(([value, label]) => (
						<button
							key={value}
							type="button"
							onClick={() => onSelfGrade(value)}
							className={cn(
								"rounded-full border px-3 py-1 text-xs",
								selfGrade === value
									? "border-sky-500 bg-sky-500 text-white"
									: "border-slate-300 text-slate-600 hover:bg-slate-100",
							)}
						>
							{label}
						</button>
					))}
					<span className="ml-1 text-slate-500">
						({selfGradePoints(selfGrade, review.points)} / {review.points}점)
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className="mt-3 text-sm">
			<p
				className={cn(
					"font-medium",
					review.isCorrect ? "text-emerald-600" : "text-rose-600",
				)}
			>
				{review.isCorrect ? "정답입니다 ✓" : "오답입니다 ✗"}
				<span className="ml-2 font-normal text-slate-400">
					{review.earnedPoints} / {review.points}점
				</span>
			</p>
			{review.type === "short" && review.acceptedAnswers.length > 0 && (
				<p className="mt-1 text-slate-500">
					정답: {review.acceptedAnswers.join(" / ")}
				</p>
			)}
		</div>
	);
}

function ScoreBanner({
	result,
	essayCount,
	essaySelfTotal,
}: {
	result: SubmitResult;
	essayCount: number;
	essaySelfTotal: number;
}) {
	const autoCorrect = result.results.filter((r) => r.isCorrect === true).length;
	const autoGradable = result.results.filter((r) => r.type !== "essay").length;
	const combined = result.score + essaySelfTotal;
	const pct =
		result.maxScore > 0 ? Math.round((combined / result.maxScore) * 100) : 0;

	return (
		<div className="rounded-xl bg-slate-900 p-6 text-center text-white">
			<p className="text-sm text-slate-300">채점 결과</p>
			<p className="mt-1 text-4xl font-extrabold">
				{combined}
				<span className="text-xl text-slate-400"> / {result.maxScore}점</span>
			</p>
			<p className="mt-2 text-sm text-slate-300">
				자동채점 {autoCorrect}/{autoGradable}문항 정답 · {result.score}점
				{essayCount > 0 && (
					<>
						{" · "}서술형 {essayCount}문항 자기채점 {essaySelfTotal}점
					</>
				)}{" "}
				· 합계 {pct}점
			</p>
			{essayCount > 0 && (
				<p className="mt-1 text-xs text-slate-400">
					서술형은 아래에서 모범답안과 비교해 직접 채점하세요.
				</p>
			)}
		</div>
	);
}

function ConfirmSubmit({
	total,
	unanswered,
	onCancel,
	onConfirm,
}: {
	total: number;
	unanswered: number;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	return (
		<div>
			<h2 className="text-lg font-bold">제출하시겠습니까?</h2>
			<p className="mt-2 text-sm text-slate-600">
				총 {total}문항 중 {total - unanswered}문항에 응답했습니다.
				{unanswered > 0 && (
					<span className="mt-1 block font-medium text-rose-600">
						미응답 {unanswered}문항은 오답 처리됩니다.
					</span>
				)}
			</p>
			<div className="mt-5 flex justify-end gap-2">
				<button
					type="button"
					onClick={onCancel}
					className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
				>
					계속 풀기
				</button>
				<button
					type="button"
					onClick={onConfirm}
					className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
				>
					제출하고 채점
				</button>
			</div>
		</div>
	);
}

function formatTime(totalSeconds: number): string {
	const s = Math.max(0, totalSeconds);
	const m = Math.floor(s / 60);
	const sec = s % 60;
	return `${m}:${String(sec).padStart(2, "0")}`;
}

function cn(...classes: Array<string | false | undefined | null>): string {
	return classes.filter(Boolean).join(" ");
}
