"use client";

import { FREE_LIMIT, MEMO_MIN_DEEP } from "@/lib/analysis-tier";

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
}) {
  const used = freeCount?.used ?? 0;
  const simpleNeedsPay = !isDeepTab && used >= FREE_LIMIT;

  const buttonLabel = (() => {
    if (isLoading) return "확인 중...";
    if (isDeepTab) {
      if (imageCount < 1) return "캡처를 1장 이상 올려주세요";
      if (memoLength < MEMO_MIN_DEEP)
        return `추가 정보 ${MEMO_MIN_DEEP}자 이상 입력`;
      return "심층 MBTI 분석 요청 (결제)";
    }
    if (isMulti && hasMemo) return "종합 MBTI 분석 요청";
    if (isMulti) return `캡처 ${imageCount}장으로 MBTI 분석 요청`;
    return "간단 MBTI 분석 요청";
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
        {isDeepTab ? (
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
              memoLength >= MEMO_MIN_DEEP
                ? "bg-green-50 text-green-600"
                : "bg-white/40 text-gray-400"
            }`}
          >
            {memoLength >= MEMO_MIN_DEEP ? "✓" : "○"} 추가 정보{" "}
            {memoLength >= MEMO_MIN_DEEP
              ? "충분"
              : `${memoLength}/${MEMO_MIN_DEEP}자`}
          </span>
        ) : (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-white/40 text-gray-400">
            간단 모드 · 텍스트 없음
          </span>
        )}
        {(isMulti || (isDeepTab && hasMemo)) && (
          <span
            className="text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"
            style={{ background: "rgba(254,229,0,0.2)", color: "#856C00" }}
          >
            ✨ {isDeepTab ? "심층" : isMulti && hasMemo ? "최고 정확도" : "높은 정확도"}
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
        <span className="text-xl">{isDeepTab || simpleNeedsPay ? "💳" : "🔍"}</span>
        <span>{buttonLabel}</span>
      </button>

      {canAnalyze && !isLoading && (
        <p className="text-xs text-center text-gray-400 mt-2">
          {isDeepTab
            ? `심층 분석 · 결제 ₩${PRICE.toLocaleString()} · 약 10~20초`
            : simpleNeedsPay
              ? `간단 분석 · 결제 ₩${PRICE.toLocaleString()}`
              : freeCount
                ? `무료 간단 ${FREE_LIMIT - used}회 남음 · 약 5~15초`
                : "약 5~15초 내에 결과를 드릴게요"}
        </p>
      )}
    </div>
  );
}
