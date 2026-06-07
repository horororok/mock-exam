# Cloudflare 배포 가이드

`mock-exam`은 Cloudflare Workers(OpenNext) + D1로 배포한다. 전부 **무료 플랜**에서 동작한다.

## 무료 플랜 한도 (2026-06 기준)

| 리소스       | 무료 한도           | 비고                  |
| ------------ | ------------------- | --------------------- |
| Workers 요청 | 10만/일             | 실질 상한선           |
| Workers CPU  | 호출당 10ms         |                       |
| D1 읽기      | 500만 row/일        | 문제 조회는 읽기 위주 |
| D1 쓰기      | 10만 row/일         | 답안 제출 시          |
| D1 저장      | 5GB(총), DB당 500MB | 텍스트라 여유         |

무료를 벗어나는 경우: ① 하루 10만 요청 초과 → Workers Paid $5/월, ② 커스텀 도메인 구입비
(`*.workers.dev` 서브도메인은 무료).

## 사전 준비 (최초 1회)

```sh
cd mock-exam            # 반드시 프로젝트 폴더 안에서
pnpm wrangler login
pnpm wrangler d1 create mock-exam-db   # 출력된 database_id 복사
```

- 로컬 개발만 할 거면 `wrangler.jsonc`의 `database_id`는 placeholder로 둬도 된다(로컬 D1은 바인딩 이름만 사용).
- 로컬에서 직접 배포하려면 `wrangler.jsonc`의 `REPLACE_WITH_YOUR_DATABASE_ID`를 실제 id로 교체.

## 원격 D1 마이그레이션 / 시드

```sh
cp .dev.vars.example .dev.vars   # 값 채우기 (CLOUDFLARE_ACCOUNT_ID / _D1_DATABASE_ID / _TOKEN)
pnpm db:migrate:prod             # 원격 스키마 적용
pnpm db:seed:prod                # (선택) 샘플 데이터
```

## 수동 배포

```sh
pnpm deploy   # opennextjs-cloudflare build && deploy
```

## GitHub Actions 자동 배포

`.github/workflows/ci.yml`: `main` push 시 lint·typecheck·build 통과 후 자동 배포(PR 제외).

저장소 **Settings → Secrets and variables → Actions** 에 등록:

| Secret                         | 용도                                                |
| ------------------------------ | --------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID`        | 계정 ID                                             |
| `CLOUDFLARE_D1_DATABASE_ID`    | 배포 시 `wrangler.jsonc`에 주입 + 마이그레이션 대상 |
| `CLOUDFLARE_D1_TOKEN`          | D1 HTTP 드라이버 토큰(마이그레이션용)               |
| `CLOUDFLARE_WORKERS_API_TOKEN` | Worker 배포용 API 토큰                              |

CI는 배포 단계에서 `drizzle-kit migrate`(원격 D1 스키마 적용) → `pnpm run deploy`(Worker 배포)
순으로 실행한다. D1 `database_id`는 `wrangler.jsonc`에 직접 들어 있다(비밀값 아님). `drizzle-kit migrate`는
d1-http 드라이버용으로 `CLOUDFLARE_D1_DATABASE_ID`·`CLOUDFLARE_TOKEN` 환경변수를 사용한다.

> 특정 저장소에서만 워크플로를 돌리려면 각 job에 `if: github.repository == '<owner>/<repo>'` 가드를 추가.

## 관리자 보호 (ADMIN_TOKEN)

`/admin`(시험 등록·삭제)은 `ADMIN_TOKEN`이 설정돼 있으면 보호된다(`x-admin-token` 헤더 일치 필요).
미설정 시에는 **열린 상태**이므로 공개 배포 전 반드시 설정한다.

```sh
# 로컬: .dev.vars 에 추가
ADMIN_TOKEN='원하는-긴-랜덤-문자열'

# 프로덕션: Cloudflare secret 으로 등록
pnpm wrangler secret put ADMIN_TOKEN
```

설정 후, 관리 화면(`/admin`, `/admin/upload`) 상단 **관리자 토큰** 입력란에 같은 값을 넣고 저장하면
등록/삭제가 가능하다(브라우저 localStorage에 저장 → 요청 헤더로 전송).

## 배포 전 체크리스트

- [ ] **`ADMIN_TOKEN` 설정** (로컬 `.dev.vars` + 프로덕션 `wrangler secret put`) — /admin 보호
- [ ] 원격 D1 마이그레이션 적용 완료
- [ ] GitHub Secrets 4종 등록
- [ ] `wrangler.jsonc`의 worker `name`/D1 `database_name` 확인 (`mock-exam` / `mock-exam-db`)
