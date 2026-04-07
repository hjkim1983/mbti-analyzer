import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import {
  getAnalysisCount,
  incrementAnalysisCount,
  saveAnalysis,
  FREE_LIMIT,
} from "@/lib/analysis-count";
import { getMbtiMeta } from "@/constants/mbti-data";
import {
  ANALYSIS_MODE,
  MAX_IMAGES_SENT_PREMIUM,
  normalizeAnalysisMode,
  validateAnalysisRequest,
  requiresPayment,
} from "@/lib/analysis-tier";
import { selectImagesForApi } from "@/lib/analysis-images";
import { normalizeGeminiAnalysisResult } from "@/lib/analysis-result-normalize";

const RELATIONSHIP_ALLOWED = new Set([
  "friend",
  "some",
  "lover",
  "coworker",
  "family",
  "other",
]);
const CHAT_CONTEXT_ALLOWED = new Set([
  "daily",
  "work",
  "conflict",
  "comfort",
  "plan",
  "casual",
]);

function sanitizeRelationship(v) {
  return typeof v === "string" && RELATIONSHIP_ALLOWED.has(v) ? v : null;
}

function sanitizeChatContext(v) {
  return typeof v === "string" && CHAT_CONTEXT_ALLOWED.has(v) ? v : null;
}

// Vercel Hobby: 최대 60초 — 심층(최대 10장) 처리 시간 확보
export const maxDuration = 60;

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      deviceId,
      targetName,
      memo,
      images,
      paymentId,
      mode: rawMode,
      tags: rawTags,
      relationship: rawRelationship,
      chatContext: rawChatContext,
    } = body;

    const mode = normalizeAnalysisMode(rawMode);

    if (!deviceId) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_INPUT",
          message: "디바이스 ID가 필요합니다",
        },
        { status: 400 },
      );
    }

    const { profileId, count } = await getAnalysisCount(deviceId);

    const tierCheck = validateAnalysisRequest({
      mode,
      images: images || [],
      memo,
    });
    if (!tierCheck.ok) {
      return NextResponse.json(
        {
          success: false,
          error: tierCheck.error,
          message: tierCheck.message,
          ...(tierCheck.freeCount ? { freeCount: tierCheck.freeCount } : {}),
        },
        { status: tierCheck.status },
      );
    }

    const hasImages = images && images.length > 0;
    const memoTrim =
      mode === ANALYSIS_MODE.FREE ? "" : (memo || "").trim();

    /** 프리미엄: 업로드 10장이어도 API는 대표 N장만 사용 (토큰·지연 절감) */
    let imagesForGemini = images || [];
    if (mode === ANALYSIS_MODE.PREMIUM && imagesForGemini.length > 0) {
      imagesForGemini = selectImagesForApi(
        imagesForGemini,
        MAX_IMAGES_SENT_PREMIUM,
      );
    }

    if (!hasImages && mode === ANALYSIS_MODE.FREE) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_INPUT",
          message: "캡처 이미지가 필요합니다",
        },
        { status: 400 },
      );
    }

    const needPay = requiresPayment(mode, count);
    if (needPay && !paymentId) {
      return NextResponse.json(
        {
          success: false,
          error: "PAYMENT_REQUIRED",
          message:
            mode === ANALYSIS_MODE.PREMIUM
              ? "프리미엄 리포트는 결제 후 이용할 수 있어요"
              : "무료 빠른 추정 횟수를 모두 사용했어요. 프리미엄 탭에서 결제 후 이용해 주세요",
          freeCount: { used: count, remaining: Math.max(0, FREE_LIMIT - count) },
        },
        { status: 402 },
      );
    }

    const isPaid = needPay;

    const contextTags = Array.isArray(rawTags)
      ? rawTags
          .map((t) => (typeof t === "string" ? t.trim() : ""))
          .filter(Boolean)
          .slice(0, 12)
      : [];

    const relationship = sanitizeRelationship(rawRelationship);
    const chatContext = sanitizeChatContext(rawChatContext);

    let result;
    try {
      result = await callGemini({
        targetName: targetName || "미지정",
        memo: memoTrim,
        images: imagesForGemini,
        mode,
        tags: contextTags,
        relationship,
        chatContext,
      });
    } catch (err) {
      if (err.message === "ANALYSIS_TIMEOUT") {
        return NextResponse.json(
          {
            success: false,
            error: "ANALYSIS_TIMEOUT",
            message: "분석 시간이 초과되었습니다. 다시 시도해주세요.",
          },
          { status: 504 },
        );
      }
      if (err.message === "QUOTA_EXCEEDED") {
        return NextResponse.json(
          {
            success: false,
            error: "QUOTA_EXCEEDED",
            message:
              "AI 서버 요청 한도를 초과했습니다. 1분 후 다시 시도해주세요.",
          },
          { status: 429 },
        );
      }
      console.error("Gemini 분석 오류:", err);
      return NextResponse.json(
        {
          success: false,
          error: "ANALYSIS_FAILED",
          message: "AI 분석 중 오류가 발생했습니다.",
        },
        { status: 500 },
      );
    }

    result = normalizeGeminiAnalysisResult(result, { mode });

    const analysisId = await saveAnalysis({
      profileId,
      targetName: targetName || "미지정",
      result,
      memo: memoTrim || null,
      imageCount: imagesForGemini?.length || 0,
      isPaid,
      paymentId,
      analysisMode: mode,
    });

    await incrementAnalysisCount(profileId);
    const newCount = count + 1;

    const meta = getMbtiMeta(result.mbtiType);

    return NextResponse.json({
      success: true,
      data: {
        analysisId,
        ...result,
        emoji: meta.emoji,
        title: meta.title,
        color: meta.color,
        analysisMode: mode,
      },
      freeCount: {
        used: newCount,
        remaining: Math.max(0, FREE_LIMIT - newCount),
      },
    });
  } catch (err) {
    console.error("분석 API 오류:", err);
    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: "서버 오류가 발생했습니다",
      },
      { status: 500 },
    );
  }
}
