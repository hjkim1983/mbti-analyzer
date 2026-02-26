"use client";

import GlassCard from "./GlassCard";
import { QUICK_TAGS } from "@/constants/mbti-data";

export default function MemoCard({ memo, onMemoChange, onToggleTag }) {
  const hasMemo = memo.trim().length > 0;

  return (
    <GlassCard animate delay={3} className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
            ✏️ 추가 정보 입력
            <span className="text-xs font-normal text-gray-400 bg-white/50 px-2 py-0.5 rounded-full">
              선택사항
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            입력할수록 분석 정확도가 높아져요
          </p>
        </div>
        {hasMemo && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full text-green-700 bg-green-50">
            ✓ 입력됨
          </span>
        )}
      </div>

      {/* 퀵 태그 */}
      <p className="text-xs font-bold text-gray-500 mb-2">빠른 선택</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {QUICK_TAGS.map((tag) => {
          const active = memo.split("\n").includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              className="text-xs px-2.5 py-1.5 rounded-full border transition-all duration-150 active:scale-95"
              style={{
                background: active ? "#FEE500" : "rgba(255,255,255,0.6)",
                borderColor: active ? "#FEE500" : "rgba(255,255,255,0.4)",
                color: active ? "#1a1a1a" : "#6B7280",
                fontWeight: active ? "700" : "500",
              }}
            >
              {active ? "✓ " : ""}
              {tag}
            </button>
          );
        })}
      </div>

      {/* 자유 텍스트 */}
      <p className="text-xs font-bold text-gray-500 mb-1.5">직접 작성</p>
      <textarea
        value={memo}
        onChange={(e) => onMemoChange(e.target.value.slice(0, 300))}
        placeholder="예) 평소에 말이 많고 리액션이 과한 편이에요. 감정 표현도 잘 하고 유머 감각이 있어요."
        rows={4}
        className="w-full text-sm text-gray-700 rounded-2xl p-3.5 resize-none bg-white/60"
        style={{
          border: hasMemo
            ? "1.5px solid #FEE500"
            : "1.5px solid rgba(255,255,255,0.4)",
          lineHeight: "1.65",
        }}
      />
      <div className="flex justify-between mt-1.5">
        <p className="text-xs text-gray-300">
          태그 선택 또는 자유롭게 작성해주세요
        </p>
        <p
          className="text-xs"
          style={{ color: memo.length > 260 ? "#EF4444" : "#9CA3AF" }}
        >
          {memo.length} / 300
        </p>
      </div>
    </GlassCard>
  );
}
