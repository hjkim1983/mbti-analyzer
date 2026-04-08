import { readFileSync } from "fs";
import { join } from "path";
import { ANALYSIS_MODE } from "./analysis-tier";
import { getRelationshipLabel } from "@/constants/mbti-data";
import { formatBehaviorAnswers } from "@/lib/format-behavior-answers";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/** 서버 전용: 과부하 시 `gemini-2.0-flash` 등으로 바꿔 시도 가능 */
function getGeminiModel() {
  const m = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
  return m || DEFAULT_GEMINI_MODEL;
}

function getGeminiGenerateContentUrl() {
  const model = getGeminiModel();
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

/** API 라우트 maxDuration(60s)보다 짧게 — 긴 JSON 생성 시 여유 */
const TIMEOUT_MS = 58000;

/** 503·UNAVAILABLE 등 일시 오류 시 재시도 (환경변수로 조절, 기본 5회·최대 8회) */
function getGeminiMaxRetries() {
  const n = parseInt(process.env.GEMINI_MAX_RETRIES ?? "5", 10);
  if (!Number.isFinite(n)) return 5;
  return Math.min(8, Math.max(1, n));
}

function getGeminiRetryBaseMs() {
  const n = parseInt(process.env.GEMINI_RETRY_BASE_MS ?? "1200", 10);
  if (!Number.isFinite(n)) return 1200;
  return Math.min(8000, Math.max(400, n));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Google 측 일시 과부하·용량 — 잠시 후 재시도 가치 있음 */
function isTransientGeminiError(status, errText) {
  if (status === 503 || status === 502 || status === 504) return true;
  try {
    const j = JSON.parse(errText);
    const st = j?.error?.status;
    if (st === "UNAVAILABLE" || st === "DEADLINE_EXCEEDED") return true;
  } catch {
    /* 본문이 JSON이 아니면 status 코드만 사용 */
  }
  return false;
}

function throwGeminiHttpError(status, errText) {
  let parsed = null;
  try {
    parsed = JSON.parse(errText);
  } catch {
    /* 유지 */
  }
  const apiMsg = parsed?.error?.message;
  const unavailable =
    status === 503 ||
    parsed?.error?.status === "UNAVAILABLE" ||
    (typeof apiMsg === "string" &&
      apiMsg.toLowerCase().includes("high demand"));
  const message = unavailable
    ? "AI 분석 서버가 잠시 과부하 상태예요. 1~2분 뒤 다시 시도해 주세요."
    : `Gemini API 오류 (${status}): ${errText.slice(0, 800)}`;
  const err = new Error(message);
  err.status = status;
  err.rawBody = errText;
  err.rawJson = parsed;
  throw err;
}

/**
 * 프리미엄: 한국어+긴 인용·축별 근거 시 5632 등에서는 MAX_TOKENS로 JSON이 중간에 끊김.
 * gemini-2.5-flash 는 충분히 높은 출력 한도를 지원.
 */
const PREMIUM_MAX_OUTPUT_TOKENS = 16384;

/** 무료: 짧은 스키마면 충분 */
const FREE_MAX_OUTPUT_TOKENS = 1536;

/** compact 파일 없을 때 최소 규칙만 유지 */
const INLINE_SKILL_FALLBACK =
  "[A]대화 [B]프로필 [C]메모. 4축은 말투·이모지·계획·공감 표현에서 추론. 충돌 시 맥락(업무/친밀)을 명시.";

let cachedCompactSkillPrompt = null;

function getCompactSkillPrompt() {
  if (cachedCompactSkillPrompt) return cachedCompactSkillPrompt;
  try {
    cachedCompactSkillPrompt = readFileSync(
      join(process.cwd(), "docs", "mbti_skills_compact.md"),
      "utf-8",
    );
  } catch {
    cachedCompactSkillPrompt = "";
  }
  if (!cachedCompactSkillPrompt.trim()) {
    cachedCompactSkillPrompt = INLINE_SKILL_FALLBACK;
  }
  return cachedCompactSkillPrompt;
}

/** Premium: 요약 스킬 문서 + 근거 중심 추론 (가이드 3단계) */
function buildPremiumSystemPrompt() {
  const skill = getCompactSkillPrompt();
  return `당신은 카카오톡 대화·이미지·관찰 메모를 바탕으로 MBTI를 추론하는 심리언어학 분석 전문가입니다.

## 판단 기준 (요약)
${skill}

## 분석 순서 (반드시 이 순서를 따를 것)
1. 대상 인물의 말풍선과 입력 데이터를 식별한다.
2. 관찰 가능한 언어·행동 신호를 최소 5개 추출한다.
3. 제공된 맥락(관계, 행동 관찰 문항 요약, 메모)을 판별하고 분석에 반영한다.
4. E/I, S/N, T/F, J/P 각 축에 대해 찬성·반대 근거를 함께 기술한다.
5. 가장 유력한 MBTI 후보를 3개(rank 1~3) 제시한다(단일 확정 문구는 쓰지 않는다). 각 후보에 **confidence**(0~100, 해당 순위 추측 신뢰도, 1순위가 가장 높게)를 넣는다.
6. **analysisExplanation**에 1~3순위 이유·한계를 **6문장 이내**로 서술한다(토큰 한도로 JSON이 잘리지 않게). 애매한 축은 boundaryNote·analysisLimitations에 반영한다.

## 핵심 규칙
- 한 가지 MBTI만 확정하지 말고 후보 2~3개를 제시한다.
- 각 축마다 찬성·반대 근거를 **항목당 한 문장** 수준으로 간결히 적는다(장문 인용 금지).
- 프로필 이미지는 보조 신호로만 쓴다.
- 관찰자 메모가 인상 평가 위주면 가중치를 낮춘다고 boundaryNote에 적는다.
- 업무 맥락에서는 T/F·J/P 판단에 특히 유의한다.

## 출력
사용자 메시지에 적힌 JSON 스키마에만 맞춰 응답한다. JSON만. 한국어. 빈 값은 null 또는 []. 개인정보는 가명·최소 인용.`;
}

/** Free: 긴 스킬 문서 없음 — 근거·후보 중심 짧은 JSON (서버에서 레거시 필드 보강) */
function buildFreeSystemPrompt() {
  return `카카오톡 캡처로 MBTI 후보와 축별 근거를 빠르게 추정하는 심리언어학 분석 에이전트입니다.

## 분석 순서
1. 말풍선·프로필 식별 → 2. 관찰 신호 5개 이상 → 3. (제공된 경우에만) 관계·행동 문항 요약을 보조 맥락으로 반영
4. 4축 각각 찬성·반대 근거 → 5. 후보 MBTI 3개(순위별 confidence 포함) → 6. analysisExplanation(순위 선정 이유+한계) → 7. 한계·오판 요인

## 규칙
- 단일 유형 확정 금지. 후보 3개(candidateTypes rank 1~3, 각각 confidence 0~100).
- 각 축에 forEvidence·againstEvidence를 함께 적는다.
- indicators·프리미엄 전용 필드(관계 장문 등)는 넣지 않는다.
- confidence는 축 근거를 반영해 **52~78** 정도, confidenceLevel은 MEDIUM|LOW 우선.

## 출력
사용자 메시지의 JSON 스키마만 따른다. JSON만. 한국어.`;
}

/**
 * 관계 — 프롬프트에만 주입 (검증은 API 라우트에서 화이트리스트)
 */
function buildContextHint(relationship) {
  const rel = relationship ? getRelationshipLabel(relationship) : "";
  if (!rel) return "";
  return `\n\n## 맥락\n관계: **${rel}**. 맥락에 따라 E/I·T/F 해석이 달라질 수 있습니다.`;
}

function buildPremiumUserParts({
  targetName,
  memo,
  images,
  relationship,
  behaviorFormatted,
}) {
  const behaviorBlock =
    behaviorFormatted && behaviorFormatted.trim()
      ? `\n\n## [D] 관찰자 행동 문항 요약\n관찰자가 선택한 경향입니다. 대화 캡처와 함께 참고하되, 모순되면 대화·이미지를 우선하세요.\n\n${behaviorFormatted}`
      : "";

  const parts = [];
  parts.push({
    text:
      `## 분석 대상: ${targetName || "미지정"}\n` +
      `이미지에서 [A] 대화·[B] 프로필을 구분해 이 사람의 MBTI를 분석하세요.` +
      buildContextHint(relationship) +
      behaviorBlock,
  });

  for (const img of images) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType || "image/jpeg",
        data: img.base64Data,
      },
    });
  }

  if (memo && memo.trim()) {
    parts.push({
      text: `\n## [C] 행동/성격 텍스트 (관찰자 입력, 선택)\n${memo}`,
    });
  }

  const hasImages = images.length > 0;
  const hasMemo = memo && memo.trim().length > 0;
  const hasD = Boolean(behaviorFormatted && behaviorFormatted.trim());
  let weightGuide = "";
  if (hasImages && hasMemo && hasD) {
    weightGuide =
      "가중치: [A] 카카오톡 대화 42%, [B] 프로필 사진 13%, [C] 행동/성격 텍스트 30%, [D] 행동 문항 요약 15%";
  } else if (hasImages && hasMemo && !hasD) {
    weightGuide =
      "가중치: [A] 카카오톡 대화 50%, [B] 프로필 사진 15%, [C] 행동/성격 텍스트 35%";
  } else if (hasImages && !hasMemo && hasD) {
    weightGuide =
      "가중치: [A] 카카오톡 대화 58%, [B] 프로필 사진 22%, [D] 행동 문항 요약 20% ([C] 없음)";
  } else if (hasImages && !hasMemo && !hasD) {
    weightGuide =
      "가중치: [A] 카카오톡 대화 65%, [B] 프로필 사진 35% ([C][D] 없음)";
  } else if (!hasImages && hasMemo) {
    weightGuide =
      "가중치: [C] 행동/성격 텍스트 100% (단, 신뢰도 LOW로 고정)";
  }
  if (!weightGuide) {
    weightGuide =
      "가중치: 이미지·텍스트·행동 문항 요약을 균형 있게 참고하세요.";
  }

  parts.push({ text: `\n## 가중치\n${weightGuide}` });

  parts.push({
    text: `## 출력 (JSON만)
아래 스키마를 정확히 따르세요. tier는 "premium".
루트에 mbtiType(= candidateTypes rank1 type과 동일 4글자), confidence(숫자), confidenceLevel(HIGH|MEDIUM|LOW), confidenceReason(한 줄)을 반드시 포함하세요.

{
  "tier": "premium",
  "mbtiType": "XXXX",
  "confidence": 60,
  "confidenceLevel": "MEDIUM",
  "confidenceReason": "한 줄",
  "observedFeatures": ["관찰 5~6개, 각 1문장"],
  "axisAnalysis": {
    "EI": { "result": "E|I", "confidence": 0-100, "forEvidence": ["한 줄씩"], "againstEvidence": ["한 줄씩"] },
    "SN": { "result": "S|N", "confidence": 0-100, "forEvidence": [], "againstEvidence": [] },
    "TF": { "result": "T|F", "confidence": 0-100, "forEvidence": [], "againstEvidence": [] },
    "JP": { "result": "J|P", "confidence": 0-100, "forEvidence": [], "againstEvidence": [] }
  },
  "candidateTypes": [
    { "type": "XXXX", "rank": 1, "confidence": 60, "reason": "근거 2문장 이내" },
    { "type": "YYYY", "rank": 2, "confidence": 48, "reason": "…" },
    { "type": "ZZZZ", "rank": 3, "confidence": 38, "reason": "…" }
  ],
  "analysisExplanation": "선정 이유+한계, 6문장 이내",
  "boundaryNote": "가장 애매한 축·맥락 요인",
  "analysisLimitations": "문자열 한 덩어리(데이터 부족·단일 상대 등)",
  "communicationTips": ["팁1", "팁2", "팁3"],
  "profileImageNote": "프로필·배경 보조 신호(없으면 빈 문자열)",
  "oneLineConclusion": "한 줄 결론",
  "keyEvidenceSummary": [{ "snippet": "한 줄", "axis": "EI", "insight": "한 줄" }],
  "practicalTips": ["실전 팁"],
  "workAndRoutine": { "summary": "", "tips": [] },
  "relationshipAndCommunication": { "summary": "", "tips": [] },
  "cautionAndMisread": { "points": [] },
  "quotedInsights": [],
  "tags": ["#태그"]
}

축 confidence는 해당 축 판단 강도(0~100). 후보 3개 type은 서로 다르게. 후보별 confidence는 루트 confidence와 조화(1순위 ≥ 2순위 ≥ 3순위). 빈 값 null/[].

**중요**: 응답이 출력 한도로 잘리면 JSON이 무효가 됩니다. 인용은 최소화하고, 축별 근거·후보 reason·keyEvidenceSummary(최대 5개)는 짧게 유지하세요. workAndRoutine 등 긴 필드도 요약 위주.`,
  });

  return parts;
}

