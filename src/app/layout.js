import "./globals.css";

/** 서버/클라이언트에서 OG·canonical 등 절대 URL 해석을 일치시키기 위함(하이드레이션 완화) */
const rawSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const siteUrl =
  rawSite && /^https?:\/\//i.test(rawSite) ? rawSite : "http://localhost:3000";

/** openGraph는 스트리밍 메타 경계에서 서버/클라 불일치가 나기 쉬워 title/description만 유지(OG는 필요 시 generateMetadata로 추가) */
export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "카톡 MBTI 스캐너 — 말투로 MBTI를 읽어드릴게요",
  description:
    "카카오톡 대화 캡처와 프로필 사진을 AI가 분석하여 MBTI를 추론합니다.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
