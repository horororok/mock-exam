# Mock Exam — 온라인 모의고사

중학교 · 고등학교 · 대학 · 대학원 모의고사를 풀고 바로 채점받는 사이트.
**문제+답지 JSON을 업로드하면 모의고사가 자동 생성**되며, 객관식(단일/복수)·단답형·서술형을 지원한다.

T3 Stack(Next.js + tRPC + Drizzle + Tailwind)을 Cloudflare Workers(OpenNext) + D1로 배포한다.
전부 **Cloudflare 무료 플랜**에서 동작한다.

## 요구 사항

- `pnpm`
- `wrangler` (Cloudflare CLI)

## 로컬 개발

```sh
pnpm install

# 로컬 D1 상태 초기화 (최초 1회) — .wrangler 로컬 sqlite 생성
pnpm wrangler d1 execute mock-exam-db --local --command "SELECT 1"

pnpm db:migrate    # 스키마 적용 (로컬 D1)
pnpm db:seed       # 샘플 모의고사 입력 (로컬, 선택)
pnpm dev           # http://localhost:3600
```

## 시험 등록

우상단 **`+ 시험 등록`**(`/admin/upload`)에서 JSON을 붙여넣거나 `.json` 파일을 올리면 검증 → 미리보기 → 생성.
형식과 채점 방식은 **[docs/upload-guide.md](./docs/upload-guide.md)**, 예시는 [docs/sample-exam.json](./docs/sample-exam.json).

> ⚠️ `/admin/upload`은 현재 인증이 없다. 공개 배포 전 반드시 보호할 것.

## 데이터 모델

`src/server/db/schema.ts`

- `exam` — 모의고사 한 세트 (level: 중/고/대/대학원, subject, 슬러그, 공개 여부)
- `question` — 문항 (`single` / `multiple` / `short` / `essay`), `answerKey`(단답 허용답안 JSON), `modelAnswer`(서술형)
- `choice` — 객관식 선택지 (`isCorrect`)
- `attempt` — 응시 기록 (현재 익명 `anonId`, 추후 로그인용 `userId` 컬럼 예약)
- `attemptAnswer` — 문항별 제출 답안 + 채점 결과

채점은 서버(`src/server/api/routers/exam.ts`)에서만 수행하며, 정답·모범답안은 제출 전 클라이언트로 내려보내지 않는다.
서술형은 자동채점 대신 제출 후 모범답안 표시 + 자기채점.

## 마이그레이션

```sh
pnpm db:generate        # 스키마 변경 → 마이그레이션 SQL 생성
pnpm db:migrate         # 로컬 D1 적용
pnpm db:migrate:prod    # 원격 D1 적용 (.dev.vars 필요)
```

## 빌드 / 배포

```sh
pnpm build       # next build
pnpm preview     # OpenNext 빌드 + 로컬 워커 미리보기
pnpm deploy      # OpenNext 빌드 + Cloudflare 배포
```

Cloudflare 최초 설정, GitHub Actions 자동 배포, 무료 한도는 **[docs/deployment.md](./docs/deployment.md)** 참고.

## D1 바인딩

Worker는 `DB`라는 이름의 D1 바인딩을 사용한다 (`wrangler.jsonc`).