function buildFreeUserParts({
  targetName,
  images,
  relationship,
  behaviorFormatted,
}) {
  const parts = [];
  const behaviorBlock =
    behaviorFormatted && behaviorFormatted.trim()
      ? `\n\n## 관찰자 행동 문항 요약 (참고)\n${behaviorFormatted}`
      : "";

  parts.push({
    text:
      `## 분석 대상\n이름: ${targetName || "미지정"}\n\n` +
      `무료 빠른 추정: 캡처 이미지로 MBTI 방향과 짧은 요약만 제공합니다.\n\n` +
      `이미지에서 대화와 프로필을 구분해 참고하세요.` +
      (relationship || behaviorBlock
        ? buildContextHint(relationship) + behaviorBlock
        : "\n\n(관계·행동 문항 없음 — **캡처 텍스트·말투만**으로 추정하세요. 신뢰도는 보수적으로 잡고 한계를 분명히 적으세요.)"),
  });

  for (const img of images) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType || "image/jpeg",
        data: img.base64Data,
      },
    });
  }

  parts.push({
    text: `\n## 출력 (JSON만)
아래 키를 사용하세요. tier는 "free". 루트 mbtiType·confidence·confidenceLevel은 candidateTypes·axisAnalysis와 일치하게 쓰세요.

{
  "tier": "free",
  "mbtiType": "1순위 4글자",
  "confidence": 52-78,
  "confidenceLevel": "MEDIUM|LOW",
  "observedFeatures": ["관찰 가능한 신호 5개 이상"],
  "axisAnalysis": {
    "EI": { "result": "E|I", "confidence": 0-100, "forEvidence": ["…"], "againstEvidence": ["…"] },
    "SN": { "result": "S|N", "confidence": 0-100, "forEvidence": [], "againstEvidence": [] },
    "TF": { "result": "T|F", "confidence": 0-100, "forEvidence": [], "againstEvidence": [] },
    "JP": { "result": "J|P", "confidence": 0-100, "forEvidence": [], "againstEvidence": [] }
  },
  "candidateTypes": [
    { "type": "XXXX", "rank": 1, "confidence": 58, "reason": "근거 요약" },
    { "type": "YYYY", "rank": 2, "confidence": 46, "reason": "…" },
    { "type": "ZZZZ", "rank": 3, "confidence": 36, "reason": "…" }
  ],
  "analysisExplanation": "1~3순위 선정 이유와 분석 한계(짧게 3~6문장)",
  "boundaryNote": "애매한 축·맥락 요인",
  "analysisLimitations": "분석 한계(한 문단)",
  "communicationTips": ["팁1", "팁2", "팁3"],
  "profileImageNote": "프로필 보조 신호 또는 빈 문자열",
  "tags": ["#태그1", "#태그2"]
}`,
  });

  return parts;
}

