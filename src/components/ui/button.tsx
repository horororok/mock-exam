import { Spinner } from "./spinner";

function cn(...classes: Array<string | false | undefined | null>): string {
	return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
	primary: "bg-sky-600 font-semibold text-white hover:bg-sky-700",
	secondary:
		"border border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
	danger: "border border-rose-300 bg-white text-rose-600 hover:bg-rose-50",
};

const SIZES: Record<Size, string> = {
	sm: "px-3 py-1.5",
	md: "px-5 py-2",
};

type ButtonProps = React.ComponentProps<"button"> & {
	variant?: Variant;
	size?: Size;
	/** true면 자동으로 disabled + 스피너 표시 (중복 클릭 방지) */
	loading?: boolean;
	/** 로딩 중 표시할 텍스트(없으면 children 유지) */
	loadingText?: React.ReactNode;
};

/**
 * 공용 버튼. `loading`이면 자동으로 비활성화되고 스피너를 보여준다.
 * `disabled`(검증 전 등)와 조합 가능 — 실제 disabled = disabled || loading.
 */
export function Button({
	variant = "primary",
	size = "md",
	loading = false,
	loadingText,
	disabled,
	type = "button",
	className,
	children,
	...rest
}: ButtonProps) {
	return (
		<button
			type={type}
			disabled={disabled || loading}
			className={cn(
				"inline-flex items-center justify-center gap-2 rounded-lg text-sm transition disabled:cursor-not-allowed disabled:opacity-50",
				VARIANTS[variant],
				SIZES[size],
				className,
			)}
			{...rest}
		>
			{loading && <Spinner size="sm" />}
			{loading ? (loadingText ?? children) : children}
		</button>
	);
}
