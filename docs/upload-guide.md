# 모의고사 업로드 가이드

문제와 답지를 담은 **JSON**을 올리면 모의고사가 자동 생성됩니다.

## 1. 업로드 방법

1. 사이트 우상단 **`시험 관리`**(`/admin`) → **`새 시험 등록`**(`/admin/upload`)
2. JSON을 **붙여넣기** 하거나 **`.json` 파일**을 선택 (또는 `예시 채우기`)
3. **`검증 / 미리보기`** → 형식 오류와 유형별 문항 수 확인 (토스트로도 알림)
4. **`시험 생성`** → 생성된 `/exam/<slug>` 링크로 이동해 바로 풀이

> ⚠️ `/admin`·`/admin/upload`은 **`ADMIN_TOKEN`이 설정된 경우에만** 보호됩니다.
> 설정돼 있으면 화면 상단의 **관리자 토큰** 입력란에 토큰을 넣고 저장해야 등록/삭제가 됩니다
> (이 브라우저 localStorage에 저장 → `x-admin-token` 헤더로 전송). 미설정 시에는 열린 상태이니
> **공개 배포 전 반드시 `ADMIN_TOKEN`을 설정**하세요. 설정 방법은 [deployment.md](./deployment.md).
> 형식/검증은 클라이언트와 서버(tRPC `exam.create`) 양쪽에서 동일하게 수행됩니다.

## 시험 삭제

`/admin`(시험 관리)에서 각 시험의 **삭제** 버튼 → 확인 모달 → 문항·선택지·응시 기록까지 함께 삭제됩니다.

## 2. JSON 형식

```jsonc
{
	"title": "2026 국어 모의고사", // 필수
	"slug": "2026-korean", // 선택. 없으면 title에서 자동 생성(중복 시 -2, -3…)
	"level": "high", // 필수: middle | high | university | graduate
	"subject": "국어", // 선택
	"durationMinutes": 80, // 선택(권장 시간)
	"description": "...", // 선택
	"published": true, // 선택(기본 true). false면 목록에 안 보임
	"questions": [
		/* 1개 이상 */
	],
}
```

`level` 값: `middle`(중학교) · `high`(고등학교) · `university`(대학) · `graduate`(대학원)

### 문항 공통 필드

| 필드      | 필수 | 설명                                      |
| --------- | ---- | ----------------------------------------- |
| `type`    | ✓    | `single` / `multiple` / `short` / `essay` |
| `prompt`  | ✓    | 발문(문제 본문)                           |
| `passage` |      | 지문·보기 등 부가 텍스트                  |
| `points`  |      | 배점(기본 1)                              |

### 유형별 형식

**`single` — 객관식 단일정답** (정답 정확히 1개)

```json
{
	"type": "single",
	"prompt": "다음 빈칸에 알맞은 것은?",
	"points": 4,
	"choices": [
		{ "content": "go", "correct": false },
		{ "content": "goes", "correct": true }
	]
}
```

**`multiple` — 객관식 복수정답** (정답 1개 이상, 채점은 전부 맞아야 정답)

```json
{
	"type": "multiple",
	"prompt": "소수를 모두 고르시오.",
	"points": 4,
	"choices": [
		{ "content": "2", "correct": true },
		{ "content": "3", "correct": true },
		{ "content": "4", "correct": false }
	]
}
```

**`short` — 단답형** (허용 답안 배열, 대소문자·앞뒤 공백 무시하고 일치 채점)

```json
{
	"type": "short",
	"prompt": "대한민국의 수도는?",
	"points": 2,
	"answers": ["서울", "서울특별시"]
}
```

**`essay` — 서술형** (자동채점 안 함. 제출 후 모범답안 표시 + 응시자 자기채점)

```json
{
	"type": "essay",
	"prompt": "기후변화 대응 방안을 서술하시오.",
	"points": 10,
	"modelAnswer": "온실가스 감축을 위해 ..."
}
```

전체 예시: [`sample-exam.json`](./sample-exam.json)

## 3. 채점 방식

- **single / short** → 서버 자동 채점(정답이면 만점, 아니면 0)
- **multiple** → 서버 자동 **부분점수**: `배점 × (맞은 정답 수 − 틀린 선택 수) / 정답 총수` (음수는 0). 전부 맞히면 만점
- **essay** → 자동채점에서 제외. 제출 후 모범답안을 보여주고 응시자가 `정답/부분/오답`을 직접 선택해 합산(부분=배점의 절반)
- 저장되는 점수(`attempt.score`)는 자동채점 합계, `maxScore`는 서술형 포함 총 배점
- `durationMinutes`를 지정하면 응시 화면에 카운트다운 타이머가 표시되고, 시간이 끝나면 자동 제출된다

## 4. 자주 나는 검증 오류

| 메시지                                      | 원인                                                  |
| ------------------------------------------- | ----------------------------------------------------- |
| `JSON 파싱 오류`                            | JSON 문법 오류(따옴표/콤마). 마지막 항목 뒤 콤마 금지 |
| `… 단일정답은 정답이 정확히 1개여야 합니다` | `single`인데 `correct:true`가 0개 또는 2개 이상       |
| `… 복수정답은 정답이 1개 이상`              | `multiple`인데 정답을 하나도 표시 안 함               |
| `객관식은 선택지가 2개 이상`                | `choices`가 1개 이하                                  |
| `level은 … 중 하나`                         | `level` 오타                                          |

## 5. 화면 없이 스크립트로 넣기(선택)

`wrangler`로 직접 SQL을 넣고 싶다면 [`scripts/seed.sql`](../scripts/seed.sql) 형식을 참고하세요
(`pnpm db:seed` 로컬 / `pnpm db:seed:prod` 원격).
