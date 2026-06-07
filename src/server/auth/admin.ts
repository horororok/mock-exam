import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * 관리자 토큰을 읽는다. `ADMIN_TOKEN`(.dev.vars / Cloudflare secret)이 설정돼
 * 있으면 그 값을, 없으면 undefined를 반환한다.
 *
 * undefined면 /admin 계열 엔드포인트(create/delete/listAll)는 **열린 상태**가 된다
 * (로컬·미설정 시 그대로 사용 가능). 공개 배포 시 secret을 설정해 보호한다.
 */
export function getAdminToken(): string | undefined {
	try {
		const env = getCloudflareContext().env as unknown as Record<
			string,
			unknown
		>;
		const token = env.ADMIN_TOKEN;
		return typeof token === "string" && token.length > 0 ? token : undefined;
	} catch {
		return undefined;
	}
}
