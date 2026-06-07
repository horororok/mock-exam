import "~/styles/globals.css";
import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { getServerUser } from "~/server/auth";

import { Providers } from "./providers";

export const metadata: Metadata = {
	title: "Mock Exam — 모의고사 풀이",
	description:
		"중학교·고등학교·대학·대학원 모의고사를 풀고 바로 채점받는 온라인 모의고사 사이트",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const user = await getServerUser();
	return (
		<html className={`${geist.variable}`} lang="ko">
			<body>
				<Providers initialUser={user}>{children}</Providers>
			</body>
		</html>
	);
}
