/**
 * 이미지 장수에 따라 "N번 이미지 분석 중..." 단계를 동적으로 생성
 * imageCount가 2 이상이면 각 이미지별 분석 단계를 앞에 삽입
 */
export function getLoadingSteps(isMulti, hasMemo, imageCount = 1) {
  // 이미지별 분석 단계 (2장 이상일 때만 생성)
  const perImageSteps =
    isMulti && imageCount >= 2
      ? Array.from({ length: imageCount }, (_, i) => ({
          step: `${i + 1}번 캡처 이미지 분석`,
          message: `${i + 1}번 이미지 분석 중...`,
          icon: ["📸", "🔍", "💬", "📝", "🖼️"][i] || "📸",
        }))
      : [];

  if (isMulti) {
    const imageStepLabels  = perImageSteps.map((s) => s.step);
    const imageStepMsgs    = perImageSteps.map((s) => s.message);
    const imageStepIcons   = perImageSteps.map((s) => s.icon);

    return {
      steps: [
        ...imageStepLabels,
        "전체 맥락 파악 중",
        "말투 & 어조 패턴 분석",
        "프로필 분위기 스캔",
        hasMemo ? "추가 정보 종합 분석" : "이모티콘 & 반응 패턴 분석",
        "MBTI 데이터와 대조",
      ],
      messages: [
        ...imageStepMsgs,
        "전체 맥락 파악 중...",
        "카카오톡 말투 패턴 파악 중...",
        "프로필 분위기 & 상태 메시지 스캔 중...",
        hasMemo ? "추가 정보 종합 중..." : "이모티콘 사용 빈도 계산 중...",
        "MBTI 데이터와 대조 중...",
        "분석 완료! 결과를 정리하고 있어요...",
      ],
      icons: [
        ...imageStepIcons,
        "🔮",
        "💬",
        "📸",
        hasMemo ? "✏️" : "😄",
        "🧠",
      ],
    };
  }

  if (hasMemo) {
    return {
      steps: [
        "말투 & 어조 패턴 분석",
        "추가 입력 정보 분석",
        "MBTI 데이터와 대조",
        "분석 결과 정리",
      ],
      messages: [
        "말투 패턴 분석 중...",
        "입력하신 정보 분석 중...",
        "MBTI 데이터와 대조 중...",
        "분석 완료! 결과를 정리하고 있어요...",
      ],
      icons: ["💬", "✏️", "🧠", "📋"],
    };
  }

  return {
    steps: [
      "말투 & 어조 패턴 분석",
      "이모티콘 사용 빈도 계산",
      "문장 길이 & 구조 파악",
      "MBTI 데이터와 대조",
    ],
    messages: [
      "카카오톡 말투 패턴 분석 중...",
      "이모티콘 빈도 계산 중...",
      "MBTI 데이터와 대조 중...",
      "분석 완료! 결과를 정리하고 있어요...",
    ],
    icons: ["💬", "😄", "📝", "🧠"],
  };
}
