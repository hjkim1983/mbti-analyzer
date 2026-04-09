/**
 * 프리미엄 마지막 단계 — 관찰자가 상대의 성향을 복수 선택하는 특징 태그.
 * API memo 필드에는 라벨 문장으로 합쳐져 전달됩니다.
 */

export const PREMIUM_OBSERVER_TRAIT_GROUPS = [
  {
    title: "말·대화",
    items: [
      { id: "speech_talkative", label: "말 많음" },
      { id: "speech_fast_reply", label: "답장 빠름" },
      { id: "speech_slow_reply", label: "답장 느림" },
      { id: "speech_read_ignore", label: "읽씹 자주 함" },
      { id: "speech_emoji", label: "이모티콘 잘 씀" },
      { id: "speech_yes_end", label: "ㅇㅇ로 끝내는 편" },
      { id: "speech_reaction_over", label: "리액션 과함" },
      { id: "speech_quiet", label: "말 없는 편" },
    ],
  },
  {
    title: "생각·관심사",
    items: [
      { id: "think_philo", label: "철학적인 얘기 좋아함" },
      { id: "think_ideas", label: "아이디어 많음" },
      { id: "think_deep_field", label: "한 분야 깊게 파는 편" },
      { id: "think_analysis", label: "분석 좋아함" },
      { id: "think_realistic", label: "현실적인 거 좋아함" },
    ],
  },
  {
    title: "관계·감정",
    items: [
      { id: "rel_fact_attack", label: "팩폭 잘함" },
      { id: "rel_comfort", label: "위로 잘함" },
      { id: "rel_emotion_hide", label: "감정 표현 잘 안 함" },
      { id: "rel_praise", label: "칭찬 잘함" },
      { id: "rel_quick_wit", label: "눈치 빠름" },
      { id: "rel_direct", label: "직설적임" },
    ],
  },
  {
    title: "생활",
    items: [
      { id: "life_promise_keep", label: "약속 잘 지킴" },
      { id: "life_promise_change", label: "약속 잘 바꿈" },
      { id: "life_perfectionist", label: "완벽주의" },
      { id: "life_casual", label: "대충대충" },
    ],
  },
];

/** id → 라벨 (메모 합성용) */
export const PREMIUM_OBSERVER_TRAIT_BY_ID = Object.fromEntries(
  PREMIUM_OBSERVER_TRAIT_GROUPS.flatMap((g) =>
    g.items.map((t) => [t.id, t.label]),
  ),
);
