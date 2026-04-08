/**
 * 프리미엄 마지막 단계 — 관찰자가 상대의 성향을 복수 선택하는 특징 태그.
 * API memo 필드에는 라벨 문장으로 합쳐져 전달됩니다.
 */

export const PREMIUM_OBSERVER_TRAIT_GROUPS = [
  {
    title: "대화·에너지",
    items: [
      { id: "chat_active", label: "말이 많고 반응이 빨라요" },
      { id: "chat_quiet", label: "말수는 적고 듣는 편이에요" },
      { id: "emoji_rich", label: "이모티콘·스티커를 자주 써요" },
      { id: "emoji_spare", label: "이모티콘은 거의 안 써요" },
    ],
  },
  {
    title: "사고·반응",
    items: [
      { id: "fact_first", label: "사실·정확한 정보를 중시해요" },
      { id: "mood_first", label: "분위기·관계를 먼저 챙겨요" },
      { id: "logic_debate", label: "논리적으로 따지는 편이에요" },
      { id: "empathy_first", label: "공감·위로를 먼저 해요" },
    ],
  },
  {
    title: "계획·일상",
    items: [
      { id: "plan_keep", label: "약속·일정을 잘 지키는 편이에요" },
      { id: "flex_spont", label: "즉흥적이고 융통성이 있어요" },
      { id: "plan_ahead", label: "미리 계획을 세우는 말을 자주 해요" },
      { id: "go_with_flow", label: "당일·그때그때 정하는 편이에요" },
    ],
  },
  {
    title: "갈등·스트레스",
    items: [
      { id: "avoid_conflict", label: "갈등·불편한 말을 피하려 해요" },
      { id: "direct_speak", label: "솔직·직설적으로 말하는 편이에요" },
      { id: "alone_recharge", label: "혼자 시간이 필요하다고 느껴져요" },
      { id: "talk_resolve", label: "바로 이야기하고 풀고 싶어 해요" },
    ],
  },
  {
    title: "기타",
    items: [
      { id: "humor", label: "유머·농담이 많아요" },
      { id: "serious_tone", label: "진지한 톤이 많아요" },
      { id: "detail_oriented", label: "디테일·꼼꼼함을 말해요" },
      { id: "big_picture", label: "전체 그림·방향 이야기를 많이 해요" },
    ],
  },
];

/** id → 라벨 (메모 합성용) */
export const PREMIUM_OBSERVER_TRAIT_BY_ID = Object.fromEntries(
  PREMIUM_OBSERVER_TRAIT_GROUPS.flatMap((g) =>
    g.items.map((t) => [t.id, t.label]),
  ),
);
