/**
 * 행동 관찰 문항 (2단계 입력) — 7문항, 순서·id 고정. axis/weight는 UI에 노출하지 않음.
 */
export const BEHAVIOR_QUESTIONS = [
  {
    id: "q1",
    question: "이 사람이 여행 다녀와서 얘기할 때",
    optionA: "어디 갔고, 뭐 먹었고, 얼마 들었는지 팩트 위주",
    optionB: "분위기, 느낌, 깨달은 점 위주",
    axis: "SN",
    weightA: "S",
    weightB: "N",
  },
  {
    id: "q2",
    question: "이 사람은 단톡방에서",
    optionA: "적극적으로 참여하고 반응도 잘함",
    optionB: "가만히 있다가 필요할 때만 말함",
    axis: "EI",
    weightA: "E",
    weightB: "I",
  },
  {
    id: "q3",
    question: "이 사람이 카톡으로 얘기할 때",
    optionA: "한 주제 끝내고 다음 주제로 넘어감",
    optionB: "얘기하다가 갑자기 딴 얘기로 튐",
    axis: "JP",
    weightA: "J",
    weightB: "P",
  },
  {
    id: "q4",
    question: "이 사람이 고마울 때",
    optionA: '"고마워!" 한마디로 끝',
    optionB: '"아 진짜?? 고마워ㅠㅠ 너 아니었으면 어쩔뻔😭💕"',
    axis: "TF",
    weightA: "T",
    weightB: "F",
  },
  {
    id: "q5",
    question: "이 사람이 영화나 드라마 추천할 때",
    optionA: "줄거리를 구체적으로 설명해줌",
    optionB: '"분위기가 좋아" "느낌이 독특해" 식으로 말함',
    axis: "SN",
    weightA: "S",
    weightB: "N",
  },
  {
    id: "q6",
    question: "이 사람이 누군가 얘기를 길게 하면",
    optionA: "끝까지 듣고 한 번에 반응함",
    optionB: '중간중간 리액션함 ("헐", "진짜?", "ㅋㅋㅋ")',
    axis: "EI",
    weightA: "I",
    weightB: "E",
  },
  {
    id: "q7",
    question: "이 사람이 카톡 대화를 마무리할 때",
    optionA: '"ㅇㅋ", "알겠어" 짧게 끊음',
    optionB: '"그래 잘자~!", "오늘 고마웠어💕" 따뜻하게 마무리',
    axis: "TF",
    weightA: "T",
    weightB: "F",
  },
];

export const BEHAVIOR_QUESTION_IDS = BEHAVIOR_QUESTIONS.map((q) => q.id);
