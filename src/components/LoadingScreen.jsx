"use client";

import { getLoadingSteps } from "@/constants/loading-steps";

export default function LoadingScreen({
  loadingStep,
  isMulti,
  hasMemo,
  imageCount,
}) {
  const { steps, messages, icons } = getLoadingSteps(isMulti, hasMemo, imageCount);

  return (
    <div className="pt-14 flex flex-col items-center text-center anim-slide-up">
      {/* 중앙 아이콘 + 펄스 링 */}
      <div className="relative w-28 h-28 flex items-center justify-center mb-8">
        <div
          className="absolute inset-0 rounded-full anim-pulse-ring"
          style={{ background: "rgba(254,229,0,0.3)" }}
        />
        <div
          className="absolute inset-2 rounded-full anim-pulse-ring"
          style={{
            background: "rgba(254,229,0,0.2)",
            animationDelay: "0.35s",
          }}
        />
        <div
          className="relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl anim-float text-4xl"
          style={{ background: "#FEE500" }}
        >
          {isMulti ? "🔮" : hasMemo ? "✏️" : "🧠"}
        </div>
      </div>

      <h2 className="text-xl font-extrabold text-gray-900 mb-1">
        AI가 분석 중이에요
      </h2>
      <p className="text-gray-500 text-sm mb-3 min-h-5">
        {messages[loadingStep] || messages[messages.length - 1]}
      </p>

      {isMulti && (
        <span
          className="text-xs font-bold px-3 py-1 rounded-full mb-4"
          style={{ background: "rgba(254,229,0,0.2)", color: "#856C00" }}
        >
          ✨ 종합 분석 모드 · {imageCount}장
        </span>
      )}

      {/* 프로그레스 도트 */}
      <div className="flex gap-2 mb-8">
        {messages.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === loadingStep ? 24 : 8,
              height: 8,
              background: i <= loadingStep ? "#FEE500" : "rgba(229,231,235,0.6)",
            }}
          />
        ))}
      </div>

      {/* 단계 리스트 */}
      <div className="w-full space-y-2.5">
        {steps.map((label, i) => (
          <div
            key={label}
            className="glass rounded-2xl p-3.5 flex items-center gap-3"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
              style={{
                background: i < loadingStep ? "#DCFCE7" : "#FFF9C4",
              }}
            >
              {i < loadingStep ? "✅" : icons[i] || "🧠"}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-700">{label}</p>
              <div className="h-1.5 bg-gray-100/60 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width:
                      i < loadingStep
                        ? "100%"
                        : i === loadingStep
                          ? "55%"
                          : "0%",
                    background: "#FEE500",
                  }}
                />
              </div>
            </div>
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${
                i < loadingStep
                  ? "bg-green-400 text-white"
                  : "bg-gray-100/60"
              }`}
            >
              {i < loadingStep ? "✓" : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
