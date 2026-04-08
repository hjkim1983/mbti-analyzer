"use client";

import GlassCard from "./GlassCard";
import { BEHAVIOR_QUESTIONS } from "@/constants/behavior-questions";

const total = BEHAVIOR_QUESTIONS.length;

const btnBase =
  "flex-1 text-left text-xs leading-snug px-3 py-2.5 rounded-xl border transition-all duration-150 active:scale-[0.99]";

/**
 * 관계 선택 후 — 행동 관찰 문항 7개 (필수, skip 허용)
 */
export default function BehaviorQuestions({
  relationship,
  answers,
  onAnswer,
}) {
  const enabled = Boolean(relationship);
  const answeredCount = Object.keys(answers).length;

  return (
    <GlassCard
      animate
      delay={3}
      className={`mb-4 ${!enabled ? "opacity-55 pointer-events-none select-none" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h2 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 flex-wrap">
            이 사람은 평소에 어떤 편인가요?
            <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-amber-500 px-2 py-0.5 rounded-full">
              필수
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            느낌대로 골라주세요, 정답은 없어요
          </p>
        </div>
        <p className="text-xs font-bold text-gray-500 whitespace-nowrap shrink-0">
          {answeredCount}/{total} 답변 완료
        </p>
      </div>

      {!enabled && (
        <p className="text-xs text-amber-800 bg-amber-50/90 rounded-xl px-3 py-2 mb-3 border border-amber-100">
          위에서 <b>관계</b>를 먼저 선택하면 문항을 풀 수 있어요.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {BEHAVIOR_QUESTIONS.map((q) => {
          const selected = answers[q.id];
          return (
            <div
              key={q.id}
              className="rounded-xl p-3.5 bg-white/55 border border-white/60"
              style={{ borderRadius: "12px" }}
            >
              <p className="text-sm font-bold text-gray-900 mb-3">{q.question}</p>

              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => onAnswer(q.id, "A")}
                  className={btnBase}
                  style={{
                    borderColor: selected === "A" ? "#FEE500" : "rgba(0,0,0,0.08)",
                    background:
                      selected === "A"
                        ? "rgba(254,229,0,0.2)"
                        : "rgba(255,255,255,0.7)",
                    color: selected === "A" ? "#1a1a1a" : "#4B5563",
                    opacity: selected && selected !== "A" ? 0.45 : 1,
                    fontWeight: selected === "A" ? "700" : "500",
                  }}
                >
                  <span className="mr-1.5 font-black text-[10px]">🅰</span>
                  {q.optionA}
                </button>
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => onAnswer(q.id, "B")}
                  className={btnBase}
                  style={{
                    borderColor: selected === "B" ? "#FEE500" : "rgba(0,0,0,0.08)",
                    background:
                      selected === "B"
                        ? "rgba(254,229,0,0.2)"
                        : "rgba(255,255,255,0.7)",
                    color: selected === "B" ? "#1a1a1a" : "#4B5563",
                    opacity: selected && selected !== "B" ? 0.45 : 1,
                    fontWeight: selected === "B" ? "700" : "500",
                  }}
                >
                  <span className="mr-1.5 font-black text-[10px]">🅱</span>
                  {q.optionB}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => onAnswer(q.id, "skip")}
                  className="text-[11px] text-gray-400 hover:text-gray-600 underline-offset-2 hover:underline py-1"
                  style={{
                    fontWeight: selected === "skip" ? "700" : "400",
                    color:
                      selected === "skip" ? "#92400E" : undefined,
                  }}
                >
                  ⏭ 모르겠어요
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
