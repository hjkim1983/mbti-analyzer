export const MBTI_META = {
  // EN__ — 밝은 파랑/스카이 계열
  ENFP: { emoji: "🌟", title: "열정적인 활동가",        color: "#38BDF8" },
  ENFJ: { emoji: "🌻", title: "정의로운 사회운동가",    color: "#0EA5E9" },
  ENTP: { emoji: "💡", title: "뜨거운 논쟁가",          color: "#06B6D4" },
  ENTJ: { emoji: "👑", title: "대담한 통솔자",           color: "#0891B2" },
  // IN__ — 진한 파랑/인디고 계열
  INFP: { emoji: "🦋", title: "열정적인 중재자",        color: "#818CF8" },
  INFJ: { emoji: "🌿", title: "선의의 옹호자",           color: "#6366F1" },
  INTP: { emoji: "🔬", title: "논리적인 사색가",        color: "#3B82F6" },
  INTJ: { emoji: "🧠", title: "전략적 분석가",           color: "#2563EB" },
  // ES__ — 밝은 청록/틸 계열
  ESFP: { emoji: "🎭", title: "자유로운 영혼의 연예인", color: "#22D3EE" },
  ESFJ: { emoji: "🤝", title: "사교적인 외교관",        color: "#0284C7" },
  ESTP: { emoji: "⚡", title: "모험을 즐기는 사업가",   color: "#0369A1" },
  ESTJ: { emoji: "📊", title: "엄격한 관리자",           color: "#1D4ED8" },
  // IS__ — 중간 파랑/슬레이트 계열
  ISFP: { emoji: "🎨", title: "호기심 많은 예술가",     color: "#60A5FA" },
  ISFJ: { emoji: "🛡️", title: "용감한 수호자",          color: "#4F86C6" },
  ISTP: { emoji: "🔧", title: "만능 재주꾼",             color: "#475569" },
  ISTJ: { emoji: "📋", title: "청렴결백한 논리주의자",  color: "#334155" },
};

export const QUICK_TAGS = [
  "말이 많아요",
  "말이 적어요",
  "리액션이 과해요",
  "감정 표현 잘 함",
  "논리적으로 말함",
  "즉흥적인 편",
  "계획적인 편",
  "공감을 잘 해줘요",
  "유머 감각 있음",
  "진지한 편",
  "답장이 빨라요",
  "답장이 느려요",
];

export function getMbtiMeta(type) {
  return (
    MBTI_META[type?.toUpperCase()] || {
      emoji: "🔮",
      title: "미지의 유형",
      color: "#9CA3AF",
    }
  );
}
