import { TRPCError } from "@trpc/server";
import { count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { chunk } from "~/server/db/chunk";
import { attemptAnswers, attempts, sessions, users } from "~/server/db/schema";

export const userRouter = createTRPCRouter({
	/** 가입 회원 목록 + 응시 횟수. (비밀번호 해시는 절대 노출하지 않음) */
	list: adminProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db.query.users.findMany({
			orderBy: [desc(users.createdAt)],
			columns: { id: true, email: true, name: true, createdAt: true },
		});

		const counts = await ctx.db
			.select({ userId: attempts.userId, n: count() })
			.from(attempts)
			.where(isNotNull(attempts.userId))
			.groupBy(attempts.userId);
		const countByUser = new Map(counts.map((c) => [c.userId, c.n]));

		return rows.map((u) => ({
			...u,
			attemptCount: countByUser.get(u.id) ?? 0,
		}));
	}),

	/** 회원 삭제 (세션·응시 기록까지 정리). 본인 계정은 삭제 불가. */
	delete: adminProcedure
		.input(z.object({ id: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session?.user?.id === input.id) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "본인 계정은 삭제할 수 없습니다.",
				});
			}

			const attemptIds = (
				await ctx.db.query.attempts.findMany({
					where: eq(attempts.userId, input.id),
					columns: { id: true },
				})
			).map((a) => a.id);

			for (const part of chunk(attemptIds, 90)) {
				await ctx.db
					.delete(attemptAnswers)
					.where(inArray(attemptAnswers.attemptId, part));
			}
			await ctx.db.delete(attempts).where(eq(attempts.userId, input.id));
			await ctx.db.delete(sessions).where(eq(sessions.userId, input.id));
			await ctx.db.delete(users).where(eq(users.id, input.id));

			return { ok: true, id: input.id };
		}),
});
