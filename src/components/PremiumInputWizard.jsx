"use client";

import { useState, useCallback, useMemo } from "react";
import UploadCard from "@/components/UploadCard";
import MemoCard from "@/components/MemoCard";
import AnalyzeButton from "@/components/AnalyzeButton";
import { RELATIONSHIP_OPTIONS } from "@/constants/mbti-data";
import { BEHAVIOR_QUESTIONS } from "@/constants/behavior-questions";
import { MAX_IMAGES_SENT_PREMIUM } from "@/lib/analysis-tier";

const REL_GRID_ICONS = {
  friend: "👫",
  some: "💘",
  lover: "💑",
  coworker: "💼",
  family: "🏠",
  crush: "🥺",
  acquaintance: "🤝",
  other: "✨",
};

/**
 * 프리미엄 입력 — 업로드 → 관계 → 문항 1개씩 → 메모·분석 (v5 스타일)
 */
export default function PremiumInputWizard({
  onBackToTier,
  images,
  targetName,
  memo,
  relationship,
  behaviorAnswers,
  onAddImages,
  onRemoveImage,
  onTargetNameChange,
  onMemoChange,
  onRelationshipChange,
  onBehaviorAnswer,
  maxImages,
  requestAnalysis,
  canAnalyze,
  isAnalysisBusy,
  freeCount,
  isMulti,
  hasMemo,
  imageCount,
  allBehaviorAnswered,
  formIncompleteHint,
}) {
  const [step, setStep] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);

  const nQ = BEHAVIOR_QUESTIONS.length;
  /** 0 업로드, 1 관계, 2..(1+nQ) 문항, 마지막 메모 */
  const totalSteps = 2 + nQ + 1;
  const lastStep = totalSteps - 1;

  const goTo = useCallback((n) => {
    setFadeKey((k) => k + 1);
    setStep(n);
  }, []);

  const questionIndex = step >= 2 && step <= 1 + nQ ? step - 2 : -1;
  const currentQuestion =
    questionIndex >= 0 ? BEHAVIOR_QUESTIONS[questionIndex] : null;

  const progress = useMemo(
    () => ((step + 1) / totalSteps) * 100,
    [step, totalSteps],
  );

  const canGoNext = useCallback(() => {
    if (step === 0) return imageCount >= 1;
    if (step === 1) return relationship !== null;
    if (questionIndex >= 0 && currentQuestion) {
      return behaviorAnswers[currentQuestion.id] !== undefined;
    }
    return true;
  }, [
    step,
    imageCount,
    relationship,
    questionIndex,
    currentQuestion,
    behaviorAnswers,
  ]);

  const goNext = () => {
    if (canGoNext() && step < lastStep) goTo(step + 1);
  };

  const isQuestionStep = step >= 2 && step <= 1 + nQ;

  const goPrev = () => {
    if (step > 0) goTo(step - 1);
  };

  const stepLabel =
    step === 0
      ? "대화 캡처"
      : step === 1
        ? "관계 설정"
        : questionIndex >= 0
          ? `질문 ${questionIndex + 1}/${nQ}`
          : "추가 메모";

  const handleAnswer = (qId, choice) => {
    onBehaviorAnswer(qId, choice);
    setTimeout(() => {
      if (step < lastStep) goTo(step + 1);
    }, 380);
  };

  const accent = "var(--mbti-warm-accent)";
  const accentLight = "var(--mbti-warm-accent-light)";

  return (
    <div className="relative z-10 pb-28 max-w-lg mx-auto w-full px-1">
      <div className="sticky top-0 z-20 pt-2 pb-3 -mx-1 px-1 bg-gradient-to-b from-[#fffbf0] via-[#fffbf0]/95 to-transparent">
        <div className="mbti-warm-card px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: accent,
                  boxShadow: `0 0 8px ${accentLight}`,
                }}
              />
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--mbti-warm-text-body)" }}
              >
                {stepLabel}
              </span>
            </div>
            <span
              className="text-[10px] font-mono tabular-nums"
              style={{ color: "#c4b49a" }}
            >
              {step + 1}/{totalSteps}
            </span>
          </div>
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ background: "rgba(232,120,10,0.08)" }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${accent}, ${accentLight})`,
              }}
            />
          </div>
        </div>
      </div>

      <div key={fadeKey} className="mbti-warm-fade-in px-0.5">
        {step === 0 && (
          <div>
            <StepBadge num="01" />
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
              분석할 상대방과의 대화 스크린샷이에요.
              <br />
              많을수록 정확도가 올라가요 (최대 {maxImages}장).
            </p>
            <UploadCard
              images={images}
              targetName={targetName}
              onAddImages={onAddImages}
              onRemoveImage={onRemoveImage}
              onTargetNameChange={onTargetNameChange}
              maxImages={maxImages}
              tierHint={`분석 전송 최대 ${MAX_IMAGES_SENT_PREMIUM}장(대표 샘플)`}
            />
          </div>
        )}

        {step === 1 && (
          <div>
            <StepBadge num="02" />
            <h2
              className="text-2xl font-extrabold leading-snug mb-3"
              style={{ color: "var(--mbti-warm-text)" }}
            >
              이 사람과
              <br />
              어떤 관계인가요?
            </h2>
            <p
              className="text-sm mb-6 leading-relaxed"
              style={{ color: "var(--mbti-warm-text-muted)" }}
            >
              관계에 따라 분석 기준이 달라져요
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {RELATIONSHIP_OPTIONS.map((opt) => {
                const active = relationship === opt.value;
                const icon = REL_GRID_ICONS[opt.value] || "✨";
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onRelationshipChange(opt.value);
                      setTimeout(() => goTo(2), 350);
                    }}
                    className="mbti-warm-card p-4 text-center text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
                    style={{
                      borderWidth: active ? "1.5px" : "1px",
                      borderColor: active
                        ? "rgba(232,120,10,0.35)"
                        : "var(--mbti-warm-border)",
                      background: active
                        ? "rgba(255,255,255,0.95)"
                        : "var(--mbti-warm-card)",
                      color: active
                        ? "var(--mbti-warm-text)"
                        : "var(--mbti-warm-text-body)",
                      transform: active ? "scale(1.02)" : "scale(1)",
                      boxShadow: active
                        ? "0 4px 20px rgba(232,120,10,0.12)"
                        : undefined,
                    }}
                  >
                    <span className="text-2xl block mb-2">{icon}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isQuestionStep && questionIndex >= 0 && currentQuestion && (
          <div>
            <div className="flex justify-between items-center mb-7">
              <span
                className="mbti-warm-card text-xs font-bold px-3.5 py-1.5 rounded-full"
                style={{ color: "var(--mbti-warm-text-body)" }}
              >
                Q{questionIndex + 1} / {nQ}
              </span>
              <div className="flex gap-1">
                {BEHAVIOR_QUESTIONS.map((q, i) => {
                  const done = behaviorAnswers[q.id] !== undefined;
                  const here = i === questionIndex;
                  return (
                    <div
                      key={q.id}
                      className="h-1.5 rounded transition-all duration-300"
                      style={{
                        width: here ? 20 : 7,
                        background: done
                          ? here
                            ? accent
                            : accentLight
                          : here
                            ? accent
                            : "rgba(232,120,10,0.12)",
                      }}
                    />
                  );
                })}
              </div>
            </div>
            <h2
              className="text-xl font-bold mb-8 leading-snug min-h-[4rem]"
              style={{ color: "var(--mbti-warm-text)" }}
            >
              {currentQuestion.question}
            </h2>
            <div className="flex flex-col gap-3">
              {["A", "B"].map((choice) => {
                const text =
                  choice === "A"
                    ? currentQuestion.optionA
                    : currentQuestion.optionB;
                const active =
                  behaviorAnswers[currentQuestion.id] === choice;
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() =>
                      handleAnswer(currentQuestion.id, choice)
                    }
                    className="mbti-warm-card text-left p-5 flex gap-3.5 items-start transition-all duration-200"
                    style={{
                      borderWidth: active ? "1.5px" : "1px",
                      borderColor: active
                        ? "rgba(232,120,10,0.35)"
                        : "var(--mbti-warm-border)",
                      fontWeight: active ? 600 : 400,
                      color: active
                        ? "var(--mbti-warm-text)"
                        : "var(--mbti-warm-text-body)",
                    }}
                  >
                    <span
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        border: active
                          ? `2.5px solid ${accent}`
                          : "2px solid #c4b49a",
                        background: active ? accent : "transparent",
                        color: active ? "#fff" : "var(--mbti-warm-text-muted)",
                      }}
                    >
                      {choice}
                    </span>
                    <span className="text-sm leading-relaxed pt-1">{text}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  handleAnswer(currentQuestion.id, "skip")
                }
                className="py-2.5 text-sm font-medium bg-transparent border-0 cursor-pointer"
                style={{
                  color:
                    behaviorAnswers[currentQuestion.id] === "skip"
                      ? accent
                      : "var(--mbti-warm-text-muted)",
                }}
              >
                잘 모르겠어요 →
              </button>
            </div>
          </div>
        )}

        {step === lastStep && (
          <div>
            <StepBadge num="✦" />
            <h2
              className="text-2xl font-extrabold leading-snug mb-3"
              style={{ color: "var(--mbti-warm-text)" }}
            >
              더 알려주고 싶은 게
              <br />
              있나요?
            </h2>
            <p
              className="text-sm mb-5 leading-relaxed"
              style={{ color: "var(--mbti-warm-text-muted)" }}
            >
              선택사항이에요. 비워두고 바로 분석해도 돼요.
            </p>
            <MemoCard
              memo={memo}
              onMemoChange={onMemoChange}
              isDeep
            />
            <div
              className="mbti-warm-card mt-6 p-4 text-sm leading-8"
              style={{ color: "var(--mbti-warm-text-body)" }}
            >
              <div
                className="font-bold text-xs mb-2 tracking-wide"
                style={{ color: "var(--mbti-warm-text)" }}
              >
                입력 요약
              </div>
              <div>📸 사진 {imageCount}장</div>
              <div>
                👥{" "}
                {RELATIONSHIP_OPTIONS.find((r) => r.value === relationship)
                  ?.label || "—"}
              </div>
              <div>
                ✅{" "}
                {Object.keys(behaviorAnswers).length}/{nQ} 문항
              </div>
              {memo.trim() ? <div>📝 메모 있음</div> : null}
            </div>
            <AnalyzeButton
              canAnalyze={canAnalyze}
              freeCount={freeCount}
              isMulti={isMulti}
              hasMemo={hasMemo}
              imageCount={imageCount}
              onAnalyze={requestAnalysis}
              isLoading={isAnalysisBusy}
              isDeepTab
              memoLength={memo.trim().length}
              relationshipOk={Boolean(relationship)}
              behaviorOk={allBehaviorAnswered}
              formIncompleteHint={formIncompleteHint}
            />
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="max-w-lg mx-auto px-4 pb-6 pt-2 pointer-events-auto bg-gradient-to-t from-[#fff7e6] via-[#fff7e6]/95 to-transparent">
          <div className="flex justify-between items-center gap-2">
            <button
              type="button"
              onClick={step === 0 ? onBackToTier : goPrev}
              className="mbti-warm-card px-4 py-2.5 text-xs font-medium shrink-0"
              style={{
                color:
                  step === 0
                    ? "var(--mbti-warm-text-muted)"
                    : "var(--mbti-warm-text-body)",
              }}
            >
              ← {step === 0 ? "처음으로" : "이전"}
            </button>
            <div className="flex gap-1.5 items-center">
              {[0, 1, 2, 3].map((gi) => {
                const inUpload = gi === 0 && step === 0;
                const inRel = gi === 1 && step === 1;
                const inQ = gi === 2 && isQuestionStep;
                const inMemo = gi === 3 && step === lastStep;
                const active = inUpload || inRel || inQ || inMemo;
                const past =
                  (gi === 0 && step > 0) ||
                  (gi === 1 && step > 1) ||
                  (gi === 2 && step > 1 + nQ) ||
                  (gi === 3 && false);
                return (
                  <div
                    key={gi}
                    className="h-2 rounded transition-all duration-300"
                    style={{
                      width: active ? 24 : 8,
                      background: active
                        ? `linear-gradient(90deg, ${accent}, ${accentLight})`
                        : past
                          ? accentLight
                          : "rgba(232,120,10,0.12)",
                      boxShadow: active
                        ? "0 0 10px rgba(232,120,10,0.25)"
                        : "none",
                    }}
                  />
                );
              })}
            </div>
            {step < lastStep ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext()}
                className="mbti-warm-card px-4 py-2.5 text-xs font-semibold shrink-0 transition-all"
                style={{
                  color: canGoNext()
                    ? accent
                    : "var(--mbti-warm-text-muted)",
                  opacity: canGoNext() ? 1 : 0.6,
                }}
              >
                다음 →
              </button>
            ) : (
              <div className="w-[4.5rem] shrink-0" aria-hidden />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepBadge({ num }) {
  return (
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
      Step {num}
    </div>
  );
}
