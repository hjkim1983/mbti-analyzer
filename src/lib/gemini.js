import { readFileSync } from "fs";
import { join } from "path";
import { ANALYSIS_MODE } from "./analysis-tier";

const MODEL = "gemini-2.5-flash";
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 55000;

/** 프리미엄: 심층 필드 추가로 상한 여유 */
const PREMIUM_MAX_OUTPUT_TOKENS = 8192;

let cachedSkillPrompt = null;

function getSkillPrompt() {
  if (cachedSkillPrompt) return cachedSkillPrompt;
  try {
    cachedSkillPrompt = readFileSync(
      join(process.cwd(), "docs", "mbti_skills.md"),
      "utf-8",
    );
  } catch {
    try {
      cachedSkillPrompt = readFileSync(
        join(process.cwd(), "mbti_skills.md"),
        "utf-8",
      );
    } catch {
      cachedSkillPrompt = "";
    }
  }
  return cachedSkillPrompt;
}

/** Premium: 풀 리포트 — 근거·비교·실전 해석 중심 */
function buildPremiumSystemPrompt() {
  const skill = getSkillPrompt();
  return `당신은 카카오톡 캡처·관찰 텍스트를 통합해 MBTI를 추론하는 전문 에이전트입니다.

${skill}

## 프리미엄 리포트 원칙 (필수)
1. **근거 공개**: 각 축(EI/SN/TF/JP)마다 캡처에서 온 **짧은 인용 또는 말투 패턴**을 evidence로 **3개 이상**. 형식 예: 「일단 계획부터」→ 실행·통제(J) 근거.
2. **일반론 금지**: MBTI 교과서식 문장만 나열하지 말고, **이 입력에서만 나올 수 있는 해석**을 interpretation·summary에 담을 것.
3. **확신도 과장 금지**: overall confidence는 보통 **52~85** 범위를 우선. 90 이상은 정말 압도적 근거가 있을 때만. confidenceReason으로 숫자 의미를 한 줄 설명.
4. **경계·혼합**: T/F·S/N이 애매하면 indicators 해당 축에 boundaryNote에 "혼합형/경계형" 설명.
5. **대안 비교**: 1·2·3순위 유형을 alternativeTypes에 채우고, 왜 1순위인지·왜 2·3이 아닌지 구체 비교.
6. **관계 실전**: 호감/불편/친밀/갈등/답장·이모티콘/연락 선호를 relationshipAndCommunication 구조 필드에 채움.
7. **한계**: analysisLimitations에 업무 대화 편향·캡처 부족·관계 맥락 등 솔직히 기술 (신뢰 상승 목적).
8. **실전 팁**: practicalTips에 소통·서운함·갈등·일정 제안 등 실행 가능한 문장.

## 출력
JSON만. 한국어. 빈 필드는 null 또는 []. 개인정보는 가명·최소 인용.`;
}

/** Free: 짧은 맛보기 전용 — 토큰 절약, 풀 지표 리포트 생성 금지 */
function buildFreeSystemPrompt() {
  const skill = getSkillPrompt();
  return `당신은 카카오톡 캡처 이미지를 보고 MBTI를 **빠르게 방향만** 제시하는 에이전트입니다.

${skill}

## 분석 깊이 (무료 · 빠른 추정)
이번 요청은 **무료 빠른 추정**입니다. 캡처 **최대 3장**만으로 압축 판단하므로 **오판 가능성**이 큽니다. **1·2·3순위 유형**을 제시하되, 사용자에게는 **가까운 후보 1개(2순위)** 강조용으로 쓰입니다. **4축 지표별 상세(indicators)는 출력하지 마세요.**
**evidenceBullets**에 캡처 기반 짧은 근거 2~3개(「인용」→ 한 줄 해석)를 반드시 넣어 "내 카톡을 봤다" 느낌을 주세요.
한 줄 요약·티저·잠금 미리보기로 프리미엄 가치를 구체적으로 유도하세요.
확신도는 입력이 제한적이므로 **52~78** 정도, confidenceLevel은 MEDIUM 또는 LOW 우선.

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
    text: `## 출력 (JSON만, 키 누락 금지 — 없으면 null/[])
{"tier":"premium","mbtiType":"XXXX",
"confidence":52-88,"confidenceLevel":"HIGH|MEDIUM|LOW","confidenceReason":"숫자가 이 정도인 이유 한 문장",
"oneLineConclusion":"ESTJ / 구조와 실행 중심 … (유형 + 한 줄 성향)",
"keyEvidenceSummary":[
  {"snippet":"「짧은 인용 또는 패턴」","axis":"J","insight":"왜 이 결론에 쓰였는지 한 줄"},
  {"snippet":"…","axis":"T","insight":"…"},
  {"snippet":"…","axis":"E","insight":"…"}
],
"indicators":{
"EI":{"result":"E","score":68,"confidence":70,"evidence":["≥3"],"interpretation":"","boundaryNote":null,"strengthLabel":"보통"},
"SN":{"result":"S","score":55,"confidence":52,"evidence":["≥3"],"interpretation":"","boundaryNote":"애매하면 한 줄","strengthLabel":"낮음"},
"TF":{"result":"T","score":62,"confidence":58,"evidence":["≥3"],"interpretation":"","boundaryNote":null,"strengthLabel":"보통"},
"JP":{"result":"J","score":71,"confidence":75,"evidence":["≥3"],"interpretation":"","boundaryNote":null,"strengthLabel":"높음"}},
"highlights":{"chatPatterns":[3,6],"profileAnalysis":null,"behaviorAnalysis":null},
"traits":[3,6],"tags":[],"conflicts":[],
"profile":{"mood":"","status":"","bg":"","score":0-100}|null,
"alternativeTypes":{
"first":{"mbtiType":"XXXX","oneLiner":"1순위 한 줄"},
"second":{"mbtiType":"YYYY","shared":"1순위와 공통점","difference":"왜 최종 선택에서 밀렸는지"},
"third":{"mbtiType":"ZZZZ","shared":"…","difference":"…"},
"whyFirst":"최종적으로 1순위를 택한 이유 2~4문장"
},
"relationshipAndCommunication":{
"summary":"전체 해석형 2~4문장 (일반론 금지)",
"whenInterested":"호감 있을 때 말투·행동",
"whenUncomfortable":"불편할 때",
"whenClose":"친해졌을 때",
"inConflict":"싸울 때 반응",
"replyAndEmoji":"답장/이모티콘/말투",
"contactPreference":"연락 선호",
"tips":["실전 팁"]
},
"practicalTips":{
"effectiveCommunication":["이 사람에게 잘 통하는 말하기"],
"whenHurt":["서운함 전달 시"],
"conflictAvoid":["갈등 시 피할 것"],
"scheduling":["약속·일정 제안"],
"emotionVsDirect":"감정 토로 vs 핵심 전달 중 무엇이 더 잘 통하는지 한 줄"
},
"workAndRoutine":{"summary":"2~3문장","tips":["…"]},
"cautionAndMisread":{"points":["이 입력에서의 오판 포인트"]},
"analysisLimitations":{"points":["업무 편향","캡처 수","관계 맥락","프로필은 보조 근거"]},
"quotedInsights":[{"quote":"짧은 인용","note":"해석"}],
"emoji":"😀","title":"유형 한글 타이틀","color":"#hex"}`,
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
