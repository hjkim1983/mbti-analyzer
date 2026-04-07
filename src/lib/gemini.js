import { readFileSync } from "fs";
import { join } from "path";
import { ANALYSIS_MODE } from "./analysis-tier";
import {
  getRelationshipLabel,
  getContextLabel,
} from "@/constants/mbti-data";

const MODEL = "gemini-2.5-flash";
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 55000;

/** 프리미엄: JSON 한도 — 불필요하게 긴 리포트 생성 방지(속도·비용) */
const PREMIUM_MAX_OUTPUT_TOKENS = 5632;

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

/** Premium: 요약 스킬 문서 + 압축 규칙 (전체 mbti_skills.md 매번 주입하지 않음) */
function buildPremiumSystemPrompt() {
  const skill = getCompactSkillPrompt();
  return `당신은 카카오톡 캡처·관찰 텍스트를 통합해 MBTI를 추론하는 전문 에이전트입니다.

## 판단 기준 (요약)
${skill}

## 프리미엄 리포트 원칙
1. **근거**: 각 축 evidence는 **짧은 인용 3개** (한 줄·25자 내외). 장황한 설명 금지.
2. **해석**: indicators의 interpretation·관계/실전 필드는 **문단당 1~3문장**. 같은 말 반복 금지.
3. **확신도**: confidence 보통 **52~85**. 90+ 는 근거가 매우 명확할 때만. confidenceReason 한 줄.
4. **경계**: 애매한 축은 boundaryNote에 명시.
5. **대안**: alternativeTypes의 first·second·third의 mbtiType은 **최종 mbtiType과 다른** 서로 다른 유형만(헷갈렸던 차선·제외 후보). 최종 결론 유형은 루트 mbtiType에만 넣고, 대안 칸에 동일 코드를 반복하지 말 것.
6. **한계·팁**: analysisLimitations·practicalTips는 **실제로 쓸 만한 항목 수**만 (빈 수식어 금지).

## 출력
JSON만. 한국어. 빈 필드는 null 또는 []. 개인정보는 가명·최소 인용.`;
}

/** Free: 긴 스킬 문서 없음 — 짧은 규칙만 (입력 토큰·지연 최소화) */
function buildFreeSystemPrompt() {
  return `카카오톡 캡처로 MBTI **방향만** 빠르게 추정하는 에이전트입니다.

## 입력
대화/프로필이 한 화면에 있으면 대화 톤·이모지·답장 패턴을 우선하세요.

## 무료 빠른 추정
- 캡처 **최대 3장** 기준. 오판 가능 — **1·2·3순위** 유형 제시.
- **indicators·프리미엄 전용 필드 금지.**
- **evidenceBullets** 2~3개: 「짧은 인용」+ 한 줄 해석.
- summary·티저·lockedPreview로 프리미엄 유도.
- confidence **52~78**, confidenceLevel MEDIUM|LOW 우선.

## 출력
JSON만. 한국어.`;
}

/**
 * 관계·대화 맥락 — 프롬프트에만 주입 (검증은 API 라우트에서 화이트리스트)
 */
function buildContextHint(relationship, chatContext) {
  const rel = relationship ? getRelationshipLabel(relationship) : "";
  const ctx = chatContext ? getContextLabel(chatContext) : "";
  if (!rel && !ctx) return "";
  if (rel && ctx) {
    return `\n\n## 맥락\n이 대화는 **${rel}** 관계에서의 **${ctx}** 맥락으로 가정합니다. 업무 맥락에서는 평소 F도 T처럼 보일 수 있으니 맥락을 고려하세요.`;
  }
  if (rel) {
    return `\n\n## 맥락\n관계: **${rel}**. 맥락에 따라 E/I·T/F 해석이 달라질 수 있습니다.`;
  }
  return `\n\n## 맥락\n대화 분위기: **${ctx}**. 업무 맥락에서는 평소 F도 T처럼 보일 수 있습니다.`;
}

function buildPremiumUserParts({
  targetName,
  memo,
  images,
  tags,
  relationship,
  chatContext,
}) {
  const tagList = Array.isArray(tags)
    ? tags.map((t) => String(t).trim()).filter(Boolean)
    : [];

  const parts = [];
  parts.push({
    text:
      `## 분석 대상: ${targetName || "미지정"}\n` +
      `이미지에서 [A] 대화·[B] 프로필을 구분해 이 사람의 MBTI를 분석하세요.` +
      buildContextHint(relationship, chatContext),
  });

  for (const img of images) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType || "image/jpeg",
        data: img.base64Data,
      },
    });
  }

  if (tagList.length > 0) {
    parts.push({
      text: `\n## 관찰자 행동 태그\n${tagList.join(" · ")}`,
    });
  }

  if (memo && memo.trim()) {
    parts.push({
      text: `\n## [C] 행동/성격 텍스트 (관찰자 입력, 선택)\n${memo}`,
    });
  }

  const hasImages = images.length > 0;
  const hasMemo = memo && memo.trim().length > 0;
  let weightGuide = "";
  if (hasImages && hasMemo) {
    weightGuide =
      "가중치: [A] 카카오톡 대화 50%, [B] 프로필 사진 15%, [C] 행동/성격 텍스트 35%";
  } else if (hasImages && !hasMemo) {
    weightGuide =
      "가중치: [A] 카카오톡 대화 65%, [B] 프로필 사진 35% ([C] 없음)";
  } else if (!hasImages && hasMemo) {
    weightGuide =
      "가중치: [C] 행동/성격 텍스트 100% (단, 신뢰도 LOW로 고정)";
  }

  parts.push({ text: `\n## 가중치\n${weightGuide}` });

  parts.push({
    text: `## 출력 (JSON만, application/json 응답)
필수 키: tier "premium", mbtiType, confidence, confidenceLevel, confidenceReason, oneLineConclusion,
keyEvidenceSummary[{snippet,axis,insight}],
indicators(EI,SN,TF,JP: result,score,confidence,evidence[],interpretation,boundaryNote,strengthLabel),
highlights, traits, tags, conflicts, profile|null, alternativeTypes(first,second,third,whyFirst),
relationshipAndCommunication(summary, whenInterested, whenUncomfortable, whenClose, inConflict, replyAndEmoji, contactPreference, tips[]),
practicalTips, workAndRoutine, cautionAndMisread, analysisLimitations, quotedInsights, emoji, title, color

alternativeTypes 규칙: first·second·third의 mbtiType은 **mbtiType(최종)과 다른** 코드만. 중복 금지.
짧게: evidence는 인용 위주 한 줄. interpretation·관계 문단은 각 1~3문장. 빈 값 null/[]`,
  });

  return parts;
}

