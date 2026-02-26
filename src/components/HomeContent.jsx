"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import UploadCard from "@/components/UploadCard";
import MemoCard from "@/components/MemoCard";
import AnalyzeButton from "@/components/AnalyzeButton";
import PaymentModal from "@/components/PaymentModal";
import LoadingScreen from "@/components/LoadingScreen";
import ResultScreen from "@/components/ResultScreen";
import useAnalysis from "@/hooks/useAnalysis";
import usePayment from "@/hooks/usePayment";
import { getDeviceId } from "@/lib/device-id";
import { FREE_LIMIT } from "@/lib/analysis-count";

export default function HomeContent() {
  const [isMounted, setIsMounted] = useState(false);
  const analysis = useAnalysis();
  const payment = usePayment();

  // 브라우저 마운트 후에만 렌더링 — 브라우저 확장 프로그램 hydration 간섭 차단
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

  // API 응답 구조 정규화: { success, data: {...}, freeCount } 또는 {...} 직접
  const normalizeResult = (raw) => {
    if (!raw) return null;
    // API 응답 최상위에 data 키가 있으면 꺼냄
    const result = raw.data ?? raw;
    return {
      mbtiType: result.mbtiType || "XXXX",
      emoji: result.emoji || "🤔",
      title: result.title || "",
      color: result.color || "#FEE500",
      confidence: result.confidence ?? 0,
      confidenceLevel: result.confidenceLevel || "LOW",
      indicators: result.indicators || {},
      highlights: result.highlights || {},
      traits: Array.isArray(result.traits) ? result.traits : [],
      tags: Array.isArray(result.tags) ? result.tags : [],
      // conflicts 내부 항목이 객체일 수 있으므로 문자열로 변환
      conflicts: Array.isArray(result.conflicts)
        ? result.conflicts.map((c) =>
            typeof c === "object" ? (c.description || c.indicator || JSON.stringify(c)) : String(c)
          )
        : [],
      profile: result.profile || null,
    };
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-4 border-amber-300 border-t-amber-500 animate-spin"
        />
      </div>
    );
  }

  const normalizedResult = normalizeResult(analysis.result);

  return (
    <div className="min-h-screen">
      <Header freeRemaining={freeRemaining} />

      <main className="max-w-lg mx-auto px-4 pb-24">
        {/* 에러 메시지 */}
        {(analysis.error || payment.error) && analysis.stage === "main" && (
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

        {/* 메인 입력 화면 */}
        {analysis.stage === "main" && (
          <div>
            <HeroSection />

            <UploadCard
              images={analysis.images}
              targetName={analysis.targetName}
              onAddImages={analysis.addImages}
              onRemoveImage={analysis.removeImage}
              onTargetNameChange={analysis.setTargetName}
            />

            <MemoCard
              memo={analysis.memo}
              onMemoChange={analysis.setMemo}
              onToggleTag={analysis.toggleTag}
            />

            <AnalyzeButton
              canAnalyze={analysis.canAnalyze}
              freeCount={analysis.freeCount}
              isMulti={analysis.isMulti}
              hasMemo={analysis.hasMemo}
              imageCount={analysis.images.length}
              onAnalyze={analysis.requestAnalysis}
              isLoading={analysis.isChecking}
            />
          </div>
        )}

        {/* 결제 모달 — stage 무관하게 isOpen prop으로 제어 */}
        <PaymentModal
          isOpen={analysis.stage === "payment"}
          analysisCount={analysis.freeCount?.used ?? FREE_LIMIT}
          onConfirm={handlePaymentConfirm}
          onCancel={analysis.onPaymentCancel}
          isProcessing={payment.isProcessing}
        />

        {/* 로딩 화면 */}
        {analysis.stage === "loading" && (
          <LoadingScreen
            loadingStep={analysis.loadingStep}
            isMulti={analysis.isMulti}
            hasMemo={analysis.hasMemo}
            imageCount={analysis.images.length}
          />
        )}

        {/* 결과 화면 — 정규화된 result 전달 */}
        {analysis.stage === "result" && normalizedResult && (
          <ResultScreen
            result={normalizedResult}
            targetName={analysis.targetName}
            memo={analysis.memo}
            isMulti={analysis.isMulti}
            hasMemo={analysis.hasMemo}
            onReset={analysis.reset}
          />
        )}
      </main>
    </div>
  );
}
