import { relations, sql } from "drizzle-orm";
import { index, sqliteTableCreator } from "drizzle-orm/sqlite-core";

/**
 * Multi-project schema prefix. All tables for this app are namespaced with
 * `mock_exam_` so a single D1 database can be shared across projects if needed.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator((name) => `mock_exam_${name}`);

/** 학교급 / 과정 구분 */
export const EXAM_LEVELS = [
	"middle", // 중학교
	"high", // 고등학교
	"university", // 대학
	"graduate", // 대학원
] as const;
export type ExamLevel = (typeof EXAM_LEVELS)[number];

/** 문항 유형 */
export const QUESTION_TYPES = [
	"single", // 단일 정답 객관식
	"multiple", // 복수 정답 객관식
	"short", // 단답형(주관식)
	"essay", // 서술형(논술) — 자동채점 불가, 모범답안 + 자기채점
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** 응시 상태 */
export const ATTEMPT_STATUS = ["in_progress", "submitted"] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUS)[number];

/** 모의고사 한 세트 */
export const exams = createTable(
	"exam",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		/** URL 슬러그 (예: "2026-suneung-korean") */
		slug: d.text({ length: 128 }).notNull().unique(),
		title: d.text({ length: 256 }).notNull(),
		description: d.text(),
		level: d.text({ enum: EXAM_LEVELS }).notNull(),
		/** 과목명 (예: "국어", "수학", "영어") */
		subject: d.text({ length: 128 }),
		/** 권장 응시 시간(분). null이면 무제한 */
		durationMinutes: d.integer({ mode: "number" }),
		/** 공개 여부. false면 목록에 노출하지 않음 */
		published: d.integer({ mode: "boolean" }).default(false).notNull(),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("exam_level_idx").on(t.level),
		index("exam_published_idx").on(t.published),
	],
);

/** 모의고사에 속한 개별 문항 */
export const questions = createTable(
	"question",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		examId: d
			.integer({ mode: "number" })
			.notNull()
			.references(() => exams.id, { onDelete: "cascade" }),
		/** 시험 내 출제 순서 */
		order: d.integer({ mode: "number" }).notNull().default(0),
		type: d.text({ enum: QUESTION_TYPES }).notNull().default("single"),
		/** 발문 */
		prompt: d.text().notNull(),
		/** 지문/보기 등 부가 텍스트 (선택) */
		passage: d.text(),
		/**
		 * 단답형(short) 정답. 복수 허용답안은 JSON 배열 문자열로 저장
		 * (예: `["book","books"]`). 평문 단일값도 하위호환으로 허용.
		 * 객관식은 choices.isCorrect를 사용한다.
		 */
		answerKey: d.text(),
		/** 서술형(essay) 모범답안. 제출 후에만 노출하며 자동채점하지 않는다. */
		modelAnswer: d.text(),
		/** 배점 */
		points: d.integer({ mode: "number" }).notNull().default(1),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
	}),
	(t) => [index("question_exam_idx").on(t.examId)],
);

/** 객관식 선택지 */
export const choices = createTable(
	"choice",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		questionId: d
			.integer({ mode: "number" })
			.notNull()
			.references(() => questions.id, { onDelete: "cascade" }),
		order: d.integer({ mode: "number" }).notNull().default(0),
		content: d.text().notNull(),
		isCorrect: d.integer({ mode: "boolean" }).default(false).notNull(),
	}),
	(t) => [index("choice_question_idx").on(t.questionId)],
);

/**
 * 한 번의 응시 기록.
 *
 * 현재는 익명 응시(anonId)만 사용한다. 추후 로그인 기능을 붙일 때를 대비해
 * `userId`를 nullable 컬럼으로 예약해 두었다 — 별도 user 테이블을 나중에
 * 추가해도 기존 데이터/스키마를 깨지 않는다.
 */
