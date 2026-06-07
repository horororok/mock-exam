import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
	type ExamUpload,
	examUploadSchema,
	normalizeShort,
	parseAcceptedAnswers,
	slugify,
} from "~/lib/exam-upload";
import {
	adminProcedure,
	createTRPCRouter,
	publicProcedure,
} from "~/server/api/trpc";
import { getDb } from "~/server/db";
import { chunk } from "~/server/db/chunk";
import {
	attemptAnswers,
	attempts,
	choices,
	EXAM_LEVELS,
	exams,
	questions,
} from "~/server/db/schema";

const levelSchema = z.enum(EXAM_LEVELS);

/**
 * 업로드된 1개 시험을 DB에 생성한다 (슬러그 중복 시 -2, -3 …).
 * create / createMany에서 공유. 실패 시 부분 생성분을 정리하고 throw.
 */
async function insertExam(
	db: ReturnType<typeof getDb>,
	input: ExamUpload,
): Promise<{ slug: string; examId: number; questionCount: number }> {
	const base = slugify(input.slug ?? input.title);
	let slug = base;
	for (let i = 2; ; i++) {
		const existing = await db.query.exams.findFirst({
			where: eq(exams.slug, slug),
			columns: { id: true },
		});
		if (!existing) break;
		slug = `${base}-${i}`;
	}

	const [exam] = await db
		.insert(exams)
		.values({
			slug,
			title: input.title,
			description: input.description ?? null,
			level: input.level,
			subject: input.subject ?? null,
			durationMinutes: input.durationMinutes ?? null,
			published: input.published,
		})
		.returning({ id: exams.id });

	if (!exam) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "시험 생성에 실패했습니다.",
		});
	}

	try {
		for (let qi = 0; qi < input.questions.length; qi++) {
			const q = input.questions[qi]!;
			const answerKey = q.type === "short" ? JSON.stringify(q.answers) : null;
			const modelAnswer = q.type === "essay" ? (q.modelAnswer ?? null) : null;

			const [question] = await db
				.insert(questions)
				.values({
					examId: exam.id,
					order: qi + 1,
					type: q.type,
					prompt: q.prompt,
					passage: q.passage ?? null,
					answerKey,
					modelAnswer,
					points: q.points,
				})
				.returning({ id: questions.id });

			if (question && (q.type === "single" || q.type === "multiple")) {
				const choiceRows = q.choices.map((c, ci) => ({
					questionId: question.id,
					order: ci + 1,
					content: c.content,
					isCorrect: c.correct,
				}));
				// D1 100 파라미터 제한 (선택지 4컬럼 → 20행씩)
				for (const part of chunk(choiceRows, 20)) {
					await db.insert(choices).values(part);
				}
			}
		}
	} catch (err) {
		// 부분 생성 정리 (cascade로 문항/선택지도 삭제)
		await db.delete(exams).where(eq(exams.id, exam.id));
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `문항 저장 중 오류가 발생했습니다: ${
				err instanceof Error ? err.message : String(err)
			}`,
		});
	}

	return { slug, examId: exam.id, questionCount: input.questions.length };
}

