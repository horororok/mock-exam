import type { ExamLevel } from "~/server/db/schema";
import { EXAM_LEVELS } from "~/server/db/schema";

/** 학교급 표시용 한글 라벨 */
export const LEVEL_LABELS: Record<ExamLevel, string> = {
	middle: "중학교",
	high: "고등학교",
	university: "대학",
	graduate: "대학원",
};

/** 랜딩에서 노출할 학교급 순서 */
export const LEVEL_ORDER = EXAM_LEVELS;

/**
 * 익명 응시 식별자. 같은 브라우저의 응시 기록을 느슨하게 묶기 위한 용도이며
 * 로그인을 대체하지 않는다. (추후 인증 추가 시 userId로 대체/연결)
 */
export function getAnonId(): string {
	if (typeof window === "undefined") return "";
	const KEY = "mock-exam:anon-id";
	let id = window.localStorage.getItem(KEY);
	if (!id) {
		id = crypto.randomUUID();
		window.localStorage.setItem(KEY, id);
	}
	return id;
}
