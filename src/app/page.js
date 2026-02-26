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

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const analysis = useAnalysis();
  const payment = usePayment();

  useEffect(() => setMounted(true), []);

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

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

        {/* 메인 화면 */}
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

        {/* 결제 모달 */}
        <PaymentModal
          isOpen={analysis.stage === "payment"}
          analysisCount={analysis.freeCount?.used || FREE_LIMIT}
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

        {/* 결과 화면 */}
        {analysis.stage === "result" && analysis.result && (
          <ResultScreen
            result={analysis.result.data || analysis.result}
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
