"use client";

import { FREE_LIMIT } from "@/lib/analysis-tier";

const REL_ICONS = {
  free: "🔍",
  premium: "✨",
};

/** 무료·프리미엄 티어 카드 동일 최소 높이 */
const TIER_CARD_MIN_H = "min-h-[8.1rem]";

/**
 * 무료/유료(프리미엄) 선택 — mbti-input-prototype-v5 톤
 * @param {{ onPickFree: () => void, onPickPremium: () => void, freeRemaining: number | null }} p
 */
export default function TierPickScreen({
  onPickFree,
  onPickPremium,
  freeRemaining,
}) {
  const remaining =
    freeRemaining != null ? freeRemaining : FREE_LIMIT;

  return (
    <div className="relative z-10 pt-8 pb-6 px-1 mbti-warm-fade-in">
      <div className="text-center mb-10">
        {/* 헤더 로고와 동일 — 카카오톡 톤 옐로(#FEE500) */}
        <div
          className="inline-flex items-center justify-center w-[4.5rem] h-[4.5rem] rounded-3xl mb-5 text-4xl"
          style={{
            background: "#FEE500",
            boxShadow: "0 8px 28px rgba(254, 229, 0, 0.45)",
          }}
        >
          <span className="leading-none" aria-hidden>
            💬
          </span>
        </div>
        <h1
          className="text-[1.65rem] font-extrabold leading-snug mb-3"
          style={{ color: "var(--mbti-warm-text)" }}
        >
          말투로 MBTI를
          <br />
          읽어드릴게요
        </h1>
        <p
          className="text-sm leading-relaxed max-w-[20rem] mx-auto"
          style={{ color: "var(--mbti-warm-text-muted)" }}
        >
          먼저 분석 방식을 골라주세요.
          <br />
          다음 화면에서 대화 캡처를 올리게 됩니다.
        </p>
      </div>

      <div className="flex flex-col gap-4 max-w-md mx-auto">
        {/* 동일 min-height + 푸터 슬롯으로 두 카드 높이 맞춤 */}
        <button
          type="button"
          onClick={onPickFree}
          className={`mbti-warm-card text-left p-5 rounded-[1.125rem] transition-all duration-200 active:scale-[0.99] hover:shadow-md border-2 border-orange-200/30 hover:border-orange-300/50 ${TIER_CARD_MIN_H} flex flex-col`}
        >
          <div className="flex gap-4 flex-1 items-stretch min-h-0">
            <span className="text-3xl shrink-0" aria-hidden>
              {REL_ICONS.free}
            </span>
            <div className="min-w-0 flex flex-col flex-1">
              <p
                className="font-bold text-base mb-1"
                style={{ color: "var(--mbti-warm-text)" }}
              >
                기본 테스트 (무료)
              </p>
              <p
                className="text-xs leading-relaxed flex-1"
                style={{ color: "var(--mbti-warm-text-body)" }}
              >
                캡처 이미지만으로 MBTI 방향을 빠르게 추정해요. 관계·문항 입력은
                없어요.
              </p>
              <div className="mt-2 min-h-[1.75rem] flex items-end">
                <span
                  className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(232,120,10,0.1)",
                    color: "var(--mbti-warm-accent)",
                  }}
                >
                  남은 무료 {remaining}회 / 전체 {FREE_LIMIT}회
                </span>
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onPickPremium}
          className={`mbti-warm-card text-left p-5 rounded-[1.125rem] transition-all duration-200 active:scale-[0.99] hover:shadow-md border-2 border-orange-300/40 hover:border-orange-400/60 ${TIER_CARD_MIN_H} flex flex-col`}
          style={{
            boxShadow: "0 4px 20px rgba(232,120,10,0.12)",
          }}
        >
          <div className="flex gap-4 flex-1 items-stretch min-h-0">
            <span className="text-3xl shrink-0" aria-hidden>
              {REL_ICONS.premium}
            </span>
            <div className="min-w-0 flex flex-col flex-1">
              <p
                className="font-bold text-base mb-1"
                style={{ color: "var(--mbti-warm-text)" }}
              >
                프리미엄 테스트 (유료)
              </p>
              <p
                className="text-xs leading-relaxed flex-1"
                style={{ color: "var(--mbti-warm-text-body)" }}
              >
                캡처 → 관계 → 관찰 문항 → 특징 선택 순으로 진행하고, 결제 후
                풀 리포트를 받아요.
              </p>
              <div className="mt-2 min-h-[1.75rem] flex items-end">
                <span
                  className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(232,120,10,0.08)",
                    color: "var(--mbti-warm-text-body)",
                  }}
                >
                  결제 후 풀 리포트
                </span>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
