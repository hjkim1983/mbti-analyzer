import { PREMIUM_OBSERVER_TRAIT_BY_ID } from "@/constants/premium-observer-traits";

/**
 * 관찰 특징(id 목록) + 직접 입력 문자열을 API용 memo 한 덩어리로 합칩니다.
 * @param {string[]} traitIds
 * @param {string} extraMemo 직접 입력(선택)
 */
export function composePremiumObserverMemo(traitIds, extraMemo) {
  const ids = Array.isArray(traitIds) ? traitIds : [];
  const labels = ids
    .map((id) => PREMIUM_OBSERVER_TRAIT_BY_ID[id])
    .filter(Boolean);
  const parts = [];
  if (labels.length > 0) {
    parts.push(`관찰자가 선택한 특징: ${labels.join(" · ")}`);
  }
  const extra = (extraMemo && String(extraMemo).trim()) || "";
  if (extra) parts.push(extra);
  return parts.join("\n\n");
}
