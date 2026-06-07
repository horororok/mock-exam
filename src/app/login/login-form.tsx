"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "~/components/toast/toast-provider";
import { Button } from "~/components/ui/button";
import { signIn, signUp } from "~/server/auth/actions";

export function LoginForm() {
	const router = useRouter();
	const toast = useToast();
	const [mode, setMode] = useState<"signin" | "signup">("signin");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setPending(true);
		setError(null);
		const res =
			mode === "signin"
				? await signIn({ email, password })
				: await signUp({ email, password, name });
		setPending(false);
		if (!res.ok) {
			setError(res.error);
			toast.error(res.error);
			return;
		}
		toast.success(mode === "signin" ? "로그인되었습니다" : "가입되었습니다");
		router.push("/");
		router.refresh();
	}

	return (
		<div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<div className="mb-5 flex gap-2">
				{(
					[
						["signin", "로그인"],
						["signup", "회원가입"],
					] as const
				).map(([value, label]) => (
					<button
						key={value}
						type="button"
						onClick={() => {
							setMode(value);
							setError(null);
						}}
						className={
							mode === value
								? "rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white"
								: "rounded-lg px-4 py-2 text-sm text-slate-500 hover:bg-slate-100"
						}
					>
						{label}
					</button>
				))}
			</div>

			<form onSubmit={onSubmit} className="flex flex-col gap-3">
				{mode === "signup" && (
					<label className="text-sm">
						<span className="text-slate-600">이름 (선택)</span>
						<input
							type="text"
							aria-label="이름"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
						/>
					</label>
				)}
				<label className="text-sm">
					<span className="text-slate-600">이메일</span>
					<input
						type="email"
						aria-label="이메일"
						required
						autoComplete="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
					/>
				</label>
				<label className="text-sm">
					<span className="text-slate-600">비밀번호 (8자 이상)</span>
					<input
						type="password"
						aria-label="비밀번호"
						required
						minLength={8}
						autoComplete={
							mode === "signin" ? "current-password" : "new-password"
						}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
					/>
				</label>

				{error && <p className="text-sm text-rose-600">{error}</p>}

				<Button
					type="submit"
					loading={pending}
					loadingText="처리 중…"
					className="mt-1"
				>
					{mode === "signin" ? "로그인" : "회원가입"}
				</Button>
			</form>
		</div>
	);
}
