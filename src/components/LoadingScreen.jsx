"use client";

import { useEffect, useRef, useState } from "react";
import {
  getLoadingEstimateMs,
  getLoadingSteps,
} from "@/constants/loading-steps";
import { ANALYSIS_MODE } from "@/lib/analysis-tier";

/**
 * 예상 대기 «남은 구간» 비율(1→거의 0) — 시간이 줄어드는 막대에 사용.
 * 예상 시각이 지나면 얇은 막대 + 미세 호흡으로 «거의 완료» 느낌만 유지.
 */
function useShrinkingRemainFraction(mode) {
  const estimateMs = getLoadingEstimateMs(mode);
  const [remain, setRemain] = useState(1);
  const lastEmitRef = useRef(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;

    const tick = (t) => {
      const elapsed = t - start;
      const linear = 1 - elapsed / estimateMs;
      let r;
      if (linear > 0.12) {
        r = linear;
      } else if (linear > 0) {
        r = Math.max(0.085, linear);
      } else {
        r = 0.085 + 0.038 * Math.sin(t / 620);
      }
      const clamped = Math.min(1, Math.max(0.06, r));

      if (t - lastEmitRef.current >= 90) {
        lastEmitRef.current = t;
        setRemain(clamped);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [estimateMs]);

  return remain;
}

export default function LoadingScreen({
  loadingStep,
  isMulti,
  hasMemo,
  imageCount,
  mode = ANALYSIS_MODE.FREE,
}) {
  const { steps, messages, icons, subtitle } = getLoadingSteps(
    isMulti,
    hasMemo,
    imageCount,
    mode,
  );
  const remainFraction = useShrinkingRemainFraction(mode);
  const barPct = Math.round(remainFraction * 1000) / 10;

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

      <h2 className="text-xl font-extrabold text-gray-900 mb-1 flex items-center justify-center gap-2 flex-wrap">
        <span className="anim-hourglass-rock text-[1.35rem] leading-none" aria-hidden>
          ⏳
        </span>
        <span>AI가 분석 중이에요</span>
      </h2>
      <p className="text-gray-500 text-sm mb-1 min-h-5">
        {messages[loadingStep] || messages[messages.length - 1]}
      </p>
      {subtitle ? (
        <p className="text-xs text-gray-400 mb-2">{subtitle}</p>
      ) : (
        <div className="mb-2" />
      )}

      {/* 예상 대기 구간이 줄어드는 막대 (실제 API 진행과 무관, 체감용) */}
      <div className="w-full max-w-[min(100%,320px)] px-1 mx-auto mb-4">
        <p className="text-[11px] text-gray-500 mb-1.5 leading-snug">
          막대가 짧아질수록 예상 대기 구간이 줄어들고 있어요
        </p>
        <div
          className="h-2.5 rounded-full bg-gray-200/90 overflow-hidden border border-white/40 shadow-inner"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(barPct)}
          aria-label="예상 대기 구간 남은 비율"
        >
          <div
            className="h-full rounded-full will-change-[width]"
            style={{
              width: `${barPct}%`,
              background:
                "linear-gradient(90deg, #FEE500 0%, #FFD000 55%, #F5C400 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)",
              transition: "width 95ms linear",
            }}
          />
        </div>
      </div>

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
