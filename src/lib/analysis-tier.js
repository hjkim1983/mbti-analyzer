/**
 * Free(빠른 추정) / Premium(심층 리포트) 티어 상수 및 서버 검증
 * — 클라이언트·API 라우트에서 공통 사용
 *
 * 비용: Free는 Gemini를 **짧은 출력 전용 스키마**로만 호출(풀 리포트 미생성).
 * Premium은 별도 풍부 스키마로 호출한다.
 */

/** 디바이스당 무료 Free 분석 횟수 */
export const FREE_LIMIT = 3;

export const MAX_IMAGES_FREE = 3;
export const MAX_IMAGES_PREMIUM = 10;

export const ANALYSIS_MODE = {
  FREE: "free",
  PREMIUM: "premium",
};

/** API·DB 레거시 값(simple/deep)을 free/premium으로 통일 */
export function normalizeAnalysisMode(raw) {
  if (raw === ANALYSIS_MODE.PREMIUM || raw === "deep") {
    return ANALYSIS_MODE.PREMIUM;
  }
  if (raw === ANALYSIS_MODE.FREE || raw === "simple") {
    return ANALYSIS_MODE.FREE;
  }
  return ANALYSIS_MODE.FREE;
}

/**
 * @param {{ mode: string, images: unknown[], memo?: string }} p
 * @returns {{ ok: true } | { ok: false, status: number, error: string, message: string, freeCount?: { used: number, remaining: number } }}
 */
export function validateAnalysisRequest({ mode, images, memo }) {
  const list = Array.isArray(images) ? images : [];
  const memoTrim = (memo && String(memo).trim()) || "";
  const m = normalizeAnalysisMode(mode);

  if (m === ANALYSIS_MODE.FREE) {
    if (list.length < 1 || list.length > MAX_IMAGES_FREE) {
      return {
        ok: false,
        status: 400,
        error: "INVALID_INPUT",
        message: `빠른 추정은 캡처 ${MAX_IMAGES_FREE}장 이하로 올려주세요`,
      };
    }
    if (memoTrim.length > 0) {
      return {
        ok: false,
        status: 400,
        error: "INVALID_INPUT",
        message:
          "무료 빠른 추정에서는 캡처만 사용해요. 관계·소통 리포트는 프리미엄 탭에서 선택 입력할 수 있어요",
      };
    }
  } else {
    if (list.length < 1 || list.length > MAX_IMAGES_PREMIUM) {
      return {
        ok: false,
        status: 400,
        error: "INVALID_INPUT",
        message: `프리미엄 리포트는 캡처 1~${MAX_IMAGES_PREMIUM}장이 필요해요`,
      };
    }
  }

  return { ok: true };
}

/**
 * 결제가 필요한지 (서버 기준)
 * - Premium: 항상 결제 후 분석
 * - Free: 무료 횟수(FREE_LIMIT) 이상이면 더 이상 무료 호출 불가
 */
export function requiresPayment(mode, countBeforeThisRequest) {
  const m = normalizeAnalysisMode(mode);
  if (m === ANALYSIS_MODE.PREMIUM) return true;
  return countBeforeThisRequest >= FREE_LIMIT;
}
