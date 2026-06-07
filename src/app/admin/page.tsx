import Link from "next/link";

import { getServerUser } from "~/server/auth";
import { getAdminEmails, isAdminEmail } from "~/server/auth/admin";

import { AdminDashboard } from "./admin-dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "관리 — Mock Exam" };

export default async function AdminPage() {
	const user = await getServerUser();
	const admins = getAdminEmails();
	const canAdmin =
		admins.length === 0
			? process.env.NODE_ENV !== "production"
			: isAdminEmail(user?.email);

	return (
		<main className="min-h-screen bg-slate-50 text-slate-900">
			<div className="container mx-auto max-w-3xl px-4 py-10">
				<Link href="/" className="text-sm text-sky-600 hover:underline">
					← 목록으로
				</Link>
				<h1 className="mt-4 text-2xl font-bold">시험 관리</h1>

				{canAdmin ? (
					<>
						<p className="mt-1 text-slate-600">시험을 등록·확인·삭제합니다.</p>
						<AdminDashboard />
					</>
				) : (
					<div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
						{user ? (
							<p>
								관리자 권한이 없습니다. <code>ADMIN_EMAILS</code>에 등록된
								계정으로 로그인하세요. (현재: {user.email})
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
