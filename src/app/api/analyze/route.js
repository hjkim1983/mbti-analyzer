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
import { sanitizeBehaviorAnswers } from "@/lib/behavior-answers-sanitize";
import {
  isDevModeServer,
  summarizeAnalyzeBodyForLog,
} from "@/lib/dev-mode";

/** DEV_MODE 시 Gemini·기타 오류를 화면에 넘길 직렬화 가능 객체 */
function serializeDevGeminiError(err) {
  if (!err) return null;
  const o =
    typeof err === "object"
      ? err
      : { message: String(err), name: "Error" };
  return {
    name: o.name,
    message: o.message,
    stack: o.stack,
    status: o.status,
    rawJson: o.rawJson ?? undefined,
    rawBody: o.rawBody ?? undefined,
    rawPreview: o.rawPreview ?? undefined,
    finishReason: o.finishReason ?? undefined,
  };
}

const RELATIONSHIP_ALLOWED = new Set([
  "friend",
  "some",
  "lover",
  "coworker",
  "family",
  "crush",
  "acquaintance",
  "other",
]);

function sanitizeRelationship(v) {
  return typeof v === "string" && RELATIONSHIP_ALLOWED.has(v) ? v : null;
}

/**
 * 프리미엄: 다중 이미지·긴 JSON 생성 시 60초를 넘길 수 있음.
 * Vercel Hobby는 플랜상 최대 60초로 제한될 수 있음 → 그 경우 Hobby에서는
 * 타임아웃이 날 수 있으니 Pro 이상 또는 self-host에서 120 권장.
 */
export const maxDuration = 120;

export async function POST(request) {
  const devMode = isDevModeServer();

  try {
    const body = await request.json();
    const {
      deviceId,
      targetName,
      memo,
      images,
      paymentId,
      mode: rawMode,
      relationship: rawRelationship,
      behaviorAnswers: rawBehaviorAnswers,
    } = body;

    if (devMode) {
      console.log(
        "[DEV_MODE] /api/analyze 요청",
        JSON.stringify(summarizeAnalyzeBodyForLog(body), null, 2),
      );
    }

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
    if (needPay && !paymentId && !devMode) {
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

    /** devMode 에서 결제 생략 시 유료 분석으로 기록하지 않음 */
    const isPaid = needPay && Boolean(paymentId) && !devMode;

    const relationship = sanitizeRelationship(rawRelationship);
    const behaviorAnswers = sanitizeBehaviorAnswers(rawBehaviorAnswers);

    if (mode === ANALYSIS_MODE.PREMIUM) {
      if (!relationship || !behaviorAnswers) {
        return NextResponse.json(
          {
            success: false,
            error: "INVALID_INPUT",
            message: "관계 선택과 행동 문항 7개에 모두 답해주세요",
          },
          { status: 400 },
        );
      }
    }

    let result;
    try {
      result = await callGemini({
        targetName: targetName || "미지정",
        memo: memoTrim,
        images: imagesForGemini,
        mode,
        relationship:
          mode === ANALYSIS_MODE.FREE ? null : relationship,
        behaviorAnswers:
          mode === ANALYSIS_MODE.FREE ? {} : behaviorAnswers,
      });
    } catch (err) {
      const devErr = devMode
        ? { devGeminiError: serializeDevGeminiError(err) }
        : {};
      if (err.message === "ANALYSIS_TIMEOUT") {
        const payload = {
          success: false,
          error: "ANALYSIS_TIMEOUT",
          message: "분석 시간이 초과되었습니다. 다시 시도해주세요.",
          ...devErr,
        };
        if (devMode) {
          console.log("[DEV_MODE] /api/analyze 응답", JSON.stringify(payload, null, 2));
        }
        return NextResponse.json(payload, { status: 504 });
      }
      if (err.message === "QUOTA_EXCEEDED") {
        const payload = {
          success: false,
          error: "QUOTA_EXCEEDED",
          message:
            "AI 서버 요청 한도를 초과했습니다. 1분 후 다시 시도해주세요.",
          ...devErr,
        };
        if (devMode) {
          console.log("[DEV_MODE] /api/analyze 응답", JSON.stringify(payload, null, 2));
        }
        return NextResponse.json(payload, { status: 429 });
      }

      /** Gemini 503·UNAVAILABLE 등 — 재시도 후에도 실패한 일시 과부하 */
      const httpStatus =
        typeof err.status === "number" ? err.status : undefined;
      const msg =
        typeof err.message === "string" ? err.message : "";
      const isGeminiUnavailable =
        httpStatus === 503 ||
        httpStatus === 502 ||
        httpStatus === 504 ||
        msg.includes("과부하") ||
        msg.includes("잠시") && msg.includes("다시 시도");

      if (isGeminiUnavailable) {
        const payload = {
          success: false,
          error: "GEMINI_UNAVAILABLE",
          message:
            msg ||
            "AI 분석 서버가 잠시 사용할 수 없어요. 잠시 후 다시 시도해 주세요.",
          ...devErr,
        };
        if (devMode) {
          console.log(
            "[DEV_MODE] /api/analyze 응답",
            JSON.stringify(payload, null, 2),
          );
        }
        return NextResponse.json(payload, { status: 503 });
      }

      console.error("Gemini 분석 오류:", err);
      const failPayload = {
        success: false,
        error: "ANALYSIS_FAILED",
        message: msg || "AI 분석 중 오류가 발생했습니다.",
        ...devErr,
      };
      if (devMode) {
        console.log(
          "[DEV_MODE] /api/analyze 응답",
          JSON.stringify(failPayload, null, 2),
        );
      }
      return NextResponse.json(failPayload, { status: 500 });
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

    const okPayload = {
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
    };
    if (devMode) {
      console.log(
        "[DEV_MODE] /api/analyze 응답",
        JSON.stringify(okPayload, null, 2),
      );
    }
    return NextResponse.json(okPayload);
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
