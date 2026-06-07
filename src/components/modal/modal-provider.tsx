"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { createPortal } from "react-dom";

type ModalContextValue = {
	/** 임의의 React 노드를 모달로 띄운다. */
	openModal: (content: React.ReactNode) => void;
	closeModal: () => void;
	isOpen: boolean;
};

const ModalContext = createContext<ModalContextValue | null>(null);

/**
 * `const { openModal, closeModal } = useModal()` 후 `openModal(<MyDialog/>)`.
 * 명령형으로 어떤 컴포넌트든 모달로 띄울 수 있다.
 */
export function useModal(): ModalContextValue {
	const ctx = useContext(ModalContext);
	if (!ctx) throw new Error("useModal must be used within <ModalProvider>");
	return ctx;
}

export function ModalProvider({ children }: { children: React.ReactNode }) {
	const [content, setContent] = useState<React.ReactNode | null>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const closeModal = useCallback(() => setContent(null), []);
	const openModal = useCallback(
		(node: React.ReactNode) => setContent(node),
		[],
	);

	const isOpen = content != null;

	// Escape로 닫기 + 열려 있는 동안 바디 스크롤 잠금
	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeModal();
		};
		document.addEventListener("keydown", onKey);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prevOverflow;
		};
	}, [isOpen, closeModal]);

	const value = useMemo<ModalContextValue>(
		() => ({ openModal, closeModal, isOpen }),
		[openModal, closeModal, isOpen],
	);

	return (
		<ModalContext.Provider value={value}>
			{children}
			{mounted &&
				isOpen &&
				createPortal(
					<div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
						{/* backdrop */}
						<button
							type="button"
							aria-label="모달 닫기"
							onClick={closeModal}
							className="absolute inset-0 cursor-default bg-black/50"
						/>
						{/* panel — 네이티브 <dialog>로 다이얼로그 시맨틱 제공 */}
						<dialog
							open
							aria-modal="true"
							className="relative z-[91] m-0 max-h-[85vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-6 shadow-xl"
						>
							{content}
						</dialog>
					</div>,
					document.body,
				)}
		</ModalContext.Provider>
	);
}
