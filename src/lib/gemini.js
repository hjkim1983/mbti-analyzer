import { readFileSync } from "fs";
import { join } from "path";
import { ANALYSIS_MODE } from "./analysis-tier";

const MODEL = "gemini-2.5-flash";
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 55000;

/** 프리미엄: 스키마·근거 개수는 유지하되 상한을 두어 생성 시간·비용 완화 (잘림 방지 여유는 유지) */
const PREMIUM_MAX_OUTPUT_TOKENS = 7680;

let cachedSkillPrompt = null;

function getSkillPrompt() {
  if (cachedSkillPrompt) return cachedSkillPrompt;
  try {
    cachedSkillPrompt = readFileSync(
      join(process.cwd(), "mbti_skills.md"),
      "utf-8",
    );
  } catch {
    cachedSkillPrompt = "";
  }
  return cachedSkillPrompt;
}

/** Premium: 풀 리포트 — 지표·하이라이트·traits 등 (문구는 압축, 규칙은 동일) */
function buildPremiumSystemPrompt() {
  const skill = getSkillPrompt();
  return `당신은 카카오톡 캡처·관찰 텍스트를 통합해 MBTI를 추론하는 전문 에이전트입니다.

${skill}

## 프리미엄
유료 리포트입니다. 이미지·메모(선택)를 반영해 구체적으로 추론하세요. 지표(EI/SN/TF/JP)별 evidence **각 3개 이상**, highlights·traits는 풍부하게.

## 출력
JSON만. evidence는 한국어 구체 근거. conflicts는 충돌 있을 때만. confidence·confidenceLevel은 가이드의 신뢰도 기준을 따르세요.`;
}

/** Free: 짧은 맛보기 전용 — 토큰 절약, 풀 지표 리포트 생성 금지 */
function buildFreeSystemPrompt() {
  const skill = getSkillPrompt();
  return `당신은 카카오톡 캡처 이미지를 보고 MBTI를 **빠르게 방향만** 제시하는 에이전트입니다.

${skill}

## 분석 깊이 (무료 · 빠른 추정)
이번 요청은 **무료 빠른 추정**입니다. 캡처 **최대 3장**만으로 압축 판단하므로 **오판 가능성**이 큽니다. **1·2·3순위 유형**을 모두 제시해 사용자가 범위를 이해하도록 하세요. **4축 지표별 상세(indicators)는 출력하지 마세요.**
한 줄 요약·티저 불릿·잠금 미리보기 라벨만 제공하고, 구체적 심층 리포트는 유도하세요.
확신도는 입력이 제한적이므로 보통 MEDIUM 또는 LOW를 우선 고려하세요.

## 출력 규칙
1. 반드시 아래 JSON 스키마에만 맞춰 응답하세요.
2. JSON 외 텍스트 금지.
3. indicators, highlights 상세, profile 등 **프리미엄 전용 필드는 포함하지 마세요.**`;
}

function buildPremiumUserParts({ targetName, memo, images }) {
  const parts = [];
  parts.push({
    text:
      `## 분석 대상: ${targetName || "미지정"}\n` +
      `이미지에서 [A] 대화·[B] 프로필을 구분해 이 사람의 MBTI를 분석하세요.`,
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
    text: `## 출력 (JSON만)
{"tier":"premium","mbtiType":"XXXX","confidence":0-100,"confidenceLevel":"HIGH|MEDIUM|LOW",
"indicators":{
"EI":{"result":"I|E","score":0-100,"confidence":0-100,"evidence":["한국어 근거≥3"]},
"SN":{"result":"S|N","score":0-100,"confidence":0-100,"evidence":["≥3"]},
"TF":{"result":"T|F","score":0-100,"confidence":0-100,"evidence":["≥3"]},
"JP":{"result":"J|P","score":0-100,"confidence":0-100,"evidence":["≥3"]}},
"highlights":{"chatPatterns":[4개],"profileAnalysis":null,"behaviorAnalysis":null},
"traits":[4개],"tags":[],"conflicts":[],
"profile":{"mood":"","status":"","bg":"","score":0-100}|null}`,
  });

  return parts;
}

function buildFreeUserParts({ targetName, images }) {
  const parts = [];
  parts.push({
    text:
      `## 분석 대상\n이름: ${targetName || "미지정"}\n\n` +
      `무료 빠른 추정: 캡처 이미지만으로 MBTI 방향과 짧은 요약만 제공합니다.\n\n` +
      `이미지에서 대화와 프로필을 구분해 참고하세요.`,
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
mbtiType은 1순위와 반드시 동일하게 맞추세요. mbtiRankings는 서로 다른 유형 3개(1·2·3순위)를 채우세요.
{
  "tier": "free",
  "mbtiType": "XXXX",
  "mbtiRankings": [
    { "rank": 1, "mbtiType": "XXXX", "hint": "1순위 한 줄 이유(15자 내)" },
    { "rank": 2, "mbtiType": "YYYY", "hint": "2순위 후보 한 줄" },
    { "rank": 3, "mbtiType": "ZZZZ", "hint": "3순위 후보 한 줄" }
  ],
  "confidence": 0-100,
  "confidenceLevel": "HIGH|MEDIUM|LOW",
  "summary": { "headline": "한 줄 헤드라인", "oneLiner": "부연 한 문장" },
  "teaserBullets": ["티저1", "티저2", "티저3"],
  "lockedPreview": { "labels": ["4축·상위후보 상세", "관계·갈등·소통 리포트", "맞춤 해석"] },
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

async function callGeminiFree({ targetName, images }) {
  const body = {
    system_instruction: {
      parts: [{ text: buildFreeSystemPrompt() }],
    },
    contents: [
      {
        role: "user",
        parts: buildFreeUserParts({ targetName, images }),
      },
    ],
    generationConfig: {
      temperature: 0.35,
      topP: 0.85,
      topK: 40,
      maxOutputTokens: 2048,
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

async function callGeminiPremium({ targetName, memo, images }) {
  const body = {
    system_instruction: {
      parts: [{ text: buildPremiumSystemPrompt() }],
    },
    contents: [
      {
        role: "user",
        parts: buildPremiumUserParts({ targetName, memo, images }),
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
 * @param {{ targetName?: string, memo?: string, images: Array, mode?: string }} opts
 */
export async function callGemini({
  targetName,
  memo,
  images,
  mode = ANALYSIS_MODE.FREE,
}) {
  if (mode === ANALYSIS_MODE.PREMIUM) {
    return callGeminiPremium({
      targetName,
      memo: (memo && String(memo).trim()) || "",
      images: images || [],
    });
  }
  return callGeminiFree({
    targetName,
    images: images || [],
  });
}
