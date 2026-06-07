import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata = {
	title: "로그인 — Mock Exam",
};

export default function LoginPage() {
	return (
		<main className="min-h-screen bg-slate-50 text-slate-900">
			<div className="container mx-auto max-w-md px-4 py-12">
				<Link href="/" className="text-sm text-sky-600 hover:underline">
					← 목록으로
				</Link>
				<h1 className="mt-4 text-2xl font-bold">로그인 / 회원가입</h1>
				<p className="mt-1 text-sm text-slate-600">
					로그인하면 응시 기록이 계정에 저장됩니다. (선택)
				</p>
				<LoginForm />
			</div>
		</main>
	);
}
