import "./globals.css";

/** 서버/클라이언트에서 canonical·OG URL 등 절대 URL 해석을 일치시키기 위함 */
const rawSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const siteUrl =
  rawSite && /^https?:\/\//i.test(rawSite) ? rawSite : "http://localhost:3000";

const docTitle = "카톡 MBTI 스캐너 — 말투로 MBTI를 읽어드릴게요";
const docDescription =
  "카카오톡 대화 캡처와 프로필 사진을 AI가 분석하여 MBTI를 추론합니다.";

/**
 * `export const metadata`만으로도 Next가 MetadataTree를 쓰지만, 스트리밍 메타 여부는
 * next.config의 htmlLimitedBots 등으로 제어. 루트는 수동 `<head>`로 title/OG를 고정.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{docTitle}</title>
        <meta name="description" content={docDescription} />
        <meta property="og:title" content={docTitle} />
        <meta property="og:description" content={docDescription} />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={siteUrl} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