function buildFreeUserParts({
  targetName,
  images,
  tags,
  relationship,
  chatContext,
}) {
  const parts = [];
  const tagList = Array.isArray(tags)
    ? tags.map((t) => String(t).trim()).filter(Boolean)
    : [];
  parts.push({
    text:
      `## 분석 대상\n이름: ${targetName || "미지정"}\n\n` +
      `무료 빠른 추정: 캡처 이미지로 MBTI 방향과 짧은 요약만 제공합니다.\n\n` +
      `이미지에서 대화와 프로필을 구분해 참고하세요.` +
      buildContextHint(relationship, chatContext) +
      (tagList.length > 0
        ? `\n\n## 관찰자 행동 태그 (참고)\n${tagList.join(" · ")}`
        : ""),
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
    text: `\n## 출력 형식 (반드시 이 키만 사용)
JSON만 출력하세요.
mbtiType은 1순위와 동일. mbtiRankings는 서로 다른 유형 3개(1·2·3순위).
evidenceBullets: **캡처 근거 2~3개**, 각 항목은 {"snippet":"「짧은 인용」","insight":"한 줄 해석"} 형태 권장.
{
  "tier": "free",
  "mbtiType": "XXXX",
  "mbtiRankings": [
    { "rank": 1, "mbtiType": "XXXX", "hint": "1순위 한 줄" },
    { "rank": 2, "mbtiType": "YYYY", "hint": "2순위 후보" },
    { "rank": 3, "mbtiType": "ZZZZ", "hint": "3순위 후보" }
  ],
  "confidence": 52-78,
  "confidenceLevel": "MEDIUM|LOW",
  "summary": { "headline": "한 줄 헤드라인", "oneLiner": "부연 한 문장" },
  "evidenceBullets": [{"snippet":"「…」","insight":"…"},{"snippet":"「…」","insight":"…"}],
  "teaserBullets": ["프리미엄에서 열리는 깊이 티저1", "티저2", "티저3"],
  "lockedPreview": {
    "labels": [
      "4축마다 대화 근거 3개+ · 해석",
      "1·2·3순위 유형 비교와 선택 이유",
      "관계·갈등·연락 스타일 실전 해석",
      "실전 소통 팁 · 오판 가능성 안내"
    ]
  },
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 429 || errText.includes("RESOURCE_EXHAUSTED")) {
        throw new Error("QUOTA_EXCEEDED");
      }
      throw new Error(`Gemini API 오류 (${res.status}): ${errText}`);
    }

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
        throw new Error(`Gemini 응답이 차단되었습니다: ${block}`);
      }
      if (finishReason === "MAX_TOKENS") {
        throw new Error(
          "응답이 너무 길어 잘렸습니다. 이미지 수를 줄이거나 다시 시도해주세요.",
        );
      }
      throw new Error("Gemini 응답이 비어있습니다.");
    }

    const parsed = parseGeminiAnalysisJson(text);
    if (parsed) return parsed;

    if (finishReason === "MAX_TOKENS") {
      throw new Error(
        "응답이 잘려 JSON이 완성되지 않았습니다. 이미지를 줄이거나 다시 시도해주세요.",
      );
    }

    console.error("Gemini JSON 파싱 실패 (앞 600자):", text.slice(0, 600));
    throw new Error("AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.");
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error("ANALYSIS_TIMEOUT");
    }
    throw err;
  }
}

async function callGeminiFree({
  targetName,
  images,
  tags,
  relationship,
  chatContext,
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
          tags,
          relationship,
          chatContext,
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
  tags,
  relationship,
  chatContext,
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
          tags,
          relationship,
          chatContext,
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
 * @param {{ targetName?: string, memo?: string, images: Array, mode?: string, tags?: string[], relationship?: string|null, chatContext?: string|null }} opts
 */
export async function callGemini({
  targetName,
  memo,
  images,
  mode = ANALYSIS_MODE.FREE,
  tags,
  relationship,
  chatContext,
}) {
  const tagArr = Array.isArray(tags) ? tags : [];
  if (mode === ANALYSIS_MODE.PREMIUM) {
    return callGeminiPremium({
      targetName,
      memo: (memo && String(memo).trim()) || "",
      images: images || [],
      tags: tagArr,
      relationship: relationship || null,
      chatContext: chatContext || null,
    });
  }
  return callGeminiFree({
    targetName,
    images: images || [],
    tags: tagArr,
    relationship: relationship || null,
    chatContext: chatContext || null,
  });
}
