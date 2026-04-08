"use client";

import { FREE_LIMIT } from "@/lib/analysis-tier";

const PRICE = 1900;

export default function AnalyzeButton({
  canAnalyze,
  freeCount,
  isMulti,
  hasMemo,
  imageCount,
  onAnalyze,
  isLoading,
  isDeepTab,
  memoLength = 0,
  relationshipOk = false,
  behaviorOk = false,
  formIncompleteHint = null,
}) {
  const used = freeCount?.used ?? 0;
  const freeNeedsPay = !isDeepTab && used >= FREE_LIMIT;

  const buttonLabel = (() => {
    if (isLoading) return "확인 중...";
    if (isDeepTab) {
      if (imageCount < 1) return "캡처를 1장 이상 올려주세요";
      return "프리미엄 MBTI 리포트 요청 (결제)";
    }
    if (isMulti && hasMemo) return "종합 MBTI 분석 요청";
    if (isMulti) return `캡처 ${imageCount}장으로 MBTI 분석 요청`;
    return "빠른 MBTI 추정 요청";
  })();

  return (
    <div className="anim-slide-up delay-4">
      <div className="flex items-center gap-2 mb-3 px-1 flex-wrap">
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
            imageCount > 0
              ? "bg-green-50 text-green-600"
              : "bg-white/40 text-gray-400"
          }`}
        >
          {imageCount > 0 ? "✓" : "○"} 캡처{" "}
          {imageCount > 0 ? `${imageCount}장` : "없음"}
        </span>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
            relationshipOk
              ? "bg-green-50 text-green-600"
              : "bg-white/40 text-gray-400"
          }`}
        >
          {relationshipOk ? "✓" : "○"} 관계
        </span>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
            behaviorOk
              ? "bg-green-50 text-green-600"
              : "bg-white/40 text-gray-400"
          }`}
        >
          {behaviorOk ? "✓" : "○"} 문항 10
        </span>
        {isDeepTab && (
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
              hasMemo
                ? "bg-green-50 text-green-600"
                : "bg-white/40 text-gray-400"
            }`}
          >
            {hasMemo ? "✓" : "○"} 메모 {hasMemo ? "입력" : "선택"}
          </span>
        )}
        {(isMulti || hasMemo || behaviorOk) && (
          <span
            className="text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"
            style={{ background: "rgba(254,229,0,0.2)", color: "#856C00" }}
          >
            ✨{" "}
            {isDeepTab
              ? "프리미엄"
              : isMulti && behaviorOk
                ? "최고 정확도"
                : "높은 정확도"}
          </span>
        )}
      </div>

      <button
        onClick={onAnalyze}
        disabled={!canAnalyze || isLoading}
        className="w-full py-5 rounded-2xl font-extrabold text-base transition-all active:scale-95 flex items-center justify-center gap-2"
        style={{
          background:
            canAnalyze && !isLoading
              ? "linear-gradient(135deg, #FEE500, #FFD000)"
              : "rgba(243,244,246,0.7)",
          color: canAnalyze && !isLoading ? "#1a1a1a" : "#9CA3AF",
          boxShadow:
            canAnalyze && !isLoading
              ? "0 6px 24px rgba(254,229,0,0.5)"
              : "none",
          cursor: canAnalyze && !isLoading ? "pointer" : "not-allowed",
        }}
      >
        <span className="text-xl">{isDeepTab || freeNeedsPay ? "💳" : "🔍"}</span>
        <span>{buttonLabel}</span>
      </button>

      {canAnalyze && !isLoading && (
        <p className="text-xs text-center text-gray-400 mt-2">
          {isDeepTab
            ? `프리미엄 리포트 · 결제 ₩${PRICE.toLocaleString()} · 약 10~20초`
            : freeNeedsPay
              ? `프리미엄으로 전환 후 결제 ₩${PRICE.toLocaleString()}`
              : freeCount
                ? `무료 빠른 추정 ${Math.max(0, FREE_LIMIT - used)}회 남음 · 약 5~15초`
                : "약 5~15초 내에 결과를 드릴게요"}
        </p>
      )}

      {!canAnalyze && !isLoading && formIncompleteHint && (
        <p className="text-xs text-center text-gray-400 mt-2">
          {formIncompleteHint}
        </p>
      )}
    </div>
  );
}
