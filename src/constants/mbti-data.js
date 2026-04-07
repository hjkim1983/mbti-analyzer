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

/** 행동·관찰 중심 태그 (MBTI 방향 힌트 최소화) */
export const BEHAVIOR_TAGS = [
  "먼저 연락을 자주 함",
  "한 번에 길게 답함",
  "답장이 짧고 빠름",
  "위로보다 해결책을 말함",
  "약속 시간을 구체적으로 정함",
  "약속이 자주 바뀜",
  "이모티콘/ㅋㅋ를 많이 씀",
  "감정 표현이 적음",
  "질문을 자주 던짐",
  "말을 돌려서 함",
];

/** @deprecated BEHAVIOR_TAGS 사용 권장 */
export const QUICK_TAGS = BEHAVIOR_TAGS;

export const RELATIONSHIP_OPTIONS = [
  { value: "friend", label: "친구" },
  { value: "some", label: "썸" },
  { value: "lover", label: "연인" },
  { value: "coworker", label: "직장동료" },
  { value: "family", label: "가족" },
  { value: "other", label: "기타" },
];

export const CONTEXT_OPTIONS = [
  { value: "daily", label: "일상" },
  { value: "work", label: "업무" },
  { value: "conflict", label: "갈등" },
  { value: "comfort", label: "위로" },
  { value: "plan", label: "약속" },
  { value: "casual", label: "잡담" },
];

export function getRelationshipLabel(value) {
  if (!value || typeof value !== "string") return "";
  const o = RELATIONSHIP_OPTIONS.find((x) => x.value === value);
  return o?.label ?? "";
}

export function getContextLabel(value) {
  if (!value || typeof value !== "string") return "";
  const o = CONTEXT_OPTIONS.find((x) => x.value === value);
  return o?.label ?? "";
}

export function getMbtiMeta(type) {
  return (
    MBTI_META[type?.toUpperCase()] || {
      emoji: "🔮",
      title: "미지의 유형",
      color: "#9CA3AF",
    }
  );
}
