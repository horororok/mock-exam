import { Loading } from "~/components/ui/spinner";

// 관리자 콘솔 내 탭 이동 시 셸(상단 탭)은 유지한 채 본문만 로딩 표시
export default function AdminLoading() {
	return <Loading />;
}
