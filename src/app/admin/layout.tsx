import Link from "next/link";

import { getServerUser } from "~/server/auth";
import { getAdminEmails, isAdminEmail } from "~/server/auth/admin";

import { AdminNav } from "./admin-nav";

export const dynamic = "force-dynamic";

/**
 * 관리자 콘솔 공용 레이아웃. /admin/* 전체의 권한을 여기서 한 번만 체크하고,
 * 상단 탭(시험 관리 / 계정 관리 / 새 시험 등록)을 제공한다.
 * (데이터 보안은 각 adminProcedure가 별도로 책임)
 */
export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const user = await getServerUser();
	const admins = getAdminEmails();
	const canAdmin =
		admins.length === 0
			? process.env.NODE_ENV !== "production"
			: isAdminEmail(user?.email);

	return (
		<main className="min-h-screen bg-slate-50 text-slate-900">
			<div className="container mx-auto max-w-4xl px-4 py-10">
				<Link href="/" className="text-sm text-sky-600 hover:underline">
					← 사이트로
				</Link>
				<h1 className="mt-4 text-2xl font-bold">관리자 콘솔</h1>

				{canAdmin ? (
					<>
						<AdminNav />
						<div className="mt-6">{children}</div>
					</>
				) : (
					<div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
						{user ? (
							<p>
								관리자 권한이 없습니다. <code>ADMIN_EMAILS</code>에 등록된
								계정만 접근할 수 있습니다.
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
