import { ANALYSIS_MODE } from "./analysis-tier";

/**
 * Gemini가 새 스키마(observedFeatures, axisAnalysis, candidateTypes 등)만 반환해도
 * 기존 ResultScreen·DB(saveAnalysis)가 기대하는 필드(mbtiType, mbtiRankings, indicators…)를 채웁니다.
 * 레거시 전용 응답이면 그대로 통과합니다.
 */

function clampNum(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, Math.round(x)));
}

function normalizeType(t) {
  if (!t || typeof t !== "string") return "XXXX";
  const u = t.trim().toUpperCase();
  return /^[EI][NS][TF][JP]$/.test(u) ? u : "XXXX";
}

function buildMbtiFromAxis(axisAnalysis) {
  if (!axisAnalysis || typeof axisAnalysis !== "object") return null;
  const ei = String(axisAnalysis.EI?.result ?? "").trim().toUpperCase().slice(0, 1);
  const sn = String(axisAnalysis.SN?.result ?? "").trim().toUpperCase().slice(0, 1);
  const tf = String(axisAnalysis.TF?.result ?? "").trim().toUpperCase().slice(0, 1);
  const jp = String(axisAnalysis.JP?.result ?? "").trim().toUpperCase().slice(0, 1);
  if (!ei || !sn || !tf || !jp) return null;
  const s = `${ei}${sn}${tf}${jp}`;
  return /^[EI][NS][TF][JP]$/.test(s) ? s : null;
}

