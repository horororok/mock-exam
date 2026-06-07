import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * 관리자 = 로그인한 사용자 중 이메일이 `ADMIN_EMAILS`(쉼표 구분, .dev.vars /
 * Cloudflare 환경변수)에 포함된 사람. 별도의 관리자 "계정"을 만들지 않고
 * 일반 계정 + 이메일 화이트리스트로 권한을 부여한다.
 *
 * 미설정 시: 개발 환경(NODE_ENV !== production)에서는 열어두고(편의),
 * 프로덕션에서는 잠근다(아무도 관리자 아님).
 */
function readEnv(key: string): string | undefined {
	try {
		const env = getCloudflareContext().env as unknown as Record<
			string,
			unknown
		>;
		const value = env[key];
		return typeof value === "string" && value.length > 0 ? value : undefined;
	} catch {
		return undefined;
	}
}

/** ADMIN_EMAILS → 소문자 이메일 배열. 미설정 시 빈 배열. */
export function getAdminEmails(): string[] {
	const raw = readEnv("ADMIN_EMAILS");
	if (!raw) return [];
	return raw
		.split(",")
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
}

/** 주어진 이메일이 관리자 화이트리스트에 있는지. */
export function isAdminEmail(email: string | null | undefined): boolean {
	if (!email) return false;
	return getAdminEmails().includes(email.toLowerCase());
}
