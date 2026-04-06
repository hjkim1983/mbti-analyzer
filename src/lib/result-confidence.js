/**
 * 전체 확신도 표시용 완화 — 모델이 90~95%를 자주 내더라도 과장 인상을 줄임.
 * DB 저장값(raw)은 변경하지 않고 UI·표시용으로만 사용.
 */
export function softenOverallConfidenceForDisplay(raw) {
  const x = Number(raw);
  if (!Number.isFinite(x)) return 62;
  const c = Math.round(Math.min(100, Math.max(0, x)));
  if (c <= 70) return c;
  if (c <= 80) return Math.max(52, c - 4);
  if (c <= 88) return Math.max(58, c - 6);
  return Math.min(88, c - 10);
}

/** HIGH|MEDIUM|LOW → 한글 라벨 */
export function confidenceLevelToKorean(level) {
  const u = String(level || "").toUpperCase();
  if (u === "HIGH") return "높음";
  if (u === "MEDIUM") return "보통";
  if (u === "LOW") return "낮음";
  return "보통";
}

/** 축별 indicator.confidence(0~100) → 납득 가능한 강도 라벨 */
export function axisStrengthFromConfidence(axisConf) {
  const n = Number(axisConf);
  if (!Number.isFinite(n)) return "보통";
  if (n >= 72) return "높음";
  if (n >= 48) return "보통";
  return "낮음";
}
