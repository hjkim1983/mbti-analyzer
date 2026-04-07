/**
 * 결과 화면 근거 우선 레이아웃(4단계)용: 후보·축 데이터 정규화 및 레거시 호환
 */

const MBTI_RE = /^[EI][NS][TF][JP]$/;

export function normalizeMbtiCode(t) {
  if (!t || typeof t !== "string") return "";
  const u = t.trim().toUpperCase();
  return MBTI_RE.test(u) ? u : "";
}

/**
 * candidateTypes 우선, 없으면 mbtiRankings·mbtiType으로 후보 목록 생성
 */
export function resolveCandidateRows(candidateTypes, mbtiRankings, mbtiType) {
  if (Array.isArray(candidateTypes) && candidateTypes.length > 0) {
    return [...candidateTypes]
      .sort((a, b) => (Number(a.rank) || 99) - (Number(b.rank) || 99))
      .slice(0, 3)
      .map((c) => ({
        type: normalizeMbtiCode(String(c.type ?? "")) || "XXXX",
        rank: Number(c.rank) || 1,
        reason: String(c.reason ?? "").trim(),
      }));
  }
  const rows = [];
  if (Array.isArray(mbtiRankings)) {
    for (const r of mbtiRankings.slice(0, 3)) {
      const code = normalizeMbtiCode(r?.mbtiType);
      if (code)
        rows.push({
          type: code,
          rank: Number(r.rank) || rows.length + 1,
          reason: String(r.hint ?? "").trim(),
        });
    }
  }
  if (rows.length === 0) {
    const one = normalizeMbtiCode(mbtiType);
    if (one) rows.push({ type: one, rank: 1, reason: "추정 유형" });
  }
  return rows;
}

/**
 * API axisAnalysis 없을 때 indicators → axisAnalysis 형태로 변환
 */
export function legacyIndicatorsToAxisAnalysis(indicators) {
  if (!indicators || typeof indicators !== "object") return null;
  const keys = ["EI", "SN", "TF", "JP"];
  const out = {};
  for (const k of keys) {
    const ind = indicators[k];
    if (!ind || typeof ind !== "object") continue;
    const conf = Number(ind.confidence ?? ind.score ?? 60);
    const ev = Array.isArray(ind.evidence)
      ? ind.evidence.map((x) => String(x))
      : [];
    const interp = ind.interpretation ? String(ind.interpretation).trim() : "";
    const bNote = ind.boundaryNote ? String(ind.boundaryNote).trim() : "";
    const forEvidence = [
      ...(interp ? [interp] : []),
      ...ev.filter(Boolean).slice(0, 4),
    ];
    const againstEvidence = bNote ? [bNote] : [];
    let letter = String(ind.result ?? k[0]).trim().toUpperCase().slice(0, 1);
    if (letter !== k[0] && letter !== k[1]) letter = k[0];
    out[k] = {
      result: letter,
      confidence: Number.isFinite(conf) ? Math.min(100, Math.max(0, conf)) : 60,
      forEvidence: forEvidence.length ? forEvidence : ["(세부 근거 없음)"],
      againstEvidence,
    };
  }
  return Object.keys(out).length ? out : null;
}

export function mergeAxisAnalysis(rawAxis, legacyFromIndicators) {
  if (rawAxis && typeof rawAxis === "object" && Object.keys(rawAxis).length > 0) {
    return rawAxis;
  }
  return legacyFromIndicators;
}

/**
 * 근거 우선 레이아웃 사용 여부
 */
export function shouldUseEvidenceLayout(observedFeatures, axisAnalysis, candidateRows) {
  const obs =
    Array.isArray(observedFeatures) && observedFeatures.some(Boolean);
  const ax = axisAnalysis && Object.keys(axisAnalysis).length > 0;
  const cand = candidateRows && candidateRows.length > 0;
  return obs || ax || cand;
}

/** analysisLimitations 문자열·points, cautionAndMisread 병합 */
export function flattenLimitationLines(analysisLimitations, cautionAndMisread) {
  const lines = [];
  if (typeof analysisLimitations === "string" && analysisLimitations.trim()) {
    lines.push(analysisLimitations.trim());
  }
  if (analysisLimitations?.points?.length) {
    lines.push(...analysisLimitations.points.map(String));
  }
  if (cautionAndMisread?.points?.length) {
    lines.push(...cautionAndMisread.points.map(String));
  }
  return lines;
}
