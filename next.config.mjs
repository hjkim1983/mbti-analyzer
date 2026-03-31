/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * 개발 중 Metadata 경계 하이드레이션 경고 완화(이중 마운트 제거).
   * 프로덕션 빌드 동작과 무관하며, 필요 시 true로 되돌릴 수 있음.
   */
  reactStrictMode: false,
};

export default nextConfig;
