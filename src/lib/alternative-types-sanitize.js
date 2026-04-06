/**
 * 프리미엄 alternativeTypes: 최종 mbtiType과 겹치는 후보를 제거하고 순서를 채움.
 * (기존에는 first 비어 있을 때 최종 유형을 넣어 '헷갈릴 수 있는 유형'에 결과가 중복 표시됨)
 */

function cleanMbtiCode(s) {
  const t = String(s || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);
  return t.length === 4 && t !== "XXXX" ? t : "";
}

/**
 * @param {object|null|undefined} raw - API의 alternativeTypes
 * @param {string} finalMbtiRaw - 결과의 mbtiType
 * @returns {object|null}
 */
export function sanitizeAlternativeTypes(raw, finalMbtiRaw) {
  if (!raw || typeof raw !== "object") return null;

  const finalCode = cleanMbtiCode(finalMbtiRaw);
  const a = raw;

  /** @type {{ mbtiType: string, oneLiner: string, shared: string, difference: string }[]} */
  const slots = [];

  if (a.first && typeof a.first === "object") {
    slots.push({
      mbtiType: cleanMbtiCode(a.first.mbtiType),
      oneLiner: typeof a.first.oneLiner === "string" ? a.first.oneLiner : "",
      shared: "",
      difference: "",
    });
  }
  if (a.second && typeof a.second === "object") {
    slots.push({
      mbtiType: cleanMbtiCode(a.second.mbtiType),
      oneLiner: "",
      shared: typeof a.second.shared === "string" ? a.second.shared : "",
      difference:
        typeof a.second.difference === "string" ? a.second.difference : "",
    });
  }
  if (a.third && typeof a.third === "object") {
    slots.push({
      mbtiType: cleanMbtiCode(a.third.mbtiType),
      oneLiner: "",
      shared: typeof a.third.shared === "string" ? a.third.shared : "",
      difference:
        typeof a.third.difference === "string" ? a.third.difference : "",
    });
  }

  const seen = new Set();
  const kept = [];
  for (const s of slots) {
    const t = s.mbtiType;
    if (!t) continue;
    if (finalCode && t === finalCode) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    kept.push(s);
  }

  const [f, sec, th] = [kept[0], kept[1], kept[2]];

  const secondGuessMerged = cleanMbtiCode(a.secondGuess || a.second?.mbtiType);
  const secondGuess =
    secondGuessMerged && secondGuessMerged !== finalCode
      ? secondGuessMerged
      : f?.mbtiType || "";

  return {
    secondGuess,
    distinction: typeof a.distinction === "string" ? a.distinction : "",
    whyFirst: typeof a.whyFirst === "string" ? a.whyFirst : "",
    first: f
      ? { mbtiType: f.mbtiType, oneLiner: f.oneLiner }
      : { mbtiType: "", oneLiner: "" },
    second: sec
      ? {
          mbtiType: sec.mbtiType,
          shared: sec.shared,
          difference: sec.difference,
        }
      : null,
    third: th
      ? {
          mbtiType: th.mbtiType,
          shared: th.shared,
          difference: th.difference,
        }
      : null,
  };
}
