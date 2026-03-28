/**
 * 무료(간단) / 유료(심층) 분석 티어 상수 및 서버 검증
 * — 클라이언트·API 라우트에서 공통 사용
 */

/** 디바이스당 무료 간단 분석 횟수 */
export const FREE_LIMIT = 5;
export const MAX_IMAGES_SIMPLE = 3;
export const MAX_IMAGES_DEEP = 10;
/** 심층 분석 시 메모(말투·행동 등) 최소 글자수 */
export const MEMO_MIN_DEEP = 20;

export const ANALYSIS_MODE = {
  SIMPLE: "simple",
  DEEP: "deep",
};

/**
 * @param {{ mode: string, images: unknown[], memo?: string }} p
 * @returns {{ ok: true } | { ok: false, status: number, error: string, message: string, freeCount?: { used: number, remaining: number } }}
 */
export function validateAnalysisRequest({ mode, images, memo }) {
  const list = Array.isArray(images) ? images : [];
  const memoTrim = (memo && String(memo).trim()) || "";
  const m = mode === ANALYSIS_MODE.DEEP ? ANALYSIS_MODE.DEEP : ANALYSIS_MODE.SIMPLE;

  if (m === ANALYSIS_MODE.SIMPLE) {
    if (list.length < 1 || list.length > MAX_IMAGES_SIMPLE) {
      return {
        ok: false,
        status: 400,
        error: "INVALID_INPUT",
        message: `간단 분석은 캡처 ${MAX_IMAGES_SIMPLE}장 이하로 올려주세요`,
      };
    }
    if (memoTrim.length > 0) {
      return {
        ok: false,
        status: 400,
        error: "INVALID_INPUT",
        message: "간단 분석에서는 추가 텍스트를 사용할 수 없습니다. 유료 심층 탭을 이용해주세요",
      };
    }
  } else {
    if (list.length < 1 || list.length > MAX_IMAGES_DEEP) {
      return {
        ok: false,
        status: 400,
        error: "INVALID_INPUT",
        message: `심층 분석은 캡처 1~${MAX_IMAGES_DEEP}장이 필요합니다`,
      };
    }
    if (memoTrim.length < MEMO_MIN_DEEP) {
      return {
        ok: false,
        status: 400,
        error: "INVALID_INPUT",
        message: `심층 분석은 말투·행동 등 추가 정보를 ${MEMO_MIN_DEEP}자 이상 입력해주세요`,
      };
    }
  }

  return { ok: true };
}

/**
 * 결제가 필요한지 (서버 기준)
 * - 심층: 항상 결제
 * - 간단: 무료 횟수(FREE_LIMIT) 초과 시 결제
 */
export function requiresPayment(mode, countBeforeThisRequest) {
  if (mode === ANALYSIS_MODE.DEEP) return true;
  return countBeforeThisRequest >= FREE_LIMIT;
}
