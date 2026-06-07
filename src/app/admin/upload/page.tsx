import Link from "next/link";

import { getServerUser } from "~/server/auth";
import { getAdminEmails, isAdminEmail } from "~/server/auth/admin";

import { UploadForm } from "./upload-form";
import { UploadGuide } from "./upload-guide";

export const dynamic = "force-dynamic";
export const metadata = {
	title: "시험 등록 — Mock Exam",
};

export default async function UploadPage() {
	const user = await getServerUser();
	const admins = getAdminEmails();
	const canAdmin =
		admins.length === 0
			? process.env.NODE_ENV !== "production"
			: isAdminEmail(user?.email);

	return (
		<main className="min-h-screen bg-slate-50 text-slate-900">
			<div className="container mx-auto max-w-3xl px-4 py-10">
				<Link href="/admin" className="text-sm text-sky-600 hover:underline">
					← 시험 관리
				</Link>

				<h1 className="mt-4 text-2xl font-bold">시험 등록 (JSON 업로드)</h1>

				{canAdmin ? (
					<>
						<p className="mt-1 text-slate-600">
							문제와 답지를 담은 JSON을 붙여넣거나 파일로 올리면 모의고사가
							생성됩니다.
						</p>
						<UploadGuide />
						<UploadForm />
					</>
				) : (
					<div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
						{user ? (
							<p>
								관리자 권한이 없습니다. <code>ADMIN_EMAILS</code>에 등록된
								계정만 시험을 등록할 수 있습니다.
							</p>
						) : (
							<p>
								관리자만 접근할 수 있습니다.{" "}
								<Link href="/login" className="text-sky-600 underline">
									로그인
								</Link>
							</p>
						)}
					</div>
				)}
			</div>
		</main>
	);
}
