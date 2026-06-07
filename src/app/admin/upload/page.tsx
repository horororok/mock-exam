import { UploadForm } from "./upload-form";
import { UploadGuide } from "./upload-guide";

export const metadata = { title: "시험 등록 — Mock Exam" };

export default function UploadPage() {
	return (
		<div>
			<h2 className="text-lg font-semibold">새 시험 등록 (JSON 업로드)</h2>
			<p className="mt-1 text-sm text-slate-600">
				문제와 답지를 담은 JSON을 붙여넣거나 파일로 올리면 모의고사가
				생성됩니다. 여러 개를 한 번에 올리려면 배열 또는 파일 다중 선택을
				사용하세요.
			</p>
			<UploadGuide />
			<UploadForm />
		</div>
	);
}
