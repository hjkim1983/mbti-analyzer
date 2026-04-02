"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import UploadCard from "@/components/UploadCard";
import MemoCard from "@/components/MemoCard";
import AnalyzeButton from "@/components/AnalyzeButton";
import PaymentModal from "@/components/PaymentModal";
import LoadingScreen from "@/components/LoadingScreen";
import ResultScreen from "@/components/ResultScreen";
import AnalysisTabs from "@/components/ui/Tabs";
import useAnalysis from "@/hooks/useAnalysis";
import usePayment from "@/hooks/usePayment";
import { getDeviceId } from "@/lib/device-id";
import {
  FREE_LIMIT,
  ANALYSIS_MODE,
  normalizeAnalysisMode,
} from "@/lib/analysis-tier";

export default function HomeContent() {
  const [isMounted, setIsMounted] = useState(false);
  const analysis = useAnalysis();
  const payment = usePayment();
  const formTopRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const freeRemaining =
    analysis.freeCount != null
      ? Math.max(0, FREE_LIMIT - analysis.freeCount.used)
      : null;

  const handlePaymentConfirm = async () => {
    const deviceId = await getDeviceId();
    const paymentId = await payment.pay(deviceId);
    if (paymentId) {
      analysis.onPaymentComplete(paymentId);
    }
  };

  const normalizeResult = (raw) => {
    if (!raw) return null;
    const result = raw.data ?? raw;
    const analysisMode = normalizeAnalysisMode(
      result.analysisMode || ANALYSIS_MODE.FREE,
    );
    const tier =
      result.tier ||
      (analysisMode === ANALYSIS_MODE.PREMIUM ? "premium" : "free");

    const rankingsRaw = Array.isArray(result.mbtiRankings)
      ? result.mbtiRankings
      : [];
    const mbtiRankings = rankingsRaw
      .filter((x) => x && typeof x.mbtiType === "string")
      .map((x) => ({
        rank: Number(x.rank) || 0,
        mbtiType: String(x.mbtiType).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4) || "XXXX",
        hint: typeof x.hint === "string" ? x.hint : "",
      }))
      .filter((x) => x.mbtiType.length === 4)
      .sort((a, b) => a.rank - b.rank);

    return {
      mbtiType: result.mbtiType || "XXXX",
      emoji: result.emoji || "🤔",
      title: result.title || "",
      color: result.color || "#FEE500",
      confidence: result.confidence ?? 0,
      confidenceLevel: result.confidenceLevel || "LOW",
      tier,
      summary: result.summary || null,
      teaserBullets: Array.isArray(result.teaserBullets)
        ? result.teaserBullets
        : [],
      lockedPreview: result.lockedPreview || null,
      indicators: result.indicators || null,
      highlights: result.highlights || {},
      traits: Array.isArray(result.traits) ? result.traits : [],
      tags: Array.isArray(result.tags) ? result.tags : [],
      conflicts: Array.isArray(result.conflicts)
        ? result.conflicts.map((c) =>
            typeof c === "object"
              ? c.description || c.indicator || JSON.stringify(c)
              : String(c),
          )
        : [],
      profile: result.profile || null,
      mbtiRankings,
      analysisMode,
    };
  };

  const handleGoPremium = useCallback(() => {
    analysis.switchToPremiumTab();
    setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [analysis]);

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-amber-300 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  const normalizedResult = normalizeResult(analysis.result);

  const loadingMode = analysis.isDeepTab
    ? ANALYSIS_MODE.PREMIUM
    : ANALYSIS_MODE.FREE;

  return (
    <div className="min-h-screen">
      <Header freeRemaining={freeRemaining} />

      <main className="max-w-lg mx-auto px-4 pb-24">
        {(analysis.error || payment.error) &&
          (analysis.stage === "main" || analysis.stage === "payment") && (
          <div className="mt-4 glass-highlight rounded-2xl p-3 text-center">
            <p className="text-xs font-bold text-red-600">
              {analysis.error || payment.error}
            </p>
            <button
              onClick={() => {
                analysis.setError(null);
                payment.clearError();
              }}
              className="text-xs text-gray-400 mt-1 underline"
            >
              닫기
            </button>
          </div>
        )}

        {analysis.stage === "main" && (
          <div ref={formTopRef}>
            <HeroSection />

            <AnalysisTabs
              value={analysis.activeTab}
              onChange={analysis.setActiveTab}
              simpleRemaining={freeRemaining}
            />

            <UploadCard
              images={analysis.images}
              targetName={analysis.targetName}
              onAddImages={analysis.addImages}
              onRemoveImage={analysis.removeImage}
              onTargetNameChange={analysis.setTargetName}
              maxImages={analysis.maxImages}
              tierHint={
                analysis.isDeepTab
                  ? "메모는 선택 · 캡처와 함께"
                  : "추가 텍스트 없이 빠르게"
              }
            />

            {analysis.isDeepTab && (
              <MemoCard
                memo={analysis.memo}
                onMemoChange={analysis.setMemo}
                onToggleTag={analysis.toggleTag}
                isDeep
              />
            )}

            <AnalyzeButton
              canAnalyze={analysis.canAnalyze}
              freeCount={analysis.freeCount}
              isMulti={analysis.isMulti}
              hasMemo={analysis.hasMemo}
              imageCount={analysis.images.length}
              onAnalyze={analysis.requestAnalysis}
              isLoading={analysis.isAnalysisBusy}
              isDeepTab={analysis.isDeepTab}
              memoLength={analysis.memo.trim().length}
            />
          </div>
        )}

        <PaymentModal
          isOpen={analysis.stage === "payment"}
          analysisCount={analysis.freeCount?.used ?? FREE_LIMIT}
          onConfirm={handlePaymentConfirm}
          onCancel={analysis.onPaymentCancel}
          isProcessing={payment.isProcessing}
          isDeepTab={analysis.isDeepTab}
        />

        {analysis.stage === "loading" && (
          <LoadingScreen
            loadingStep={analysis.loadingStep}
            isMulti={analysis.isMulti}
            hasMemo={analysis.hasMemo}
            imageCount={analysis.images.length}
            mode={loadingMode}
          />
        )}

        {analysis.stage === "result" && normalizedResult && (
          <ResultScreen
            result={normalizedResult}
            targetName={analysis.targetName}
            memo={analysis.memo}
            isMulti={analysis.isMulti}
            hasMemo={analysis.hasMemo}
            onReset={analysis.reset}
            analysisMode={normalizedResult.analysisMode}
            onGoPremium={handleGoPremium}
          />
        )}
      </main>
    </div>
  );
}
