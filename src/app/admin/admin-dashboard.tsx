"use client";

import Link from "next/link";

import { AdminTokenField } from "~/components/admin/admin-token-field";
import { useModal } from "~/components/modal/modal-provider";
import { useToast } from "~/components/toast/toast-provider";
import { LEVEL_LABELS } from "~/lib/exam";
import { api } from "~/trpc/react";

export function AdminDashboard() {
	const toast = useToast();
	const { openModal, closeModal } = useModal();
	const utils = api.useUtils();

	const list = api.exam.listAll.useQuery();
	const del = api.exam.delete.useMutation({
		onSuccess: (d) => {
			toast.success(`삭제되었습니다: ${d.slug}`);
			void utils.exam.listAll.invalidate();
			void utils.exam.list.invalidate();
		},
		onError: (e) => toast.error(`삭제 실패: ${e.message}`),
	});

	function confirmDelete(slug: string, title: string) {
		openModal(
			<div>
				<h2 className="text-lg font-bold">시험을 삭제할까요?</h2>
				<p className="mt-2 text-sm text-slate-600">
					<strong>{title}</strong> 의 모든 문항·선택지·응시 기록이 함께
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
							del.mutate({ slug });
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
		<div className="mt-6 flex flex-col gap-5">
			<AdminTokenField />

			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">시험 목록</h2>
				<Link
					href="/admin/upload"
					className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
				>
					+ 새 시험 등록
				</Link>
			</div>

			{list.isLoading && <p className="text-sm text-slate-500">불러오는 중…</p>}

			{list.error && (
				<p className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
					목록을 불러오지 못했습니다: {list.error.message}
					{list.error.data?.code === "UNAUTHORIZED" &&
						" — 위에 관리자 토큰을 입력하고 저장하세요."}
				</p>
			)}

			{list.data && list.data.length === 0 && (
				<p className="text-sm text-slate-500">등록된 시험이 없습니다.</p>
			)}

			{list.data && list.data.length > 0 && (
				<ul className="flex flex-col gap-2">
					{list.data.map((exam) => (
						<li
							key={exam.id}
							className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
						>
							<div className="min-w-0">
								<div className="flex items-center gap-2 text-xs text-slate-500">
									<span className="rounded-full bg-slate-100 px-2 py-0.5">
										{LEVEL_LABELS[exam.level]}
									</span>
									{exam.subject && <span>{exam.subject}</span>}
									<span>· 문항 {exam.questionCount}</span>
									{!exam.published && (
										<span className="text-amber-600">· 비공개</span>
									)}
								</div>
								<p className="truncate font-medium">{exam.title}</p>
							</div>
							<div className="flex shrink-0 items-center gap-2">
								<Link
									href={`/exam/${exam.slug}`}
									className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
								>
									열기
								</Link>
								<button
									type="button"
									onClick={() => confirmDelete(exam.slug, exam.title)}
									disabled={del.isPending}
									className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50"
								>
									삭제
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
