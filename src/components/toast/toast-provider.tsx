"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; type: ToastType; message: string };

type ToastContextValue = {
	show: (message: string, type?: ToastType) => void;
	success: (message: string) => void;
	error: (message: string) => void;
	info: (message: string) => void;
	dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * 어디서나 `const toast = useToast()` 후 `toast.success("저장됨")` 형태로 사용.
 * 자체 Context + Portal 구현이라 외부 의존성이 없다.
 */
export function useToast(): ToastContextValue {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
	return ctx;
}

const DEFAULT_DURATION_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);
	const [mounted, setMounted] = useState(false);
	const idRef = useRef(0);

	useEffect(() => setMounted(true), []);

	const dismiss = useCallback((id: number) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const show = useCallback(
		(message: string, type: ToastType = "info") => {
			const id = (idRef.current += 1);
			setToasts((prev) => [...prev, { id, type, message }]);
			setTimeout(() => dismiss(id), DEFAULT_DURATION_MS);
		},
		[dismiss],
	);

	const value = useMemo<ToastContextValue>(
		() => ({
			show,
			success: (m) => show(m, "success"),
			error: (m) => show(m, "error"),
			info: (m) => show(m, "info"),
			dismiss,
		}),
		[show, dismiss],
	);

	return (
		<ToastContext.Provider value={value}>
			{children}
			{mounted &&
				createPortal(
					<ToastViewport toasts={toasts} onDismiss={dismiss} />,
					document.body,
				)}
		</ToastContext.Provider>
	);
}

const TYPE_STYLES: Record<ToastType, string> = {
	success: "bg-emerald-600",
	error: "bg-rose-600",
	info: "bg-slate-800",
};

function ToastViewport({
	toasts,
	onDismiss,
}: {
	toasts: Toast[];
	onDismiss: (id: number) => void;
}) {
	return (
		<div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
			{toasts.map((t) => (
				<output
					key={t.id}
					className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${TYPE_STYLES[t.type]}`}
				>
					<span className="whitespace-pre-wrap">{t.message}</span>
					<button
						type="button"
						aria-label="닫기"
						onClick={() => onDismiss(t.id)}
						className="shrink-0 text-white/70 hover:text-white"
					>
						✕
					</button>
				</output>
			))}
		</div>
	);
}