export const attempts = createTable(
	"attempt",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		examId: d
			.integer({ mode: "number" })
			.notNull()
			.references(() => exams.id, { onDelete: "cascade" }),
		/** 로그인 사용자 식별자 (미래 확장용, 지금은 항상 null) */
		userId: d.text({ length: 128 }),
		/** 익명 식별자 (브라우저에서 생성한 UUID 등) */
		anonId: d.text({ length: 64 }),
		status: d.text({ enum: ATTEMPT_STATUS }).default("in_progress").notNull(),
		/** 획득 점수 (제출 후 채워짐) */
		score: d.integer({ mode: "number" }),
		/** 만점 (제출 시점의 총 배점) */
		maxScore: d.integer({ mode: "number" }),
		startedAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		submittedAt: d.integer({ mode: "timestamp" }),
	}),
	(t) => [
		index("attempt_exam_idx").on(t.examId),
		index("attempt_user_idx").on(t.userId),
		index("attempt_anon_idx").on(t.anonId),
	],
);

/** 응시에서 문항별로 제출한 답 */
export const attemptAnswers = createTable(
	"attempt_answer",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		attemptId: d
			.integer({ mode: "number" })
			.notNull()
			.references(() => attempts.id, { onDelete: "cascade" }),
		questionId: d
			.integer({ mode: "number" })
			.notNull()
			.references(() => questions.id, { onDelete: "cascade" }),
		/** 객관식 단일선택(single)에서 고른 선택지 */
		selectedChoiceId: d
			.integer({ mode: "number" })
			.references(() => choices.id, { onDelete: "set null" }),
		/** 객관식 복수선택(multiple)에서 고른 선택지 id들. JSON 배열 문자열 */
		selectedChoiceIds: d.text(),
		/** 단답형/서술형 응답 텍스트 */
		responseText: d.text(),
		/** 채점 결과 */
		isCorrect: d.integer({ mode: "boolean" }),
		earnedPoints: d.integer({ mode: "number" }).default(0),
	}),
	(t) => [index("attempt_answer_attempt_idx").on(t.attemptId)],
);

/**
 * 사용자 계정 (DIY auth, 라이브러리 없음).
 * 비밀번호는 WebCrypto PBKDF2 해시 문자열로만 저장한다 (`password.ts`).
 */
export const users = createTable(
	"user",
	(d) => ({
		id: d.text({ length: 36 }).primaryKey(), // crypto.randomUUID()
		email: d.text({ length: 256 }).notNull().unique(),
		name: d.text({ length: 128 }),
		/** `pbkdf2$<iterations>$<saltB64url>$<hashB64url>` */
		passwordHash: d.text().notNull(),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
	}),
	(t) => [index("user_email_idx").on(t.email)],
);

/**
 * 세션. PK는 세션 토큰의 SHA-256 해시(base64url)이고, 원문 토큰은
 * httpOnly 쿠키에만 담긴다 (DB 유출 시에도 토큰을 바로 쓸 수 없도록).
 */
export const sessions = createTable(
	"session",
	(d) => ({
		id: d.text({ length: 64 }).primaryKey(), // sha256(token) base64url
		userId: d
			.text({ length: 36 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		expiresAt: d.integer({ mode: "timestamp" }).notNull(),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
	}),
	(t) => [index("session_user_idx").on(t.userId)],
);

/* -------------------------------------------------------------------------- */
/* Relations                                                                   */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const examsRelations = relations(exams, ({ many }) => ({
	questions: many(questions),
	attempts: many(attempts),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
	exam: one(exams, { fields: [questions.examId], references: [exams.id] }),
	choices: many(choices),
}));

export const choicesRelations = relations(choices, ({ one }) => ({
	question: one(questions, {
		fields: [choices.questionId],
		references: [questions.id],
	}),
}));

export const attemptsRelations = relations(attempts, ({ one, many }) => ({
	exam: one(exams, { fields: [attempts.examId], references: [exams.id] }),
	answers: many(attemptAnswers),
}));

export const attemptAnswersRelations = relations(attemptAnswers, ({ one }) => ({
	attempt: one(attempts, {
		fields: [attemptAnswers.attemptId],
		references: [attempts.id],
	}),
	question: one(questions, {
		fields: [attemptAnswers.questionId],
		references: [questions.id],
	}),
	selectedChoice: one(choices, {
		fields: [attemptAnswers.selectedChoiceId],
		references: [choices.id],
	}),
}));
