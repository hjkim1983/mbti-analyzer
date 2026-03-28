"use client";

import { FREE_LIMIT } from "@/lib/analysis-tier";

const PRICE = 1900;

export default function PaymentModal({
  isOpen,
  analysisCount,
  onConfirm,
  onCancel,
  isProcessing,
  /** true: 유료 심층 탭에서 연 결제 */
  isDeepTab = false,
}) {
  if (!isOpen) return null;

  const title = isDeepTab ? "심층 분석 결제" : "유료 분석 안내";
  const desc = isDeepTab
    ? "심층 분석(최대 10장 + 말투·행동 등 텍스트)는 회당 결제 후 진행돼요"
    : `무료 간단 분석 ${FREE_LIMIT}회를 모두 사용했어요. 결제 후 간단 분석을 이어갈 수 있어요`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={!isProcessing ? onCancel : undefined}
      />

      <div className="glass relative w-full max-w-sm p-6 anim-pop">
        <div className="text-center mb-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl"
            style={{ background: "#FEE500" }}
          >
            💳
          </div>
          <h3 className="text-lg font-extrabold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-500">{desc}</p>
        </div>

        <div
          className="rounded-2xl p-4 mb-5"
          style={{
            background: "rgba(254,229,0,0.1)",
            border: "1px solid rgba(254,229,0,0.3)",
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              {isDeepTab ? "심층 MBTI 분석 1회" : "간단 MBTI 분석 1회"}
            </span>
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
            {isProcessing
              ? "결제 진행 중..."
              : `₩${PRICE.toLocaleString()} 결제하고 분석하기`}
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
