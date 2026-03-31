import { ANALYSIS_MODE } from "@/lib/analysis-tier";

/**
 * 로딩 단계 문구 (이미지 장수·메모 유무·모드별)
 * @param {boolean} isMulti
 * @param {boolean} hasMemo
 * @param {number} imageCount
 * @param {string} [mode] ANALYSIS_MODE.FREE | PREMIUM
 */
export function getLoadingSteps(
  isMulti,
  hasMemo,
  imageCount,
  mode = ANALYSIS_MODE.FREE,
) {
  const premium = mode === ANALYSIS_MODE.PREMIUM;

  if (isMulti) {
    const steps = [
      `${imageCount}장 이미지 분석 준비`,
      "대화·프로필 영역 분리",
      premium ? "프리미엄 근거 정리" : "MBTI 데이터와 대조",
      "말투 패턴 추출",
      "프로필 분위기 읽기",
      hasMemo ? "추가 메모 반영" : "이미지 신호 종합",
      premium ? "프리미엄 해석" : "빠른 추정 정리",
      "결과 카드 생성",
    ];
    return {
      steps,
      messages: steps,
      icons: ["📸", "🔮", "💬", "📸", hasMemo ? "✏️" : "😄", premium ? "✨" : "🧠", "📋"],
    };
  }

  const steps = [
    "이미지 분석 준비",
    "대화 톤 읽기",
    premium ? "프리미엄 근거 정리" : "MBTI 데이터와 대조",
    hasMemo ? "메모 반영" : "말투 패턴 추출",
    premium ? "프리미엄 해석" : "빠른 추정 정리",
    "결과 생성",
  ];
  return {
    steps,
    messages: steps,
    icons: ["💬", "✏️", premium ? "✨" : "🧠", "📋"],
  };
}
