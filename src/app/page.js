"use client";

import HomeContent from "@/components/HomeContent";

/**
 * next/dynamic(ssr:false) 분리 청크가 Webpack HMR/캐시와 맞물릴 때
 * `__webpack_modules__[moduleId] is not a function` 가 날 수 있어 정적 import 유지.
 * isMounted 스피너 게이트는 SSR HTML과 클라이언트 첫 페인트 불일치·확장 프로그램 DOM 수정 시
 * hydration 오류를 유발할 수 있어 제거함.
 */
export default function Page() {
  return <HomeContent />;
}
