"use client";

const FREE_LIMIT = 3;
const PRICE = 1900;

export default function AnalyzeButton({
  canAnalyze,
  freeCount,
  isMulti,
  hasMemo,
  imageCount,
  onAnalyze,
  isLoading,
}) {
  const isPaid = freeCount && freeCount.used >= FREE_LIMIT;

  const buttonLabel = (() => {
    if (isLoading) return "확인 중...";
    if (isMulti && hasMemo) return "종합 MBTI 분석 요청";
    if (isMulti) return `캡처 ${imageCount}장으로 MBTI 분석 요청`;
    if (hasMemo && imageCount === 0) return "입력 정보로 MBTI 분석 요청";
    return "MBTI 분석 요청";
  })();

  return (
    <div className="anim-slide-up delay-4">
      {/* 입력 상태 요약 */}
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
            hasMemo
              ? "bg-green-50 text-green-600"
              : "bg-white/40 text-gray-400"
          }`}
        >
          {hasMemo ? "✓" : "○"} 추가 정보 {hasMemo ? "입력됨" : "없음"}
        </span>
        {(isMulti || hasMemo) && (
          <span
            className="text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"
            style={{ background: "rgba(254,229,0,0.2)", color: "#856C00" }}
          >
            ✨ {isMulti && hasMemo ? "최고 정확도" : "높은 정확도"}
          </span>
        )}
      </div>

      {/* CTA 버튼 */}
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
        <span className="text-xl">{isPaid ? "💳" : "🔍"}</span>
        <span>{buttonLabel}</span>
      </button>

      {/* 무료/유료 안내 */}
      {canAnalyze && !isLoading && (
        <p className="text-xs text-center text-gray-400 mt-2">
          {isPaid
            ? `유료 분석 · ₩${PRICE.toLocaleString()}`
            : freeCount
              ? `무료 ${FREE_LIMIT - freeCount.used}회 남음 · 약 5~10초`
              : "약 5~10초 내에 결과를 드릴게요"}
        </p>
      )}
    </div>
  );
}
