function cn(...classes: Array<string | false | undefined | null>): string {
	return classes.filter(Boolean).join(" ");
}

/**
 * 회전 스피너. 색은 currentColor를 따르므로(버튼/텍스트 색 상속) 어디서나 사용 가능.
 * 장식 요소라 aria-hidden — 의미는 감싸는 쪽(버튼 텍스트, Loading 라벨)이 전달한다.
 */
export function Spinner({
	size = "md",
	className,
}: {
	size?: "sm" | "md" | "lg";
	className?: string;
}) {
	const sizeCls =
		size === "sm"
			? "h-4 w-4 border-2"
			: size === "lg"
				? "h-8 w-8 border-[3px]"
				: "h-6 w-6 border-2";
	return (
		<span
			aria-hidden="true"
			className={cn(
				"inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent",
				sizeCls,
				className,
			)}
		/>
	);
}

/**
 * 영역/페이지 로딩 표시 (스피너 + 라벨). 쿼리 로딩, route loading.tsx 등에 사용.
 * `<output>`이라 스크린리더에 로딩 상태로 announce된다.
 */
export function Loading({
	label = "불러오는 중…",
	className,
}: {
	label?: string;
	className?: string;
}) {
	return (
		<output
			className={cn(
				"flex items-center justify-center gap-3 py-10 text-slate-500",
				className,
			)}
		>
			<Spinner />
			<span className="text-sm">{label}</span>
		</output>
	);
}
