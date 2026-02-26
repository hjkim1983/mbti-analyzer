import { readFileSync } from "fs";
import { join } from "path";

const MODEL = "gemini-2.0-flash";
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 30000;

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

function buildSystemPrompt() {
  const skill = getSkillPrompt();
  return `당신은 세 가지 입력 데이터를 통합 분석하여 MBTI를 추론하는 전문 심리언어학 분석 에이전트입니다.

${skill}

## 출력 규칙
1. 반드시 아래 JSON 스키마에 맞춰 응답하세요.
2. JSON 외의 텍스트를 포함하지 마세요.
3. evidence 배열에는 한국어로 구체적 근거를 3개 이상 작성하세요.
4. conflicts 배열에는 지표 간 충돌이 있을 경우 설명을 포함하세요.
5. 확신도(confidence)는 신뢰도 등급 기준을 따르세요.`;
}

function buildUserParts({ targetName, memo, images }) {
  const parts = [];

  parts.push({
    text:
      `## 분석 대상\n이름: ${targetName || "미지정"}\n\n` +
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

export async function callGemini({ targetName, memo, images }) {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API 키가 설정되지 않았습니다.");
  }

  const body = {
    system_instruction: {
      parts: [{ text: buildSystemPrompt() }],
    },
    contents: [
      {
        role: "user",
        parts: buildUserParts({ targetName, memo, images }),
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
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
      const err = await res.text();
      throw new Error(`Gemini API 오류 (${res.status}): ${err}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini 응답이 비어있습니다.");
    }

    return JSON.parse(text);
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error("ANALYSIS_TIMEOUT");
    }
    throw err;
  }
}
