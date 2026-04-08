"use client";

import GlassCard from "./GlassCard";
import { RELATIONSHIP_OPTIONS } from "@/constants/mbti-data";

const chipBase =
  "text-xs px-2.5 py-1.5 rounded-full border transition-all duration-150 active:scale-95";

/**
 * 이미지 업로드 직후 — 관계 단일 선택 (필수)
 */
export default function RelationshipSelect({ value, onChange }) {
  return (
    <GlassCard animate delay={2} className="mb-4">
      <div className="mb-3">
        <h2 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 flex-wrap">
          이 사람과의 관계
          <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-amber-500 px-2 py-0.5 rounded-full">
            필수
          </span>
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          관계에 따라 분석 기준이 달라져요
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {RELATIONSHIP_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={chipBase}
              style={{
                background: active ? "#FEE500" : "rgba(255,255,255,0.6)",
                borderColor: active ? "#FEE500" : "rgba(255,255,255,0.4)",
                color: active ? "#1a1a1a" : "#6B7280",
                fontWeight: active ? "700" : "500",
              }}
            >
              {active ? "✓ " : ""}
              {opt.label}
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}
