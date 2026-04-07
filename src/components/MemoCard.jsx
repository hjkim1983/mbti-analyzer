"use client";

import GlassCard from "./GlassCard";
import {
  BEHAVIOR_TAGS,
  RELATIONSHIP_OPTIONS,
  CONTEXT_OPTIONS,
} from "@/constants/mbti-data";

const chipBase =
  "text-xs px-2.5 py-1.5 rounded-full border transition-all duration-150 active:scale-95";

export default function MemoCard({
  memo,
  onMemoChange,
  selectedTags = [],
  onToggleTag,
  relationship,
  onRelationshipChange,
  chatContext,
  onChatContextChange,
  isDeep = false,
}) {
  const hasMemoText = memo.trim().length > 0;
  const hasInput =
    hasMemoText ||
    selectedTags.length > 0 ||
    Boolean(relationship) ||
    Boolean(chatContext);

  return (
    <GlassCard animate delay={3} className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
            ✏️ 말투·행동·맥락
            <span className="text-xs font-normal text-gray-400 bg-white/50 px-2 py-0.5 rounded-full">
              {isDeep ? "프리미엄 · 선택" : "선택사항"}
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {isDeep
              ? "관계·맥락·행동 태그를 쓰면 리포트에 반영돼요. 비워도 캡처만으로 분석할 수 있어요"
              : "행동 태그·관계·맥락은 무료 추정에도 반영돼요 (긴 글은 프리미엄)"}
          </p>
        </div>
        {hasInput && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full text-green-700 bg-green-50">
            ✓ 입력됨
          </span>
        )}
      </div>

      {/* 관계 */}
      <p className="text-xs font-bold text-gray-500 mb-2">관계</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {RELATIONSHIP_OPTIONS.map((opt) => {
          const active = relationship === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                onRelationshipChange(active ? null : opt.value)
              }
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

      {/* 대화 분위기 */}
      <p className="text-xs font-bold text-gray-500 mb-2">대화 분위기</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {CONTEXT_OPTIONS.map((opt) => {
          const active = chatContext === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                onChatContextChange(active ? null : opt.value)
              }
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

      {/* 행동형 태그 */}
      <p className="text-xs font-bold text-gray-500 mb-2">행동·패턴 (복수 선택)</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {BEHAVIOR_TAGS.map((tag) => {
          const active = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              className={chipBase}
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

      {/* 자유 텍스트 — 프리미엄만 */}
      {isDeep ? (
        <>
          <p className="text-xs font-bold text-gray-500 mb-1.5">직접 작성</p>
          <textarea
            value={memo}
            onChange={(e) => onMemoChange(e.target.value.slice(0, 300))}
            placeholder="예) 말이 빠르고 이모티콘을 자주 씀. 논쟁할 때 감정보다는 논리를 먼저 꺼냄."
            rows={4}
            className="w-full text-sm text-gray-700 rounded-2xl p-3.5 resize-none bg-white/60"
            style={{
              border: hasMemoText
                ? "1.5px solid #FEE500"
                : "1.5px solid rgba(255,255,255,0.4)",
              lineHeight: "1.65",
            }}
          />
          <div className="flex justify-between mt-1.5">
            <p className="text-xs text-gray-300">
              태그·맥락과 함께 자유롭게 적어 주세요
            </p>
            <p
              className="text-xs"
              style={{ color: memo.length > 260 ? "#EF4444" : "#9CA3AF" }}
            >
              {memo.length} / 300
            </p>
          </div>
        </>
      ) : (
        <p className="text-xs text-amber-700/90 bg-amber-50/80 rounded-xl px-3 py-2 border border-amber-100">
          무료 빠른 추정에는 <b>긴 메모</b>가 서버에 포함되지 않아요. 자세한 관찰 메모는{" "}
          <b>프리미엄</b> 탭에서 입력할 수 있어요.
        </p>
      )}
    </GlassCard>
  );
}
