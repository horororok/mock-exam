"use client";

import { useToast } from "~/components/toast/toast-provider";

const SKELETON = `{
  "title": "2026 국어 모의고사",
  "slug": "2026-korean",
  "level": "high",
  "subject": "국어",
  "durationMinutes": 80,
  "published": true,
  "questions": []
}`;

const EXAMPLES: { label: string; note: string; code: string }[] = [
	{
		label: "객관식 단일정답 (single)",
		note: "choices 2개 이상, 정답(correct:true) 정확히 1개",
		code: `{
  "type": "single",
  "prompt": "다음 빈칸에 알맞은 것은? She ___ to school.",
  "points": 4,
  "choices": [
    { "content": "go", "correct": false },
    { "content": "goes", "correct": true },
    { "content": "going", "correct": false }
  ]
}`,
	},
	{
		label: "객관식 복수정답 (multiple)",
		note: "정답 1개 이상 · 부분점수 채점 (맞은 수 − 틀린 수)/정답수",
		code: `{
  "type": "multiple",
  "prompt": "소수를 모두 고르시오.",
  "points": 4,
  "choices": [
    { "content": "2", "correct": true },
    { "content": "3", "correct": true },
    { "content": "4" }
  ]
}`,
	},
	{
		label: "단답형 (short)",
		note: "answers 1개 이상 · 대소문자·앞뒤공백 무시 일치",
		code: `{
  "type": "short",
  "prompt": "대한민국의 수도는?",
  "points": 2,
  "answers": ["서울", "서울특별시"]
}`,
	},
	{
		label: "서술형 (essay)",
		note: "자동채점 X · 제출 후 모범답안 표시 + 자기채점",
		code: `{
  "type": "essay",
  "prompt": "기후변화 대응 방안을 서술하시오.",
  "points": 10,
  "modelAnswer": "온실가스 감축을 위해 ..."
}`,
	},
];

export function UploadGuide() {
	const toast = useToast();

	async function copy(text: string, label: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(`${label} 복사됨`);
		} catch {
			toast.error("복사에 실패했습니다");
		}
	}

	return (
		<details className="mt-4 rounded-lg border border-slate-200 bg-white">
			<summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
				작성 가이드 / JSON 스키마 (펼치기)
			</summary>

			<div className="flex flex-col gap-4 border-t border-slate-200 p-4 text-sm">
				<div>
					<p className="font-medium">최상위 필드</p>
					<ul className="mt-1 list-disc pl-5 text-slate-600">
						<li>
							<code>title</code> (필수), <code>level</code> (필수:{" "}
							<code>middle</code>/<code>high</code>/<code>university</code>/
							<code>graduate</code>), <code>questions</code> (필수, 1개 이상)
						</li>
						<li>
							<code>slug</code>·<code>subject</code>·<code>description</code>·
							<code>published</code>(기본 true) 선택
						</li>
						<li>
							<code>durationMinutes</code>(양의 정수) 지정 시 응시 타이머 +
							시간종료 자동제출
						</li>
					</ul>
					<p className="mt-2 font-medium">문항 공통</p>
					<ul className="mt-1 list-disc pl-5 text-slate-600">
						<li>
							<code>prompt</code>(필수) · <code>passage</code>(지문, 선택) ·{" "}
							<code>points</code>(양의 정수, 기본 1)
						</li>
					</ul>
				</div>

				<CodeBlock
					title="기본 골격"
					code={SKELETON}
					onCopy={() => copy(SKELETON, "골격")}
				/>

				<div className="flex flex-col gap-3">
					<p className="font-medium">
						문항 유형별 예시 (questions 배열에 넣기)
					</p>
					{EXAMPLES.map((ex) => (
						<div key={ex.label}>
							<p className="text-xs text-slate-500">
								<strong className="text-slate-700">{ex.label}</strong> —{" "}
								{ex.note}
							</p>
							<CodeBlock
								code={ex.code}
								onCopy={() => copy(ex.code, ex.label)}
							/>
						</div>
					))}
				</div>

				<p className="text-xs text-slate-500">
					전체 형식 문서는 <code>docs/upload-guide.md</code>, 에디터 검증용
					스키마는 <code>docs/exam.schema.json</code> 참고.
				</p>
			</div>
		</details>
	);
}

function CodeBlock({
	title,
	code,
	onCopy,
}: {
	title?: string;
	code: string;
	onCopy: () => void;
}) {
	return (
		<div className="mt-1 overflow-hidden rounded-lg border border-slate-200">
			<div className="flex items-center justify-between bg-slate-50 px-3 py-1.5">
				<span className="text-xs text-slate-500">{title ?? "예시"}</span>
				<button
					type="button"
					onClick={onCopy}
					className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs hover:bg-slate-100"
				>
					복사
				</button>
			</div>
			<pre className="overflow-x-auto bg-white p-3 text-xs leading-relaxed text-slate-700">
				{code}
			</pre>
		</div>
	);
}
