/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === "development";

const nextConfig = {
  /**
   * 브라우저 기본 요청 `/favicon.ico`가 404가 나지 않도록 SVG 파비콘으로 연결합니다.
   */
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/favicon.svg" }];
  },
  /**
   * `next dev` 전용: React/Webpack HMR이 eval을 쓰는 경로가 있어,
   * script-src에 'unsafe-eval'이 없으면 DevTools에 CSP 위반이 뜹니다.
   * 프로덕션(`next build` / `next start`)에서는 이 헤더를 붙이지 않습니다.
   *
   * 배포 환경(Vercel 대시보드 등)에서 별도 CSP를 쓰는 경우, 정책이 **교차(AND)** 되면
   * 여전히 차단될 수 있으니 프리뷰/로컬용으로 script-src에 'unsafe-eval'을 넣거나
   * 개발 호스트에서는 CSP를 끄는 것을 검토하세요.
   *
   * @portone/browser-sdk 는 `https://cdn.portone.io/v2/browser-sdk.js` 를 주입하므로
   * script-src 에 cdn.portone.io 가 없으면 [PortOne] Failed to load window.PortOne 이 납니다.
   * PG 결제창 iframe 은 frame-src https: 로 허용(개발 전용).
   */
  async headers() {
    if (!isDev) return [];
    const devCsp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://cdn.portone.io",
      "style-src 'self' 'unsafe-inline' https://cdn.portone.io",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://cdn.portone.io",
      "connect-src 'self' https: http: ws: wss:",
      "frame-src 'self' https: data:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: devCsp }],
      },
    ];
  },
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