function averageAxisConfidence(axisAnalysis) {
  if (!axisAnalysis || typeof axisAnalysis !== "object") return null;
  const keys = ["EI", "SN", "TF", "JP"];
  const vals = [];
  for (const k of keys) {
    const c = Number(axisAnalysis[k]?.confidence);
    if (Number.isFinite(c)) vals.push(c);
  }
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/**
 * axisAnalysis → ResultScreen.indicators (EI/SN/TF/JP)
 */
function axisToIndicators(axisAnalysis) {
  if (!axisAnalysis || typeof axisAnalysis !== "object") return null;
  const keys = ["EI", "SN", "TF", "JP"];
  const out = {};
  for (const key of keys) {
    const ax = axisAnalysis[key];
    if (!ax || typeof ax !== "object") continue;
    let letter = String(ax.result ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 1);
    const left = key[0];
    const right = key[1];
    if (letter !== left && letter !== right) letter = left;

    const conf = clampNum(ax.confidence, 45, 95);
    const forE = Array.isArray(ax.forEvidence) ? ax.forEvidence.map(String) : [];
    const againstE = Array.isArray(ax.againstEvidence)
      ? ax.againstEvidence.map(String)
      : [];
    const evidence = [
      ...forE,
      ...againstE.map((s) => `(반대) ${s}`),
    ].slice(0, 8);

    out[key] = {
      result: letter,
      score: conf,
      confidence: conf,
      evidence,
      interpretation: forE.length ? forE.join(" ") : undefined,
      boundaryNote: againstE.length ? againstE.join(" · ") : undefined,
      strengthLabel:
        conf >= 75 ? "강함" : conf >= 60 ? "보통" : "약함",
    };
  }
  return Object.keys(out).length ? out : null;
}

function candidateTypesToRankings(candidateTypes) {
  if (!Array.isArray(candidateTypes) || !candidateTypes.length) return null;
  const sorted = [...candidateTypes].sort(
    (a, b) => (Number(a.rank) || 99) - (Number(b.rank) || 99),
  );
  return sorted.slice(0, 3).map((c, i) => {
    const cc = Number(c.confidence);
    const row = {
      rank: Number(c.rank) || i + 1,
      mbtiType: normalizeType(c.type),
      hint: String(c.reason ?? "").trim(),
    };
    if (Number.isFinite(cc)) {
      row.confidence = clampNum(cc, 0, 100);
    }
    return row;
  });
}

function observedToEvidenceBullets(observed) {
  if (!Array.isArray(observed)) return [];
  return observed.slice(0, 5).map((line) => {
    const s = typeof line === "string" ? line : String(line);
    return {
      snippet: s.length > 36 ? `${s.slice(0, 36)}…` : s,
      insight: s,
    };
  });
}

function isNewSchema(raw) {
  return Boolean(
    raw &&
      typeof raw === "object" &&
      (raw.axisAnalysis ||
        raw.candidateTypes ||
        (Array.isArray(raw.observedFeatures) && raw.observedFeatures.length > 0)),
  );
}

/**
 * @param {Record<string, unknown>} raw
 * @param {{ mode?: string }} [opts]
 * @returns {Record<string, unknown>}
 */
export function normalizeGeminiAnalysisResult(raw, opts = {}) {
  if (!raw || typeof raw !== "object") return raw;

  const mode = opts.mode ?? ANALYSIS_MODE.FREE;
  const isPremium = mode === ANALYSIS_MODE.PREMIUM;

  if (!isNewSchema(raw)) {
    return raw;
  }

  const merged = { ...raw };
  const sorted = Array.isArray(raw.candidateTypes)
    ? [...raw.candidateTypes].sort(
        (a, b) => (Number(a.rank) || 99) - (Number(b.rank) || 99),
      )
    : [];
  const top = sorted[0];
  const mbtiFromCandidates = top ? normalizeType(top.type) : null;
  const mbtiFromAxis = buildMbtiFromAxis(raw.axisAnalysis);

  if (!merged.mbtiType || merged.mbtiType === "XXXX") {
    merged.mbtiType = mbtiFromCandidates || mbtiFromAxis || "XXXX";
  } else {
    merged.mbtiType = normalizeType(String(merged.mbtiType));
  }

  if (merged.confidence == null || merged.confidence === "") {
    const axAvg = averageAxisConfidence(raw.axisAnalysis);
    merged.confidence = axAvg ?? (top ? 68 : 58);
  }
  merged.confidence = clampNum(merged.confidence, 40, 95);

  if (!merged.confidenceLevel) {
    merged.confidenceLevel =
      Number(merged.confidence) >= 70 ? "MEDIUM" : "LOW";
  }

  if (!Array.isArray(merged.mbtiRankings) || merged.mbtiRankings.length === 0) {
    const r = candidateTypesToRankings(raw.candidateTypes);
    if (r?.length) {
      merged.mbtiRankings = r;
    } else if (merged.mbtiType && merged.mbtiType !== "XXXX") {
      merged.mbtiRankings = [
        { rank: 1, mbtiType: merged.mbtiType, hint: "4축 종합 1순위" },
      ];
    }
  }

  // analysisLimitations: 가이드는 string, UI는 { points: [] } 선호
  if (raw.analysisLimitations != null) {
    const al = raw.analysisLimitations;
    if (typeof al === "string" && al.trim()) {
      const prev = merged.analysisLimitations;
      const existing =
        prev &&
        typeof prev === "object" &&
        !Array.isArray(prev) &&
        Array.isArray(prev.points)
          ? prev.points
          : [];
      merged.analysisLimitations = {
        points: [...existing, al.trim()],
      };
    } else if (Array.isArray(al)) {
      merged.analysisLimitations = { points: al.map(String) };
    }
  }

  if (!isPremium) {
    merged.tier = "free";
    if (!Array.isArray(merged.evidenceBullets) || merged.evidenceBullets.length === 0) {
      merged.evidenceBullets = observedToEvidenceBullets(raw.observedFeatures);
    }
    const sum = merged.summary;
    const needHeadline =
      !sum ||
      typeof sum !== "object" ||
      !String(sum.headline ?? "").trim();
    if (needHeadline) {
      merged.summary = {
        headline:
          String(top?.reason ?? "").slice(0, 80) ||
          `${merged.mbtiType} 유력 후보`,
        oneLiner: String(
          raw.boundaryNote ?? sorted[1]?.reason ?? "",
        ).slice(0, 200),
      };
    }
    if (!Array.isArray(merged.teaserBullets) || merged.teaserBullets.length === 0) {
      const tips = Array.isArray(raw.communicationTips)
        ? raw.communicationTips
        : [];
      merged.teaserBullets =
        tips.length > 0
          ? tips.slice(0, 3)
          : [
              "4축 근거·해석 상세",
              "1·2·3순위 유형 비교",
              "관계·연락 스타일",
            ];
    }
    if (!merged.lockedPreview?.labels) {
      merged.lockedPreview = {
        labels: [
          "4축마다 대화 근거 · 해석",
          "1·2·3순위 유형 비교와 선택 이유",
          "관계·갈등·연락 스타일 실전 해석",
          "실전 소통 팁 · 오판 가능성 안내",
        ],
      };
    }
  } else {
    merged.tier = "premium";

    if (!merged.indicators && raw.axisAnalysis) {
      const ind = axisToIndicators(raw.axisAnalysis);
      if (ind) merged.indicators = ind;
    }

    if (!merged.alternativeTypes && sorted.length > 1) {
      merged.alternativeTypes = {
        whyFirst: String(top?.reason ?? "").trim(),
        first:
          sorted[1] != null
            ? {
                mbtiType: normalizeType(sorted[1].type),
                oneLiner: String(sorted[1].reason ?? ""),
                shared: "",
                difference: String(sorted[1].reason ?? ""),
              }
            : undefined,
        second:
          sorted[2] != null
            ? {
                mbtiType: normalizeType(sorted[2].type),
                shared: "",
                difference: String(sorted[2].reason ?? ""),
              }
            : undefined,
        third: undefined,
        distinction: String(raw.boundaryNote ?? "").trim(),
      };
    }

    if (!Array.isArray(merged.keyEvidenceSummary) || merged.keyEvidenceSummary.length === 0) {
      const obs = raw.observedFeatures;
      if (Array.isArray(obs) && obs.length) {
        merged.keyEvidenceSummary = obs.slice(0, 6).map((text, i) => ({
          snippet: String(text).slice(0, 28),
          axis: ["EI", "SN", "TF", "JP"][i % 4],
          insight: String(text),
        }));
      }
    }

    if (!String(merged.oneLineConclusion ?? "").trim() && top) {
      merged.oneLineConclusion = String(top.reason ?? `${merged.mbtiType} 유력`);
    }
    if (!String(merged.confidenceReason ?? "").trim()) {
      merged.confidenceReason = String(
        raw.boundaryNote ?? "4축 근거를 종합한 추정입니다.",
      ).slice(0, 220);
    }

    {
      const pt = merged.practicalTips;
      const hasStructuredPractical =
        pt &&
        typeof pt === "object" &&
        !Array.isArray(pt) &&
        (String(pt.emotionVsDirect ?? "").trim() ||
          (Array.isArray(pt.effectiveCommunication) &&
            pt.effectiveCommunication.length > 0) ||
          (Array.isArray(pt.whenHurt) && pt.whenHurt.length > 0) ||
          (Array.isArray(pt.conflictAvoid) && pt.conflictAvoid.length > 0) ||
          (Array.isArray(pt.scheduling) && pt.scheduling.length > 0));
      const needArrayFallback =
        pt == null ||
        (Array.isArray(pt) && pt.length === 0);
      if (!hasStructuredPractical && needArrayFallback) {
        if (Array.isArray(raw.communicationTips) && raw.communicationTips.length) {
          merged.practicalTips = raw.communicationTips.map(String);
        }
      }
    }

    if (
      (!merged.highlights || !Object.keys(merged.highlights).length) &&
      (raw.observedFeatures?.length || raw.profileImageNote)
    ) {
      merged.highlights = {
        chatPatterns: Array.isArray(raw.observedFeatures)
          ? raw.observedFeatures.map(String)
          : [],
        profileAnalysis: String(raw.profileImageNote ?? ""),
      };
    }

    if (!Array.isArray(merged.traits) || merged.traits.length === 0) {
      if (Array.isArray(raw.observedFeatures) && raw.observedFeatures.length) {
        merged.traits = raw.observedFeatures.slice(0, 6).map(String);
      }
    }
  }

  return merged;
}
