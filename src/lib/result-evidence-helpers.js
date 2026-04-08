/**
 * 결과 화면 근거 우선 레이아웃(4단계)용: 후보·축 데이터 정규화 및 레거시 호환
 */

const MBTI_RE = /^[EI][NS][TF][JP]$/;

export function normalizeMbtiCode(t) {
  if (!t || typeof t !== "string") return "";
  const u = t.trim().toUpperCase();
  return MBTI_RE.test(u) ? u : "";
}

function clampConf(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return Math.min(100, Math.max(0, Math.round(x)));
}

/**
 * candidateTypes 우선, 없으면 mbtiRankings·mbtiType으로 후보 목록 생성.
 * 후보별 confidence가 없으면 종합 confidence(rootConf)를 기준으로 순위별로 감소 추정.
 */
export function resolveCandidateRows(
  candidateTypes,
  mbtiRankings,
  mbtiType,
  rootConfidence,
) {
  const base = clampConf(rootConfidence) ?? 62;

  const withConfidence = (row, indexZero) => {
    const explicit = clampConf(row.confidence ?? row.confidenceScore);
    if (explicit != null) return { ...row, confidence: explicit };
    const step = [0, 12, 22][indexZero] ?? 12 * indexZero;
    return {
      ...row,
      confidence: Math.max(28, base - step),
    };
  };

  if (Array.isArray(candidateTypes) && candidateTypes.length > 0) {
    return [...candidateTypes]
      .sort((a, b) => (Number(a.rank) || 99) - (Number(b.rank) || 99))
      .slice(0, 3)
      .map((c, i) =>
        withConfidence(
          {
            type: normalizeMbtiCode(String(c.type ?? "")) || "XXXX",
            rank: Number(c.rank) || i + 1,
            reason: String(c.reason ?? "").trim(),
            confidence: c.confidence,
          },
          i,
        ),
      );
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
          confidence: r.confidence,
        });
    }
  }
  if (rows.length === 0) {
    const one = normalizeMbtiCode(mbtiType);
    if (one) rows.push({ type: one, rank: 1, reason: "추정 유형" });
  }
  return rows.map((row, i) => withConfidence(row, i));
}

/**
 * LLM이 forEvidence[0]에 뒤 항목들을 합친 요약을 넣고, 동일 인용·관찰을 반복하는 경우가 많음.
 * (1) 한 줄이 다른 두 줄 이상을 부분 문자열로 포함하면 그 줄(요약) 제거
 * (2) 남은 줄 중 짧은 줄이 긴 줄에 완전 포함되면 짧은 줄 제거
 */
export function dedupeOverlappingEvidenceLines(lines) {
  const raw = (Array.isArray(lines) ? lines : [])
    .map((x) => String(x).trim())
    .filter(Boolean);
  if (raw.length <= 1) return raw;

  const norm = (s) =>
    s.replace(/\*{2,}/g, "").replace(/\s+/g, " ").trim();

  const n = raw.length;
  const removedAgg = new Set();

  for (let i = 0; i < n; i++) {
    const ni = norm(raw[i]);
    if (ni.length < 35) continue;
    let subCount = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const nj = norm(raw[j]);
      if (nj.length < 14) continue;
      if (ni.includes(nj)) subCount += 1;
    }
    if (subCount >= 2) removedAgg.add(i);
  }

  const idxKept = [...Array(n).keys()].filter((i) => !removedAgg.has(i));
  if (idxKept.length === 0) return raw;

  const normOf = (idx) => norm(raw[idx]);
  const entries = idxKept.map((i) => ({ i, s: normOf(i) }));
  entries.sort((a, b) => b.s.length - a.s.length);

  const survivors = [];
  for (const { i, s } of entries) {
    if (s.length < 10) {
      survivors.push(i);
      continue;
    }
    let isRedundant = false;
    for (const j of survivors) {
      const ns = normOf(j);
      if (ns.length > s.length + 5 && ns.includes(s)) {
        isRedundant = true;
        break;
      }
    }
    if (!isRedundant) survivors.push(i);
  }

  survivors.sort((a, b) => a - b);
  const out = survivors.map((i) => raw[i]);
  return out.length > 0 ? out : raw;
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
    const combinedFor = [
      ...(interp ? [interp] : []),
      ...ev.filter(Boolean).slice(0, 6),
    ];
    const dedupedFor = dedupeOverlappingEvidenceLines(combinedFor);
    const forEvidence = dedupedFor.length ? dedupedFor : ["(세부 근거 없음)"];
    const againstEvidence = bNote ? dedupeOverlappingEvidenceLines([bNote]) : [];
    let letter = String(ind.result ?? k[0]).trim().toUpperCase().slice(0, 1);
    if (letter !== k[0] && letter !== k[1]) letter = k[0];
    out[k] = {
      result: letter,
      confidence: Number.isFinite(conf) ? Math.min(100, Math.max(0, conf)) : 60,
      forEvidence,
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
