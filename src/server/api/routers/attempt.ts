import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { parseAcceptedAnswers } from "~/lib/exam-upload";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { attempts } from "~/server/db/schema";

/** 저장된 답안에서 선택한 선택지 id 목록을 복원 (단일/복수 모두 대응). */
function selectedChoiceIdsOf(answer: {
	selectedChoiceId: number | null;
	selectedChoiceIds: string | null;
}): number[] {
	if (answer.selectedChoiceIds) {
		try {
			const parsed: unknown = JSON.parse(answer.selectedChoiceIds);
			if (Array.isArray(parsed)) {
				return parsed.filter((x): x is number => typeof x === "number");
			}
		} catch {
			// ignore
		}
	}
	return answer.selectedChoiceId != null ? [answer.selectedChoiceId] : [];
}

export const attemptRouter = createTRPCRouter({
	/** 로그인 사용자의 응시 기록 (최신순). protectedProcedure. */
	history: protectedProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db.query.attempts.findMany({
			where: and(
				eq(attempts.userId, ctx.session.user.id),
				eq(attempts.status, "submitted"),
			),
			orderBy: [desc(attempts.submittedAt)],
			limit: 100,
			with: {
				exam: {
					columns: { slug: true, title: true, level: true, subject: true },
				},
			},
		});

		return rows.flatMap((a) => {
			if (!a.exam) return [];
			return [
				{
					id: a.id,
					examSlug: a.exam.slug,
					examTitle: a.exam.title,
					level: a.exam.level,
					subject: a.exam.subject,
					score: a.score,
					maxScore: a.maxScore,
					submittedAt: a.submittedAt,
				},
			];
		});
	}),

	/**
	 * 본인 응시 1건의 상세 (문항별 정오/내 답안/정답). 과거 제출이므로 정답·모범답안을
	 * 함께 내려보낸다. 본인 소유가 아니면 NOT_FOUND. protectedProcedure.
	 */
	getById: protectedProcedure
		.input(z.object({ id: z.number().int() }))
		.query(async ({ ctx, input }) => {
			const attempt = await ctx.db.query.attempts.findFirst({
				where: and(
					eq(attempts.id, input.id),
					eq(attempts.userId, ctx.session.user.id),
				),
				with: {
					exam: {
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
					},
					answers: true,
				},
			});

			if (!attempt || !attempt.exam) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "응시 기록을 찾을 수 없습니다.",
				});
			}

			const answerByQuestion = new Map(
				attempt.answers.map((a) => [a.questionId, a]),
			);

			const questions = attempt.exam.questions.map((q) => {
				const answer = answerByQuestion.get(q.id);
				return {
					id: q.id,
					order: q.order,
					type: q.type,
					prompt: q.prompt,
					passage: q.passage,
					points: q.points,
					choices: q.choices.map((c) => ({
						id: c.id,
						content: c.content,
						isCorrect: c.isCorrect,
					})),
					acceptedAnswers:
						q.type === "short" ? parseAcceptedAnswers(q.answerKey) : [],
					modelAnswer: q.type === "essay" ? q.modelAnswer : null,
					response: {
						selectedChoiceIds: answer ? selectedChoiceIdsOf(answer) : [],
						responseText: answer?.responseText ?? null,
						isCorrect: answer?.isCorrect ?? null,
						earnedPoints: answer?.earnedPoints ?? 0,
					},
				};
			});

			return {
				id: attempt.id,
				examSlug: attempt.exam.slug,
				examTitle: attempt.exam.title,
				level: attempt.exam.level,
				subject: attempt.exam.subject,
				score: attempt.score,
				maxScore: attempt.maxScore,
				submittedAt: attempt.submittedAt,
				questions,
			};
		}),
});
