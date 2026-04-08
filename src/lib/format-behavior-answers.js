import { BEHAVIOR_QUESTION_IDS } from "@/constants/behavior-questions";

/**
 * 행동 문항 답변을 Gemini 프롬프트용 한국어 요약으로 변환합니다.
 * @param {Record<string, string>} answers — { q1: "A"|"B"|"skip", ... }
 */
export function formatBehaviorAnswers(answers) {
  if (!answers || typeof answers !== "object") return "";

  const questionMap = {
    q1: {
      question: "여행 얘기 스타일",
      A: "팩트 위주 (S 신호)",
      B: "느낌 위주 (N 신호)",
    },
    q2: {
      question: "단톡방 참여도",
      A: "적극 참여 (E 신호)",
      B: "필요시만 참여 (I 신호)",
    },
    q3: {
      question: "대화 흐름",
      A: "순차적 (J 신호)",
      B: "자유롭게 전환 (P 신호)",
    },
    q4: {
      question: "감사 표현",
      A: "간결함 (T 신호)",
      B: "풍부한 감정 (F 신호)",
    },
    q5: {
      question: "추천 스타일",
      A: "구체적 설명 (S 신호)",
      B: "느낌/분위기 (N 신호)",
    },
    q6: {
      question: "경청 스타일",
      A: "끝까지 듣고 반응 (I 신호)",
      B: "중간 리액션 (E 신호)",
    },
    q7: {
      question: "카톡 시간 패턴",
      A: "일정함 (J 신호)",
      B: "불규칙 (P 신호)",
    },
    q8: {
      question: "판단 스타일",
      A: "즉시 판단 (T+J 신호)",
      B: "여지 남김 (F+P 신호)",
    },
    q9: {
      question: "마무리 스타일",
      A: "짧게 끊음 (T 신호)",
      B: "따뜻하게 마무리 (F 신호)",
    },
    q10: {
      question: "칭찬 스타일",
      A: "구체적 (T+S 신호)",
      B: "포괄적 (F+N 신호)",
    },
  };

  return BEHAVIOR_QUESTION_IDS.map((qId) => {
    const choice = answers[qId];
    const q = questionMap[qId];
    if (!q) return null;
    if (choice === "skip") return `${q.question}: 판단 불가`;
    if (choice === "A" || choice === "B") {
      return `${q.question}: ${q[choice]}`;
    }
    return null;
  })
    .filter(Boolean)
    .join("\n");
}
