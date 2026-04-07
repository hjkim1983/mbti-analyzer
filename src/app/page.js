import HomeContentDynamic from "@/components/HomeContentDynamic";

/**
 * 메인 UI는 HomeContentDynamic 안에서만 로드(ssr:false).
 * 개발 중 HMR과 분리 청크가 꼬이면 `__webpack_modules__[moduleId] is not a function` 가
 * 드물게 날 수 있음 — dev 서버 재시작을 시도.
 */
export default function Page() {
  return <HomeContentDynamic />;
}
