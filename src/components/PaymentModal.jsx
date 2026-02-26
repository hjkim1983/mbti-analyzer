"use client";

const PRICE = 1900;

export default function PaymentModal({
  isOpen,
  analysisCount,
  onConfirm,
  onCancel,
  isProcessing,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={!isProcessing ? onCancel : undefined}
      />

      {/* 모달 */}
      <div className="glass relative w-full max-w-sm p-6 anim-pop">
        <div className="text-center mb-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl"
            style={{ background: "#FEE500" }}
          >
            💳
          </div>
          <h3 className="text-lg font-extrabold text-gray-900 mb-1">
            유료 분석 안내
          </h3>
          <p className="text-sm text-gray-500">
            무료 분석 3회를 모두 사용했어요
          </p>
        </div>

        <div
          className="rounded-2xl p-4 mb-5"
          style={{
            background: "rgba(254,229,0,0.1)",
            border: "1px solid rgba(254,229,0,0.3)",
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">카톡 MBTI 분석 1회</span>
            <span className="text-lg font-extrabold text-gray-900">
              ₩{PRICE.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>누적 분석 횟수</span>
            <span>{analysisCount}회 완료</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #FEE500, #FFD000)",
              color: "#1a1a1a",
              boxShadow: "0 4px 16px rgba(254,229,0,0.4)",
            }}
          >
            {isProcessing ? "결제 진행 중..." : `₩${PRICE.toLocaleString()} 결제하고 분석하기`}
          </button>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="w-full py-3 rounded-2xl font-medium text-sm text-gray-500 bg-white/50 border border-white/40 transition-all active:scale-95 disabled:opacity-50"
          >
            다음에 할게요
          </button>
        </div>

        <p className="text-xs text-center text-gray-400 mt-3">
          카드, 카카오페이, 네이버페이 사용 가능
        </p>
      </div>
    </div>
  );
}
