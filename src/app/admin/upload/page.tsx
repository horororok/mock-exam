import Link from "next/link";

import { UploadForm } from "./upload-form";
import { UploadGuide } from "./upload-guide";

export const metadata = {
	title: "시험 등록 — Mock Exam",
};

export default function UploadPage() {
	return (
		<main className="min-h-screen bg-slate-50 text-slate-900">
			<div className="container mx-auto max-w-3xl px-4 py-10">
				<Link href="/" className="text-sm text-sky-600 hover:underline">
					← 목록으로
				</Link>

				<h1 className="mt-4 text-2xl font-bold">시험 등록 (JSON 업로드)</h1>
				<p className="mt-1 text-slate-600">
					문제와 답지를 담은 JSON을 붙여넣거나 파일로 올리면 모의고사가
					생성됩니다.
				</p>

				<div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
					⚠️ 이 페이지는 <strong>인증이 없습니다</strong>. 공개 배포 전에 반드시
					보호하세요. 형식은 <code>docs/upload-guide.md</code> 참고.
				</div>

				<UploadGuide />

				<UploadForm />
			</div>
		</main>
	);
}
