"use client";

import { PREMIUM_OBSERVER_TRAIT_GROUPS } from "@/constants/premium-observer-traits";

const accent = "var(--mbti-warm-accent)";
const accentSoft = "rgba(232,120,10,0.12)";

/**
 * 프리미엄 마지막 단계 — 관찰 특징 복수 선택 + 직접 입력(선택)
 */
export default function PremiumObserverTraitsCard({
  selectedIds,
  onToggleTrait,
  memoExtra,
  onMemoExtraChange,
}) {
  const n = selectedIds.length;
  const hasExtra = memoExtra.trim().length > 0;

  return (
    <div className="mbti-warm-card p-4 mb-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3
            className="text-sm font-extrabold leading-snug"
            style={{ color: "var(--mbti-warm-text)" }}
          >
            이 사람의 특징을 골라주세요
          </h3>
          <p
            className="text-xs mt-1 leading-relaxed"
            style={{ color: "var(--mbti-warm-text-muted)" }}
          >
            해당되는 만큼 복수 선택 가능해요. 선택한 내용은 분석에 반영돼요.
          </p>
        </div>
        {n > 0 && (
          <span
            className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(34,197,94,0.12)",
              color: "#15803d",
            }}
          >
            {n}개 선택
          </span>
        )}
      </div>

      <div className="space-y-4">
        {PREMIUM_OBSERVER_TRAIT_GROUPS.map((group) => (
          <div key={group.title}>
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-2"
              style={{ color: "var(--mbti-warm-text-muted)" }}
            >
              {group.title}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => {
                const on = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onToggleTrait(item.id)}
                    className="text-left text-xs font-medium px-3 py-2 rounded-xl border transition-all duration-200 active:scale-[0.98]"
                    style={{
                      borderColor: on
                        ? "rgba(232,120,10,0.45)"
                        : "var(--mbti-warm-border)",
                      background: on ? accentSoft : "rgba(255,255,255,0.5)",
                      color: on
                        ? "var(--mbti-warm-text)"
                        : "var(--mbti-warm-text-body)",
                      boxShadow: on
                        ? "0 2px 12px rgba(232,120,10,0.12)"
                        : undefined,
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-4 h-4 rounded border flex items-center justify-center text-[10px] leading-none shrink-0"
                        style={{
                          borderColor: on ? accent : "#c4b49a",
                          background: on ? accent : "transparent",
                          color: on ? "#fff" : "transparent",
                        }}
                      >
                        {on ? "✓" : ""}
                      </span>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div
        className="mt-5 pt-4 border-t"
        style={{ borderColor: "var(--mbti-warm-border)" }}
      >
        <label
          className="text-xs font-bold block mb-2"
          style={{ color: "var(--mbti-warm-text)" }}
        >
          직접 적고 싶은 내용{" "}
          <span
            className="font-normal"
            style={{ color: "var(--mbti-warm-text-muted)" }}
          >
            (선택)
          </span>
        </label>
        <textarea
          value={memoExtra}
          onChange={(e) => onMemoExtraChange(e.target.value.slice(0, 300))}
          placeholder="특징 목록에 없는 관찰을 짧게 적어주세요"
          rows={3}
          className="w-full text-sm rounded-2xl p-3.5 resize-none bg-white/70"
          style={{
            border: hasExtra
              ? "1.5px solid rgba(232,120,10,0.35)"
              : "1.5px solid var(--mbti-warm-border)",
            color: "var(--mbti-warm-text-body)",
            lineHeight: 1.65,
          }}
        />
        <div className="flex justify-end mt-1">
          <span
            className="text-[11px] tabular-nums"
            style={{
              color: memoExtra.length > 260 ? "#EF4444" : "#c4b49a",
            }}
          >
            {memoExtra.length} / 300
          </span>
        </div>
      </div>
    </div>
  );
}
