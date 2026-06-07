/**
 * Cloudflare D1는 **쿼리당 바인딩 파라미터가 최대 100개**다.
 * 다중행 insert(행수 × 컬럼수)나 inArray(id 개수)가 이를 넘으면 쿼리가 실패하므로
 * 배열을 나눠서 여러 번 실행해야 한다.
 *
 * @example
 *   for (const part of chunk(rows, 12)) await db.insert(t).values(part);
 */
export function chunk<T>(arr: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		out.push(arr.slice(i, i + size));
	}
	return out;
}
