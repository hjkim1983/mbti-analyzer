import { ANALYSIS_MODE } from "@/lib/analysis-tier";

/**
 * 로딩 단계 — 실제 API 단계와 1:1이 아니라 **체감 속도**용 3단계로 고정
 * @param {boolean} _isMulti — 하위 호환 (미사용)
 * @param {boolean} _hasMemo
 * @param {number} imageCount
 * @param {string} [mode] ANALYSIS_MODE.FREE | PREMIUM
 */
export function getLoadingSteps(
  _isMulti,
  _hasMemo,
  imageCount,
  mode = ANALYSIS_MODE.FREE,
) {
  const premium = mode === ANALYSIS_MODE.PREMIUM;

  const steps = [
    "1차 판단 · 캡처 확인 중",
    premium
      ? "대화·프로필 신호로 근거 추출"
      : "말투 패턴으로 빠른 추정",
    premium ? "프리미엄 리포트 정리" : "결과 카드 만들기",
  ];

  const icons = ["🔍", premium ? "✨" : "🧠", "📋"];

  return {
    steps,
    messages: steps,
    icons,
    /** 부가 설명 (선택 UI) */
    subtitle:
      imageCount > 0
        ? `${imageCount}장 기준으로 분석 중이에요`
        : "분석 중이에요",
  };
}

/**
 * 로딩 화면 «줄어드는 막대»용 예상 시간(ms).
 * 실제 API 응답과 무관하며, 체감 대기 완화용 시각 피드백만 제공.
 */
export function getLoadingEstimateMs(mode = ANALYSIS_MODE.FREE) {
  return mode === ANALYSIS_MODE.PREMIUM ? 56000 : 28000;
}
