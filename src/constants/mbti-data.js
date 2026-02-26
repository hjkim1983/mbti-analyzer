export const MBTI_META = {
  ENFP: { emoji: "🌟", title: "열정적인 활동가", color: "#FF6B6B" },
  ENFJ: { emoji: "🌻", title: "정의로운 사회운동가", color: "#FFB347" },
  ENTP: { emoji: "💡", title: "뜨거운 논쟁가", color: "#F39C12" },
  ENTJ: { emoji: "👑", title: "대담한 통솔자", color: "#2ECC71" },
  INFP: { emoji: "🦋", title: "열정적인 중재자", color: "#DDA0DD" },
  INFJ: { emoji: "🌿", title: "선의의 옹호자", color: "#A29BFE" },
  INTP: { emoji: "🔬", title: "논리적인 사색가", color: "#3498DB" },
  INTJ: { emoji: "🧠", title: "전략적 분석가", color: "#4ECDC4" },
  ESFP: { emoji: "🎭", title: "자유로운 영혼의 연예인", color: "#FD79A8" },
  ESFJ: { emoji: "🤝", title: "사교적인 외교관", color: "#E74C3C" },
  ESTP: { emoji: "⚡", title: "모험을 즐기는 사업가", color: "#00BCD4" },
  ESTJ: { emoji: "📊", title: "엄격한 관리자", color: "#8E44AD" },
  ISFP: { emoji: "🎨", title: "호기심 많은 예술가", color: "#E91E63" },
  ISFJ: { emoji: "🛡️", title: "용감한 수호자", color: "#1ABC9C" },
  ISTP: { emoji: "🔧", title: "만능 재주꾼", color: "#607D8B" },
  ISTJ: { emoji: "📋", title: "청렴결백한 논리주의자", color: "#34495E" },
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
