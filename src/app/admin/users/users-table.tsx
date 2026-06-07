"use client";

import { useSession } from "~/components/auth/auth-provider";
import { useModal } from "~/components/modal/modal-provider";
import { useToast } from "~/components/toast/toast-provider";
import { Loading, Spinner } from "~/components/ui/spinner";
import { api } from "~/trpc/react";

const dateFmt = new Intl.DateTimeFormat("ko-KR", {
	dateStyle: "medium",
	timeStyle: "short",
});

export function UsersTable() {
	const { user: me } = useSession();
	const toast = useToast();
	const { openModal, closeModal } = useModal();
	const utils = api.useUtils();

	const list = api.user.list.useQuery();
	const del = api.user.delete.useMutation({
		onSuccess: () => {
			toast.success("회원을 삭제했습니다");
			void utils.user.list.invalidate();
		},
		onError: (e) => toast.error(`삭제 실패: ${e.message}`),
	});

	function confirmDelete(id: string, email: string) {
		openModal(
			<div>
				<h2 className="text-lg font-bold">회원을 삭제할까요?</h2>
				<p className="mt-2 text-sm text-slate-600">
					<strong>{email}</strong> 계정과 해당 회원의 세션·응시 기록이 모두
					삭제됩니다. 되돌릴 수 없습니다.
				</p>
				<div className="mt-5 flex justify-end gap-2">
					<button
						type="button"
						onClick={closeModal}
						className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
					>
						취소
					</button>
					<button
						type="button"
						onClick={() => {
							closeModal();
							del.mutate({ id });
						}}
						className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
					>
						삭제
					</button>
				</div>
			</div>,
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">
					회원 {list.data ? `(${list.data.length})` : ""}
				</h2>
			</div>

			{list.isLoading && <Loading />}

			{list.error && (
				<p className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
					목록을 불러오지 못했습니다: {list.error.message}
				</p>
			)}

			{list.data && list.data.length === 0 && (
				<p className="text-sm text-slate-500">가입한 회원이 없습니다.</p>
			)}

			{list.data && list.data.length > 0 && (
				<ul className="flex flex-col gap-2">
					{list.data.map((u) => {
						const isMe = me?.id === u.id;
						return (
							<li
								key={u.id}
								className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="min-w-0">
									<p className="truncate font-medium">
										{u.email}
										{isMe && (
											<span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
												나
											</span>
										)}
									</p>
									<p className="mt-0.5 text-xs text-slate-500">
										{u.name ? `${u.name} · ` : ""}
										가입 {dateFmt.format(u.createdAt)} · 응시 {u.attemptCount}회
									</p>
								</div>
								{!isMe && (
									<button
										type="button"
										onClick={() => confirmDelete(u.id, u.email)}
										disabled={del.isPending}
										className="inline-flex shrink-0 items-center justify-center self-start rounded-lg border border-rose-300 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50 sm:self-auto"
									>
										{del.isPending ? <Spinner size="sm" /> : "삭제"}
									</button>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