/** ```json ... ``` 등 마크다운 펜스 제거 */
function stripMarkdownJsonFence(s) {
  let t = s.trim();
  if (!t.startsWith("```")) return t;
  t = t.replace(/^```(?:json)?\s*/i, "");
  const last = t.lastIndexOf("```");
  if (last !== -1) t = t.slice(0, last);
  return t.trim();
}

/**
 * Gemini가 JSON 외 문자를 섞거나 잘랐을 때 파싱 시도
 */
function parseGeminiAnalysisJson(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;

  const candidates = [raw.trim(), stripMarkdownJsonFence(raw)];

  for (const chunk of candidates) {
    try {
      const v = JSON.parse(chunk);
      if (v && typeof v === "object") return v;
    } catch {
      /* 다음 시도 */
    }
  }

  const cleaned = stripMarkdownJsonFence(raw);
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      const partial = jsonMatch[0];
      const fixed = partial + '"}}'.repeat(3);
      try {
        return JSON.parse(fixed);
      } catch {
        /* 복구 불가 */
      }
    }
  }

  return null;
}

async function postGemini(body) {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API 키가 설정되지 않았습니다.");
  }

  const maxAttempts = getGeminiMaxRetries();
  const baseDelayMs = getGeminiRetryBaseMs();
  /** @type {Response | null} */
  let res = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const endpoint = getGeminiGenerateContentUrl();
      res = await fetch(`${endpoint}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) break;

      const errText = await res.text();

      if (res.status === 429 || errText.includes("RESOURCE_EXHAUSTED")) {
        const qe = new Error("QUOTA_EXCEEDED");
        qe.status = res.status;
        qe.rawBody = errText;
        try {
          qe.rawJson = JSON.parse(errText);
        } catch {
          qe.rawJson = null;
        }
        throw qe;
      }

      const canRetry =
        isTransientGeminiError(res.status, errText) &&
        attempt < maxAttempts - 1;

      if (canRetry) {
        const wait =
          baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 400);
        console.warn(
          `[Gemini] 일시 오류 ${res.status}, ${attempt + 1}/${maxAttempts}회차 후 ${wait}ms 대기 후 재시도`,
        );
        await sleep(wait);
        continue;
      }

      throwGeminiHttpError(res.status, errText);
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new Error("ANALYSIS_TIMEOUT");
      }
      throw err;
    }
  }

  if (!res || !res.ok) {
    throw new Error("Gemini 요청이 반복 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }

  try {
    const data = await res.json();

    const candidate = data.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const text =
      candidate?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join("") ?? "";

    if (!text) {
      const block = data.promptFeedback?.blockReason;
      if (block) {
        const e = new Error(`Gemini 응답이 차단되었습니다: ${block}`);
        e.rawJson = data;
        throw e;
      }
      if (finishReason === "MAX_TOKENS") {
        const e = new Error(
          "응답이 너무 길어 잘렸습니다. 이미지 수를 줄이거나 다시 시도해주세요.",
        );
        e.rawJson = data;
        throw e;
      }
      const e = new Error("Gemini 응답이 비어있습니다.");
      e.rawJson = data;
      throw e;
    }

    const parsed = parseGeminiAnalysisJson(text);
    if (parsed) return parsed;

    if (finishReason === "MAX_TOKENS") {
      const e = new Error(
        "응답이 잘려 JSON이 완성되지 않았습니다. 이미지를 줄이거나 다시 시도해주세요.",
      );
      e.rawPreview = text.slice(0, 4000);
      e.finishReason = finishReason;
      throw e;
    }

    console.error("Gemini JSON 파싱 실패 (앞 600자):", text.slice(0, 600));
    const pe = new Error("AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.");
    pe.rawPreview = text.slice(0, 4000);
    pe.finishReason = finishReason;
    throw pe;
  } catch (err) {
    throw err;
  }
}

async function callGeminiFree({
  targetName,
  images,
  relationship,
  behaviorFormatted,
}) {
  const body = {
    system_instruction: {
      parts: [{ text: buildFreeSystemPrompt() }],
    },
    contents: [
      {
        role: "user",
        parts: buildFreeUserParts({
          targetName,
          images,
          relationship,
          behaviorFormatted,
        }),
      },
    ],
    generationConfig: {
      temperature: 0.35,
      topP: 0.85,
      topK: 40,
      maxOutputTokens: FREE_MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      candidateCount: 1,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  return postGemini(body);
}

async function callGeminiPremium({
  targetName,
  memo,
  images,
  relationship,
  behaviorFormatted,
}) {
  const body = {
    system_instruction: {
      parts: [{ text: buildPremiumSystemPrompt() }],
    },
    contents: [
      {
        role: "user",
        parts: buildPremiumUserParts({
          targetName,
          memo,
          images,
          relationship,
          behaviorFormatted,
        }),
      },
    ],
    generationConfig: {
      temperature: 0.28,
      topP: 0.78,
      topK: 40,
      maxOutputTokens: PREMIUM_MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      candidateCount: 1,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  return postGemini(body);
}

/**
 * @param {{ targetName?: string, memo?: string, images: Array, mode?: string, relationship?: string|null, behaviorAnswers?: Record<string, string> }} opts
 */
export async function callGemini({
  targetName,
  memo,
  images,
  mode = ANALYSIS_MODE.FREE,
  relationship,
  behaviorAnswers,
}) {
  const behaviorFormatted = formatBehaviorAnswers(behaviorAnswers || {});
  if (mode === ANALYSIS_MODE.PREMIUM) {
    return callGeminiPremium({
      targetName,
      memo: (memo && String(memo).trim()) || "",
      images: images || [],
      relationship: relationship || null,
      behaviorFormatted,
    });
  }
  return callGeminiFree({
    targetName,
    images: images || [],
    relationship: relationship || null,
    behaviorFormatted,
  });
}
