"use client";

import UploadCard from "@/components/UploadCard";
import AnalyzeButton from "@/components/AnalyzeButton";
import { MAX_IMAGES_FREE } from "@/lib/analysis-tier";

/**
 * 무료 빠른 추정 — 캡처만 (v5 톤)
 */
export default function FreeInputPanel({
  onBackToTier,
  images,
  targetName,
  onAddImages,
  onRemoveImage,
  onTargetNameChange,
  maxImages,
  requestAnalysis,
  canAnalyze,
  isAnalysisBusy,
  freeCount,
  isMulti,
  imageCount,
  formIncompleteHint,
}) {
  return (
    <div className="relative z-10 pb-28 max-w-lg mx-auto w-full px-1 mbti-warm-fade-in">
      <div className="sticky top-0 z-20 pt-2 pb-3 -mx-1 px-1 bg-gradient-to-b from-[#fffbf0] via-[#fffbf0]/95 to-transparent">
        <div className="mbti-warm-card px-4 py-3">
          <div className="flex justify-between items-center">
            <span
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "var(--mbti-warm-text-body)" }}
            >
              대화 캡처
            </span>
            <span
              className="text-[10px] font-mono"
              style={{ color: "#c4b49a" }}
            >
              1/1
            </span>
          </div>
          <div
            className="h-1 rounded-full mt-2 overflow-hidden"
            style={{ background: "rgba(232,120,10,0.08)" }}
          >
            <div
              className="h-full w-full rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, var(--mbti-warm-accent), var(--mbti-warm-accent-light))",
              }}
            />
          </div>
        </div>
      </div>

      <div className="px-0.5">
        <div
          className="inline-flex items-center gap-2 mb-4 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border"
          style={{
            background: "rgba(232,120,10,0.08)",
            borderColor: "rgba(232,120,10,0.12)",
            color: "var(--mbti-warm-accent)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--mbti-warm-accent)" }}
          />
          Step 01
        </div>
        <h2
          className="text-2xl font-extrabold leading-snug mb-3"
          style={{ color: "var(--mbti-warm-text)" }}
        >
          카카오톡 대화 캡처를
          <br />
          올려주세요
        </h2>
        <p
          className="text-sm mb-5 leading-relaxed"
          style={{ color: "var(--mbti-warm-text-muted)" }}
        >
          무료 빠른 추정은 캡처만으로 진행돼요. 최대 {MAX_IMAGES_FREE}장까지
          올릴 수 있어요.
        </p>
        <UploadCard
          images={images}
          targetName={targetName}
          onAddImages={onAddImages}
          onRemoveImage={onRemoveImage}
          onTargetNameChange={onTargetNameChange}
          maxImages={maxImages}
          tierHint="추가 텍스트·문항 없이 빠르게"
        />
        <AnalyzeButton
          canAnalyze={canAnalyze}
          freeCount={freeCount}
          isMulti={isMulti}
          hasMemo={false}
          imageCount={imageCount}
          onAnalyze={requestAnalysis}
          isLoading={isAnalysisBusy}
          isDeepTab={false}
          memoLength={0}
          relationshipOk
          behaviorOk
          formIncompleteHint={formIncompleteHint}
          freePhotoOnly
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="max-w-lg mx-auto px-4 pb-6 pt-2 pointer-events-auto bg-gradient-to-t from-[#fff7e6] via-[#fff7e6]/95 to-transparent">
          <button
            type="button"
            onClick={onBackToTier}
            className="mbti-warm-card px-4 py-2.5 text-xs font-medium w-full"
            style={{ color: "var(--mbti-warm-text-body)" }}
          >
            ← 분석 방식 다시 선택
          </button>
        </div>
      </div>
    </div>
  );
}
