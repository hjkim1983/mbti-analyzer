import { readFileSync } from "fs";
import { join } from "path";
import { ANALYSIS_MODE } from "./analysis-tier";

const MODEL = "gemini-2.5-flash";
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
// 5장 이미지 기준 Gemini 처리 시간 여유 확보 (Vercel maxDuration=60과 맞춤)
const TIMEOUT_MS = 55000;

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

function buildSystemPrompt(mode = ANALYSIS_MODE.SIMPLE) {
  const skill = getSkillPrompt();
  const tierHint =
    mode === ANALYSIS_MODE.DEEP
      ? `## 분석 깊이 (심층 모드)
이번 요청은 **유료 심층 분석**입니다. 이미지와 관찰자가 입력한 텍스트(말투·행동·특징)를 모두 반영하여 **구체적으로** 추론하세요.
지표별 evidence는 각각 **3개 이상**, highlights·traits는 풍부하게 작성하세요.`
      : `## 분석 깊이 (간단 모드)
이번 요청은 **무료 간단 추측**입니다. 캡처만으로 빠르게 방향을 제시하세요.
지표별 evidence는 **각 2개 이상**이면 되며, 확신도는 입력이 제한적이므로 **보통 MEDIUM 또는 LOW**를 우선 고려하세요.`;

  return `당신은 입력 데이터를 통합 분석하여 MBTI를 추론하는 전문 심리언어학 분석 에이전트입니다.

${skill}

${tierHint}

## 출력 규칙
1. 반드시 아래 JSON 스키마에 맞춰 응답하세요.
2. JSON 외의 텍스트를 포함하지 마세요.
3. evidence는 한국어로 구체적 근거를 작성하세요 (간단 모드: 지표당 2개+, 심층 모드: 지표당 3개+).
4. conflicts 배열에는 지표 간 충돌이 있을 경우 설명을 포함하세요.
5. 확신도(confidence)는 신뢰도 등급 기준을 따르세요.`;
}

function buildUserParts({ targetName, memo, images, mode = ANALYSIS_MODE.SIMPLE }) {
  const parts = [];

  const modeLine =
    mode === ANALYSIS_MODE.DEEP
      ? "심층 모드: 이미지와 관찰 텍스트를 모두 반영해 구체적으로 분석합니다."
      : "간단 모드: 캡처만으로 빠른 MBTI 방향 추측을 제공합니다.";

  parts.push({
    text:
      `## 분석 대상\n이름: ${targetName || "미지정"}\n\n` +
      `${modeLine}\n\n` +
      `이 사람의 MBTI를 아래 입력 데이터를 기반으로 분석해주세요.\n` +
      `이미지에서 대화([A])와 프로필([B])을 스스로 분류하여 분석하세요.`,
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
      text: `\n## [C] 행동/성격 텍스트 (관찰자 입력)\n${memo}`,
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
      "가중치: [A] 카카오톡 대화 65%, [B] 프로필 사진 35% ([C] 누락)";
  } else if (!hasImages && hasMemo) {
    weightGuide =
      "가중치: [C] 행동/성격 텍스트 100% (단, 신뢰도 LOW로 고정)";
  }

  parts.push({ text: `\n## 분석 가중치\n${weightGuide}` });

  parts.push({
    text: `\n## 출력 형식
아래 JSON 스키마에 맞춰 응답하세요. JSON만 출력하세요.
{
  "mbtiType": "XXXX",
  "confidence": 0-100,
  "confidenceLevel": "HIGH|MEDIUM|LOW",
  "indicators": {
    "EI": {"result":"I 또는 E","score":0-100,"confidence":0-100,"evidence":["근거1","근거2","근거3"]},
    "SN": {"result":"S 또는 N","score":0-100,"confidence":0-100,"evidence":["근거1","근거2","근거3"]},
    "TF": {"result":"T 또는 F","score":0-100,"confidence":0-100,"evidence":["근거1","근거2","근거3"]},
    "JP": {"result":"J 또는 P","score":0-100,"confidence":0-100,"evidence":["근거1","근거2","근거3"]}
  },
  "highlights": {
    "chatPatterns": ["특징1","특징2","특징3","특징4"],
    "profileAnalysis": "프로필 분석 요약 문자열 또는 null",
    "behaviorAnalysis": "행동 분석 요약 문자열 또는 null"
  },
  "traits": ["특성1","특성2","특성3","특성4"],
  "tags": ["#태그1","#태그2","#태그3"],
  "conflicts": [],
  "profile": {"mood":"분위기","status":"상태메시지 스타일","bg":"배경 취향","score":0-100} 또는 null
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

export async function callGemini({
  targetName,
  memo,
  images,
  mode = ANALYSIS_MODE.SIMPLE,
}) {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API 키가 설정되지 않았습니다.");
  }

  const body = {
    system_instruction: {
      parts: [{ text: buildSystemPrompt(mode) }],
    },
    contents: [
      {
        role: "user",
        parts: buildUserParts({ targetName, memo, images, mode }),
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      // 이미지 5장 처리 시 응답 지연 방지: 후보 1개만 생성
      candidateCount: 1,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE",
      },
    ],
  };

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

    console.error(
      "Gemini JSON 파싱 실패 (앞 600자):",
      text.slice(0, 600),
    );
    throw new Error("AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.");
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error("ANALYSIS_TIMEOUT");
    }
    throw err;
  }
}
