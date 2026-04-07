/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * 개발 중 기본 Webpack 소스맵(eval-*)은 `eval()`을 쓰므로,
   * 엄격한 CSP(script-src에 unsafe-eval 없음)와 충돌할 수 있음.
   * 클라이언트 dev 번들만 eval 없는 소스맵으로 전환.
   * @see https://webpack.js.org/configuration/devtool/
   */
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.devtool = "cheap-module-source-map";
    }
    return config;
  },
  /**
   * 개발 중 Metadata 경계 하이드레이션 경고 완화(이중 마운트 제거).
   * 프로덕션 빌드 동작과 무관하며, 필요 시 true로 되돌릴 수 있음.
   */
  reactStrictMode: false,
  transpilePackages: ["@portone/browser-sdk"],
  /**
   * 스트리밍 메타데이터용 `<div hidden><Suspense>` 경계가 켜지면 확장(엔디크·WXT)이 DOM을 바꿔
   * 하이드레이션 불일치가 난다. UA가 패턴에 매칭되면 해당 래퍼 없이 메타 해석.
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/htmlLimitedBots
   */
  htmlLimitedBots: /.*/,
};

export default nextConfig;
