/**
 * 로컬 개발 전용 플래그.
 * - 서버: NODE_ENV=development 이고 .env 의 DEV_MODE=true
 * - 클라이언트: next.config 가 주입한 NEXT_PUBLIC_DEV_MODE (dev 서버 기동 시에만 true)
 *
 * 프로덕션 빌드(next build)에서는 NEXT_PUBLIC 이 비어 있어 클라이언트에서도 꺼짐.
 */

export function isDevModeServer() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_MODE === "true"
  );
}

/** 클라이언트 컴포넌트·훅에서만 사용 */
export function isDevModeClient() {
  return process.env.NEXT_PUBLIC_DEV_MODE === "true";
}

/**
 * 로그용: 이미지 base64 제거(용량 폭주 방지)
 * @param {unknown} body
 */
export function summarizeAnalyzeBodyForLog(body) {
  if (!body || typeof body !== "object") return body;
  const b = /** @type {Record<string, unknown>} */ ({ ...body });
  if (Array.isArray(b.images)) {
    b.images = b.images.map((img) => {
      if (!img || typeof img !== "object") return img;
      const i = /** @type {Record<string, unknown>} */ ({ ...img });
      if (typeof i.base64Data === "string") {
        i.base64Data = `[base64 ${i.base64Data.length} chars]`;
      }
      return i;
    });
  }
  return b;
}
