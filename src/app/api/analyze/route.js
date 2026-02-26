import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import {
  getAnalysisCount,
  incrementAnalysisCount,
  saveAnalysis,
  FREE_LIMIT,
} from "@/lib/analysis-count";
import { getMbtiMeta } from "@/constants/mbti-data";

export async function POST(request) {
  try {
    const body = await request.json();
    const { deviceId, targetName, memo, images, paymentId } = body;

    // 1. 입력 검증
    const hasImages = images && images.length > 0;
    const hasMemo = memo && memo.trim().length > 0;

    if (!hasImages && !hasMemo) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_INPUT",
          message: "이미지 또는 메모가 필요합니다",
        },
        { status: 400 },
      );
    }

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

    // 2. 분석 횟수 확인
    const { profileId, count } = await getAnalysisCount(deviceId);
    const isPaid = count >= FREE_LIMIT;

    // 3. 유료 분석 시 결제 확인
    if (isPaid && !paymentId) {
      return NextResponse.json(
        {
          success: false,
          error: "PAYMENT_REQUIRED",
          message: "무료 분석 횟수를 초과했습니다",
          freeCount: { used: count, remaining: 0 },
        },
        { status: 402 },
      );
    }

    // 4. Gemini AI 분석
    let result;
    try {
      result = await callGemini({
        targetName: targetName || "미지정",
        memo: memo || "",
        images: images || [],
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

    // 5. 결과 DB 저장
    const analysisId = await saveAnalysis({
      profileId,
      targetName: targetName || "미지정",
      result,
      memo,
      imageCount: images?.length || 0,
      isPaid,
      paymentId,
    });

    // 6. 횟수 증가
    await incrementAnalysisCount(profileId);
    const newCount = count + 1;

    // 7. MBTI 메타 정보 병합
    const meta = getMbtiMeta(result.mbtiType);

    return NextResponse.json({
      success: true,
      data: {
        analysisId,
        ...result,
        emoji: meta.emoji,
        title: meta.title,
        color: meta.color,
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
