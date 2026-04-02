"use client";

import HomeContent from "@/components/HomeContent";

/**
 * next/dynamic(ssr:false) 분리 청크가 Webpack HMR/캐시와 맞물릴 때
 * `__webpack_modules__[moduleId] is not a function` 가 날 수 있어 정적 import 유지.
 * 초기 로딩 스피너는 HomeContent 내부 isMounted로 처리.
 */
export default function Page() {
  return <HomeContent />;
}
