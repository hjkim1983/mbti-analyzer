import { BEHAVIOR_QUESTION_IDS } from "@/constants/behavior-questions";

/**
 * @param {unknown} raw
 * @returns {Record<string, "A"|"B"|"skip"> | null}
 */
export function sanitizeBehaviorAnswers(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out = {};
  for (const id of BEHAVIOR_QUESTION_IDS) {
    const v = raw[id];
    if (v !== "A" && v !== "B" && v !== "skip") return null;
    out[id] = v;
  }
  return out;
}
