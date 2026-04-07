"use client";

import dynamic from "next/dynamic";

/**
 * 브라우저 확장이 SSR로 내려온 <header> 등을 DOM에서 바꿔 hydration 오류가 나는 것을 피하기 위해
 * HomeContent는 클라이언트에서만 마운트한다(ssr: false → 해당 트리는 서버 HTML에 없음).
 */
const HomeContent = dynamic(() => import("@/components/HomeContent"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50/30 to-white">
      <div
        className="w-8 h-8 rounded-full border-4 border-amber-300 border-t-amber-500 animate-spin"
        aria-label="로딩 중"
      />
    </div>
  ),
});

export default function HomeContentDynamic() {
  return <HomeContent />;
}
