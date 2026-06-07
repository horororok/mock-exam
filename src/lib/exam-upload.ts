import { z } from "zod";

import { EXAM_LEVELS } from "~/server/db/schema";

/* -------------------------------------------------------------------------- */
/* 업로드 JSON 스키마                                                          */
/* -------------------------------------------------------------------------- */

const choiceSchema = z.object({
	content: z.string().min(1, "선택지 내용은 비울 수 없습니다.").max(1000),
	correct: z.boolean().optional().default(false),
});

const baseQuestionFields = {
	prompt: z.string().min(1, "발문(prompt)은 필수입니다.").max(5000),
	passage: z.string().max(20000).optional(),
	points: z.number().int().positive().max(1000).optional().default(1),
};

const singleQuestionSchema = z.object({
	type: z.literal("single"),
	...baseQuestionFields,
	choices: z
		.array(choiceSchema)
		.min(2, "객관식은 선택지가 2개 이상이어야 합니다.")
		.max(50, "선택지는 50개까지입니다."),
});

const multipleQuestionSchema = z.object({
	type: z.literal("multiple"),
	...baseQuestionFields,
	choices: z
		.array(choiceSchema)
		.min(2, "객관식은 선택지가 2개 이상이어야 합니다.")
		.max(50, "선택지는 50개까지입니다."),
});

const shortQuestionSchema = z.object({
	type: z.literal("short"),
	...baseQuestionFields,
	answers: z
		.array(z.string().min(1).max(500))
		.min(1, "단답형은 허용 답안이 1개 이상이어야 합니다.")
		.max(50, "허용 답안은 50개까지입니다."),
});

const essayQuestionSchema = z.object({
	type: z.literal("essay"),
	...baseQuestionFields,
	modelAnswer: z.string().max(20000).optional(),
});

export const questionUploadSchema = z.discriminatedUnion("type", [
	singleQuestionSchema,
	multipleQuestionSchema,
	shortQuestionSchema,
	essayQuestionSchema,
]);

export const examUploadSchema = z
	.object({
		title: z.string().min(1, "시험 제목(title)은 필수입니다."),
		/** 미지정 시 title에서 자동 생성 */
		slug: z.string().min(1).max(128).optional(),
		level: z.enum(EXAM_LEVELS, {
			errorMap: () => ({
				message: `level은 ${EXAM_LEVELS.join(" / ")} 중 하나여야 합니다.`,
			}),
		}),
		subject: z.string().optional(),
		durationMinutes: z.number().int().positive().optional(),
		description: z.string().optional(),
		published: z.boolean().optional().default(true),
		questions: z
			.array(questionUploadSchema)
			.min(1, "문항이 1개 이상이어야 합니다.")
			.max(500, "한 시험의 문항은 500개까지입니다."),
	})
	// 정답 개수 규칙은 discriminatedUnion 멤버에 .refine을 못 붙이므로 여기서 검증
	.superRefine((exam, ctx) => {
		exam.questions.forEach((q, i) => {
			if (q.type === "single") {
				const n = q.choices.filter((c) => c.correct).length;
				if (n !== 1) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["questions", i, "choices"],
						message: `${i + 1}번(단일정답)은 정답이 정확히 1개여야 합니다. 현재 ${n}개.`,
					});
				}
			} else if (q.type === "multiple") {
				const n = q.choices.filter((c) => c.correct).length;
				if (n < 1) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["questions", i, "choices"],
						message: `${i + 1}번(복수정답)은 정답이 1개 이상이어야 합니다.`,
					});
				}
			}
		});
	});

export type ExamUpload = z.infer<typeof examUploadSchema>;
export type QuestionUpload = z.infer<typeof questionUploadSchema>;

/* -------------------------------------------------------------------------- */
/* 헬퍼                                                                        */
/* -------------------------------------------------------------------------- */

/** 제목/슬러그를 URL 안전한 형태로 정규화. 한글은 유지하고 공백·특수문자는 제거. */
export function slugify(input: string): string {
	const s = input
		.normalize("NFKC")
		.toLowerCase()
		.trim()
		.replace(/[\s_]+/g, "-")
		.replace(/[^\p{L}\p{N}-]+/gu, "")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
	return s.length > 0 ? s : "exam";
}

/**
 * 단답형 정답 컬럼(answerKey)을 허용답안 배열로 파싱.
 * JSON 배열이면 그대로, 평문이면 단일 정답으로 (하위호환).
 */
export function parseAcceptedAnswers(
	answerKey: string | null | undefined,
): string[] {
	if (!answerKey) return [];
	try {
		const parsed: unknown = JSON.parse(answerKey);
		if (Array.isArray(parsed)) {
			return parsed.filter((x): x is string => typeof x === "string");
		}
	} catch {
		// JSON이 아니면 평문 단일 정답
	}
	return [answerKey];
}

/** 단답형 비교용 정규화: 앞뒤 공백 제거, 소문자화, 내부 공백 단일화. */
export function normalizeShort(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/* -------------------------------------------------------------------------- */
/* 예시 템플릿                                                                 */
/* -------------------------------------------------------------------------- */

export const SAMPLE_EXAM_UPLOAD: ExamUpload = {
	title: "샘플 모의고사 (모든 유형)",
	level: "high",
	subject: "종합",
	durationMinutes: 20,
	description: "단일정답·복수정답·단답형·서술형을 모두 담은 예시",
	published: true,
	questions: [
		{
			type: "single",
			prompt: "다음 빈칸에 알맞은 것은? She ___ to school every day.",
			points: 4,
			choices: [
				{ content: "go", correct: false },
				{ content: "goes", correct: true },
				{ content: "going", correct: false },
				{ content: "gone", correct: false },
			],
		},
		{
			type: "multiple",
			prompt: "다음 중 소수(prime number)를 모두 고르시오.",
			points: 4,
			choices: [
				{ content: "2", correct: true },
				{ content: "3", correct: true },
				{ content: "4", correct: false },
				{ content: "9", correct: false },
			],
		},
		{
			type: "short",
			prompt: "대한민국의 수도는?",
			points: 2,
			answers: ["서울", "서울특별시"],
		},
		{
			type: "essay",
			prompt: "기후변화의 원인과 대응 방안을 200자 내외로 서술하시오.",
			points: 10,
			modelAnswer:
				"온실가스 증가가 주된 원인이며, 재생에너지 확대·에너지 효율화·탄소세 등 정책적·기술적 대응이 필요하다.",
		},
	],
};

/** "예시 채우기" 버튼/문서용 보기 좋은 JSON 문자열 */
export const SAMPLE_EXAM_UPLOAD_JSON = JSON.stringify(
	SAMPLE_EXAM_UPLOAD,
	null,
	2,
);
