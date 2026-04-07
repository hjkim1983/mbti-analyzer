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
  MAX_IMAGES_SENT_PREMIUM,
  ANALYSIS_MODE,
  normalizeAnalysisMode,
} from "@/lib/analysis-tier";
import { softenOverallConfidenceForDisplay } from "@/lib/result-confidence";
import { sanitizeAlternativeTypes } from "@/lib/alternative-types-sanitize";

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

    const rawConf = Number(result.confidence);
    const confidence = Number.isFinite(rawConf) ? Math.round(rawConf) : 0;

    return {
      mbtiType: result.mbtiType || "XXXX",
      emoji: result.emoji || "🤔",
      title: result.title || "",
      color: result.color || "#FEE500",
      confidence,
      confidenceDisplay: softenOverallConfidenceForDisplay(confidence),
      confidenceLevel: result.confidenceLevel || "LOW",
      confidenceReason:
        typeof result.confidenceReason === "string"
          ? result.confidenceReason
          : "",
      oneLineConclusion:
        typeof result.oneLineConclusion === "string"
          ? result.oneLineConclusion
          : "",
      keyEvidenceSummary: Array.isArray(result.keyEvidenceSummary)
        ? result.keyEvidenceSummary
            .filter((x) => x && typeof x === "object")
            .map((x) => ({
              snippet: typeof x.snippet === "string" ? x.snippet : "",
              axis:
                typeof x.axis === "string"
                  ? x.axis.replace(/[^A-Z]/gi, "").slice(0, 2).toUpperCase()
                  : "",
              insight: typeof x.insight === "string" ? x.insight : "",
            }))
            .filter((x) => x.snippet || x.insight)
        : [],
      tier,
      summary: result.summary || null,
      teaserBullets: Array.isArray(result.teaserBullets)
        ? result.teaserBullets
        : [],
      evidenceBullets: Array.isArray(result.evidenceBullets)
        ? result.evidenceBullets.map((x) =>
            typeof x === "object" && x !== null
              ? {
                  snippet:
                    typeof x.snippet === "string" ? x.snippet : String(x),
                  insight:
                    typeof x.insight === "string" ? x.insight : "",
                }
              : { snippet: String(x), insight: "" },
          )
        : [],
      lockedPreview: result.lockedPreview || null,
      indicators: (() => {
        const ind = result.indicators;
        if (!ind || typeof ind !== "object") return null;
        const keys = ["EI", "SN", "TF", "JP"];
        const out = {};
        for (const k of keys) {
          const v = ind[k];
          if (!v || typeof v !== "object") continue;
          const evidence = Array.isArray(v.evidence)
            ? v.evidence.map((e) => String(e))
            : [];
          out[k] = {
            result: String(v.result || "").slice(0, 1).toUpperCase(),
            score: Math.min(
              100,
              Math.max(0, Math.round(Number(v.score) || 0)),
            ),
            confidence: Math.min(
              100,
              Math.max(0, Math.round(Number(v.confidence) || 0)),
            ),
            evidence,
            interpretation:
              typeof v.interpretation === "string" ? v.interpretation : "",
            boundaryNote:
              typeof v.boundaryNote === "string" ? v.boundaryNote : "",
            strengthLabel:
              typeof v.strengthLabel === "string" ? v.strengthLabel : "",
          };
        }
        return Object.keys(out).length ? out : null;
      })(),
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
      relationshipAndCommunication:
        result.relationshipAndCommunication &&
        typeof result.relationshipAndCommunication === "object"
          ? (() => {
              const r = result.relationshipAndCommunication;
              return {
                summary: typeof r.summary === "string" ? r.summary : "",
                tips: Array.isArray(r.tips) ? r.tips.map(String) : [],
                whenInterested:
                  typeof r.whenInterested === "string" ? r.whenInterested : "",
                whenUncomfortable:
                  typeof r.whenUncomfortable === "string"
                    ? r.whenUncomfortable
                    : "",
                whenClose: typeof r.whenClose === "string" ? r.whenClose : "",
                inConflict:
                  typeof r.inConflict === "string" ? r.inConflict : "",
                replyAndEmoji:
                  typeof r.replyAndEmoji === "string" ? r.replyAndEmoji : "",
                contactPreference:
                  typeof r.contactPreference === "string"
                    ? r.contactPreference
                    : "",
              };
            })()
          : null,
      workAndRoutine:
        result.workAndRoutine && typeof result.workAndRoutine === "object"
          ? {
              summary:
                typeof result.workAndRoutine.summary === "string"
                  ? result.workAndRoutine.summary
                  : "",
              tips: Array.isArray(result.workAndRoutine.tips)
                ? result.workAndRoutine.tips.map(String)
                : [],
            }
          : null,
      cautionAndMisread:
        result.cautionAndMisread &&
        typeof result.cautionAndMisread === "object"
          ? {
              points: Array.isArray(result.cautionAndMisread.points)
                ? result.cautionAndMisread.points.map(String)
                : [],
            }
          : null,
      practicalTips:
        result.practicalTips && typeof result.practicalTips === "object"
          ? {
              effectiveCommunication: Array.isArray(
                result.practicalTips.effectiveCommunication,
              )
                ? result.practicalTips.effectiveCommunication.map(String)
                : [],
              whenHurt: Array.isArray(result.practicalTips.whenHurt)
                ? result.practicalTips.whenHurt.map(String)
                : [],
              conflictAvoid: Array.isArray(result.practicalTips.conflictAvoid)
                ? result.practicalTips.conflictAvoid.map(String)
                : [],
              scheduling: Array.isArray(result.practicalTips.scheduling)
                ? result.practicalTips.scheduling.map(String)
                : [],
              emotionVsDirect:
                typeof result.practicalTips.emotionVsDirect === "string"
                  ? result.practicalTips.emotionVsDirect
                  : "",
            }
          : null,
      analysisLimitations:
        result.analysisLimitations &&
        typeof result.analysisLimitations === "object" &&
        Array.isArray(result.analysisLimitations.points)
          ? { points: result.analysisLimitations.points.map(String) }
          : null,
      alternativeTypes: sanitizeAlternativeTypes(
        result.alternativeTypes,
        result.mbtiType,
      ),
      quotedInsights: Array.isArray(result.quotedInsights)
        ? result.quotedInsights
            .filter((x) => x && typeof x === "object")
            .map((x) => ({
              quote: typeof x.quote === "string" ? x.quote : "",
              note: typeof x.note === "string" ? x.note : "",
            }))
            .filter((x) => x.quote || x.note)
        : [],
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
                  ? `메모 선택 · 분석 전송 최대 ${MAX_IMAGES_SENT_PREMIUM}장(대표 샘플)`
                  : "추가 텍스트 없이 빠르게"
              }
            />

            <MemoCard
              memo={analysis.memo}
              onMemoChange={analysis.setMemo}
              selectedTags={analysis.selectedTags}
              onToggleTag={analysis.toggleTag}
              relationship={analysis.relationship}
              onRelationshipChange={analysis.setRelationship}
              chatContext={analysis.chatContext}
              onChatContextChange={analysis.setChatContext}
              isDeep={analysis.isDeepTab}
            />

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
            sentImageCount={analysis.sentImageCount}
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
