/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { getSession } from "~/server/auth";
import { getAdminEmails } from "~/server/auth/admin";
import { getDb } from "~/server/db";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
	// session은 현재 항상 null (auth seam). better-auth 연결 시 getSession만 교체.
	const session = await getSession(opts.headers);
	return {
		db: getDb(),
		session,
		...opts,
	};
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		// 프로덕션에서는 내부 서버 오류의 원본 메시지(DB/SQL 등)를 그대로 노출하지 않는다.
		// 의도적 4xx(NOT_FOUND/UNAUTHORIZED/FORBIDDEN/BAD_REQUEST)는 메시지를 유지.
		const maskInternal =
			error.code === "INTERNAL_SERVER_ERROR" &&
			process.env.NODE_ENV === "production";
		return {
			...shape,
			message: maskInternal ? "서버 오류가 발생했습니다." : shape.message,
			data: {
				...shape.data,
				zodError:
					error.cause instanceof ZodError ? error.cause.flatten() : null,
			},
		};
	},
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
	const start = Date.now();

	if (t._config.isDev) {
		// artificial delay in dev
		const waitMs = Math.floor(Math.random() * 400) + 100;
		await new Promise((resolve) => setTimeout(resolve, waitMs));
	}

	const result = await next();

	const end = Date.now();
	console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

	return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * 로그인한 사용자만 호출할 수 있다. 세션이 없으면 UNAUTHORIZED. 통과하면
 * `ctx.session.user`가 non-null로 좁혀진다. 지금은 getSession이 항상 null이라
 * 실제로 통과하지 않지만, auth 연결 후 바로 쓸 수 있도록 자리를 잡아둔다.
 */
export const protectedProcedure = t.procedure
	.use(timingMiddleware)
	.use(({ ctx, next }) => {
		if (!ctx.session?.user) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "로그인이 필요합니다.",
			});
		}
		return next({
			ctx: { ...ctx, session: { ...ctx.session, user: ctx.session.user } },
		});
	});

/**
 * Admin procedure
 *
 * 시험 등록/삭제 등 관리 작업용. 로그인한 사용자의 이메일이 `ADMIN_EMAILS`에
 * 포함돼야 통과한다. `ADMIN_EMAILS` 미설정 시: 개발 환경은 허용(편의),
 * 프로덕션은 차단.
 */
export const adminProcedure = t.procedure
	.use(timingMiddleware)
	.use(({ ctx, next }) => {
		const admins = getAdminEmails();
		if (admins.length === 0) {
			if (process.env.NODE_ENV === "production") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "관리자가 설정되지 않았습니다 (ADMIN_EMAILS).",
				});
			}
			return next();
		}
		if (!ctx.session?.user) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "로그인이 필요합니다.",
			});
		}
		if (!admins.includes(ctx.session.user.email.toLowerCase())) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "관리자 권한이 필요합니다.",
			});
		}
		return next();
	});
