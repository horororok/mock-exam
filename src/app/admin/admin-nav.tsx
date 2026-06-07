"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
	{ href: "/admin/exams", label: "시험 관리" },
	{ href: "/admin/users", label: "계정 관리" },
	{ href: "/admin/upload", label: "새 시험 등록" },
];

export function AdminNav() {
	const pathname = usePathname();
	return (
		<nav className="mt-4 flex flex-wrap gap-1 border-b border-slate-200">
			{TABS.map((tab) => {
				const active =
					pathname === tab.href || pathname.startsWith(`${tab.href}/`);
				return (
					<Link
						key={tab.href}
						href={tab.href}
						className={
							active
								? "border-b-2 border-sky-600 px-3 py-2 text-sm font-semibold text-sky-700"
								: "px-3 py-2 text-sm text-slate-500 hover:text-slate-800"
						}
					>
						{tab.label}
					</Link>
				);
			})}
		</nav>
	);
}
