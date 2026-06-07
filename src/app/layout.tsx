import "~/styles/globals.css";
import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { SITE_NAME, SITE_URL } from "~/lib/site";
import { getServerUser } from "~/server/auth";

import { Providers } from "./providers";

const TITLE = "Mock Exam — 모의고사 풀이";
const DESCRIPTION =
	"중학교·고등학교·대학·대학원 모의고사를 풀고 바로 채점받는 온라인 모의고사 사이트";

export const metadata: Metadata = {
	// OG/아이콘 URL을 절대경로로 만들기 위한 기준. 도메인 변경은 ~/lib/site 에서.
	metadataBase: new URL(SITE_URL),
	title: TITLE,
	description: DESCRIPTION,
	// 아이콘(favicon.ico, icon.svg)·OG(opengraph-image.png)는 src/app 파일 규칙으로 자동 적용됨
	openGraph: {
		title: TITLE,
		description: DESCRIPTION,
		type: "website",
		locale: "ko_KR",
		siteName: SITE_NAME,
	},
	twitter: {
		card: "summary_large_image",
		title: TITLE,
		description: DESCRIPTION,
	},
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
