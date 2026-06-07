import { Loading } from "~/components/ui/spinner";

// 페이지 이동 시 대상 페이지가 준비될 때까지 보여주는 기본 로딩 UI
export default function RootLoading() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-slate-50">
			<Loading />
		</div>
	);
}