export const examRouter = createTRPCRouter({
	/** 공개된 모의고사 목록. level로 필터 가능. */
	list: publicProcedure
		.input(z.object({ level: levelSchema.optional() }).optional())
		.query(async ({ ctx, input }) => {
			const rows = await ctx.db.query.exams.findMany({
				where: input?.level
					? and(eq(exams.published, true), eq(exams.level, input.level))
					: eq(exams.published, true),
				orderBy: [asc(exams.level), asc(exams.title)],
				with: { questions: { columns: { id: true } } },
			});

			return rows.map((e) => ({
				id: e.id,
				slug: e.slug,
				title: e.title,
				description: e.description,
				level: e.level,
				subject: e.subject,
				durationMinutes: e.durationMinutes,
				questionCount: e.questions.length,
			}));
		}),

	/**
	 * 응시용 시험 상세. 문항/선택지를 포함하되 정답 정보(isCorrect, answerKey,
	 * modelAnswer)는 절대 클라이언트로 내려보내지 않는다.
	 */
	getBySlug: publicProcedure
		.input(z.object({ slug: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const exam = await ctx.db.query.exams.findFirst({
				where: and(eq(exams.slug, input.slug), eq(exams.published, true)),
				with: {
					questions: {
						orderBy: (q, { asc }) => [asc(q.order), asc(q.id)],
						with: {
							choices: {
								orderBy: (c, { asc }) => [asc(c.order), asc(c.id)],
							},
						},
					},
				},
			});

			if (!exam) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "시험을 찾을 수 없습니다.",
				});
			}

			return {
				id: exam.id,
				slug: exam.slug,
				title: exam.title,
				description: exam.description,
				level: exam.level,
				subject: exam.subject,
				durationMinutes: exam.durationMinutes,
				questions: exam.questions.map((q) => ({
					id: q.id,
					order: q.order,
					type: q.type,
					prompt: q.prompt,
					passage: q.passage,
					points: q.points,
					choices: q.choices.map((c) => ({ id: c.id, content: c.content })),
				})),
			};
		}),

	/**
	 * 업로드된 JSON으로 모의고사를 생성한다. (adminProcedure — ADMIN_TOKEN 설정 시 보호)
	 * 입력은 examUploadSchema로 서버에서도 재검증한다.
	 */
	create: adminProcedure
		.input(examUploadSchema)
		.mutation(({ ctx, input }) => insertExam(ctx.db, input)),

	/**
	 * 여러 시험을 한 번에 생성. 항목별로 처리하며, 실패한 시험은 건너뛰고
	 * 결과를 보고한다(전체 롤백 없음).
	 */
	createMany: adminProcedure
		.input(z.array(examUploadSchema).min(1).max(50))
		.mutation(async ({ ctx, input }) => {
			const results: Array<
				| { ok: true; title: string; slug: string; questionCount: number }
				| { ok: false; title: string; error: string }
			> = [];
			for (const exam of input) {
				try {
					const r = await insertExam(ctx.db, exam);
					results.push({
						ok: true,
						title: exam.title,
						slug: r.slug,
						questionCount: r.questionCount,
					});
				} catch (err) {
					results.push({
						ok: false,
						title: exam.title,
						error: err instanceof Error ? err.message : String(err),
					});
				}
			}
			return {
				created: results.filter((r) => r.ok).length,
				total: input.length,
				results,
			};
		}),

	/** 답안 제출 → 서버에서 채점 후 결과 반환 + 응시 기록 저장 */
	submit: publicProcedure
		.input(
			z.object({
				slug: z.string().min(1),
				anonId: z.string().min(1).max(64),
				answers: z
					.array(
						z.object({
							questionId: z.number().int(),
							selectedChoiceIds: z.array(z.number().int()).max(50).optional(),
							responseText: z.string().max(5000).optional(),
						}),
					)
					.max(500),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const exam = await ctx.db.query.exams.findFirst({
				where: and(eq(exams.slug, input.slug), eq(exams.published, true)),
				with: { questions: { with: { choices: true } } },
			});

			if (!exam) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "시험을 찾을 수 없습니다.",
				});
			}

			const answerByQuestion = new Map(
				input.answers.map((a) => [a.questionId, a]),
			);

			let score = 0;
			let maxScore = 0;
			const graded = exam.questions.map((q) => {
				maxScore += q.points;
				const answer = answerByQuestion.get(q.id);
				const selected = (answer?.selectedChoiceIds ?? [])
					.slice()
					.sort((a, b) => a - b);
				const correctChoiceIds = q.choices
					.filter((c) => c.isCorrect)
					.map((c) => c.id)
					.sort((a, b) => a - b);
				const acceptedAnswers =
					q.type === "short" ? parseAcceptedAnswers(q.answerKey) : [];

				let isCorrect: boolean | null = false;
				let earnedPoints = 0;
				if (q.type === "single") {
					isCorrect =
						selected.length === 1 &&
						correctChoiceIds.length === 1 &&
						selected[0] === correctChoiceIds[0];
					earnedPoints = isCorrect ? q.points : 0;
				} else if (q.type === "multiple") {
					const correctSet = new Set(correctChoiceIds);
					const matched = selected.filter((id) => correctSet.has(id)).length;
					const wrong = selected.length - matched;
					isCorrect =
						correctChoiceIds.length > 0 &&
						matched === correctChoiceIds.length &&
						wrong === 0;
					// 부분점수: (맞은 정답 수 − 틀린 선택 수) / 정답 총수, 음수는 0
					earnedPoints =
						correctChoiceIds.length > 0
							? Math.round(
									(q.points * Math.max(0, matched - wrong)) /
										correctChoiceIds.length,
								)
							: 0;
				} else if (q.type === "short") {
					const given = normalizeShort(answer?.responseText ?? "");
					isCorrect =
						given.length > 0 &&
						acceptedAnswers.map(normalizeShort).includes(given);
					earnedPoints = isCorrect ? q.points : 0;
				} else {
					// essay → 자동채점하지 않음
					isCorrect = null;
					earnedPoints = 0;
				}

				score += earnedPoints;

				return {
					questionId: q.id,
					type: q.type,
					selectedChoiceIds: selected,
					responseText: answer?.responseText ?? null,
					isCorrect,
					earnedPoints,
					points: q.points,
					correctChoiceIds,
					acceptedAnswers,
					modelAnswer: q.type === "essay" ? q.modelAnswer : null,
				};
			});

			const [attempt] = await ctx.db
				.insert(attempts)
				.values({
					examId: exam.id,
					anonId: input.anonId,
					userId: ctx.session?.user?.id ?? null,
					status: "submitted",
					score,
					maxScore,
					submittedAt: new Date(),
				})
				.returning({ id: attempts.id });

			if (attempt && graded.length > 0) {
				const answerRows = graded.map((g) => ({
					attemptId: attempt.id,
					questionId: g.questionId,
					selectedChoiceId:
						g.type === "single" ? (g.selectedChoiceIds[0] ?? null) : null,
					selectedChoiceIds:
						g.type === "single" || g.type === "multiple"
							? JSON.stringify(g.selectedChoiceIds)
							: null,
					responseText: g.responseText,
					isCorrect: g.isCorrect,
					earnedPoints: g.earnedPoints,
				}));
				// D1 100 파라미터 제한 (답안 7컬럼 → 12행씩 나눠 insert)
				for (const part of chunk(answerRows, 12)) {
					await ctx.db.insert(attemptAnswers).values(part);
				}
			}

			return {
				attemptId: attempt?.id ?? null,
				score,
				maxScore,
				results: graded,
			};
		}),

	/** 관리용: 모든 시험 목록 (비공개 포함). adminProcedure. */
	listAll: adminProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db.query.exams.findMany({
			orderBy: [desc(exams.createdAt)],
			with: { questions: { columns: { id: true } } },
		});
		return rows.map((e) => ({
			id: e.id,
			slug: e.slug,
			title: e.title,
			level: e.level,
			subject: e.subject,
			published: e.published,
			questionCount: e.questions.length,
		}));
	}),

	/** 관리용: 시험 삭제 (문항/선택지/응시 기록까지). adminProcedure. */
	delete: adminProcedure
		.input(z.object({ slug: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const exam = await ctx.db.query.exams.findFirst({
				where: eq(exams.slug, input.slug),
				columns: { id: true },
			});
			if (!exam) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "시험을 찾을 수 없습니다.",
				});
			}

			// D1는 FK cascade를 보장하지 않으므로 child부터 명시적으로 삭제
			const questionIds = (
				await ctx.db.query.questions.findMany({
					where: eq(questions.examId, exam.id),
					columns: { id: true },
				})
			).map((q) => q.id);
			const attemptIds = (
				await ctx.db.query.attempts.findMany({
					where: eq(attempts.examId, exam.id),
					columns: { id: true },
				})
			).map((a) => a.id);

			for (const part of chunk(attemptIds, 90)) {
				await ctx.db
					.delete(attemptAnswers)
					.where(inArray(attemptAnswers.attemptId, part));
			}
			await ctx.db.delete(attempts).where(eq(attempts.examId, exam.id));
			for (const part of chunk(questionIds, 90)) {
				await ctx.db.delete(choices).where(inArray(choices.questionId, part));
			}
			await ctx.db.delete(questions).where(eq(questions.examId, exam.id));
			await ctx.db.delete(exams).where(eq(exams.id, exam.id));

			return { ok: true, slug: input.slug };
		}),
});
