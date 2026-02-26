import "./globals.css";

export const metadata = {
  title: "카톡 MBTI 스캐너 — 말투로 MBTI를 읽어드릴게요",
  description:
    "카카오톡 대화 캡처와 프로필 사진을 AI가 분석하여 MBTI를 추론합니다.",
  openGraph: {
    title: "카톡 MBTI 스캐너",
    description: "말투로 MBTI를 읽어드릴게요",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
