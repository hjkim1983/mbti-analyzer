"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { fileToBase64 } from "@/lib/image-utils";
import { selectImagesForApi } from "@/lib/analysis-images";
import { getDeviceId } from "@/lib/device-id";
import { getLoadingSteps } from "@/constants/loading-steps";
import { supabase } from "@/lib/supabase";
import {
  FREE_LIMIT,
  MAX_IMAGES_FREE,
  MAX_IMAGES_PREMIUM,
  MAX_IMAGES_SENT_PREMIUM,
  ANALYSIS_MODE,
} from "@/lib/analysis-tier";
import { BEHAVIOR_QUESTIONS } from "@/constants/behavior-questions";
import {
  isDevModeClient,
  summarizeAnalyzeBodyForLog,
} from "@/lib/dev-mode";
import { composePremiumObserverMemo } from "@/lib/premium-memo-compose";

/** Promise 거부값이 Event 등 비-Error 일 때 [object Event] 방지 */
function rejectReasonToMessage(err, fallback) {
  if (typeof err === "string" && err.trim()) return err;
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && typeof err.message === "string" && err.message)
    return err.message;
  return fallback;
}

export default function useAnalysis() {
  const [stage, setStage] = useState("main");
  /** pickTier: 무료/유료 카드 선택 전 · input: 캡처 입력 플로우 */
  const [flowPhase, setFlowPhase] = useState("pickTier");
  /** free | premium — UI 탭 (API mode와 동일) */
  const [activeTab, setActiveTabState] = useState("free");
  const [images, setImages] = useState([]);
  const [targetName, setTargetName] = useState("");
  const [memo, setMemo] = useState("");
  const [observerTraitIds, setObserverTraitIds] = useState([]);
  const [relationship, setRelationship] = useState(null);
  /** { q1: "A"|"B"|"skip", ... } */
  const [behaviorAnswers, setBehaviorAnswers] = useState({});
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [freeCount, setFreeCount] = useState(null);
  const [error, setError] = useState(null);
  /** DEV_MODE: 서버가 내려준 Gemini/분석 오류 상세(JSON 표시용) */
  const [geminiErrorDetail, setGeminiErrorDetail] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const timerRef = useRef(null);

  const imageCount = images.length;
  const maxImages =
    activeTab === "premium" ? MAX_IMAGES_PREMIUM : MAX_IMAGES_FREE;
  const isMulti = imageCount >= 2;
  const hasMemo =
    observerTraitIds.length > 0 || memo.trim().length > 0;
  const isPremiumTab = activeTab === "premium";

  const answeredCount = Object.keys(behaviorAnswers).length;
  const allBehaviorAnswered = answeredCount === BEHAVIOR_QUESTIONS.length;

  const canAnalyze = isPremiumTab
    ? imageCount >= 1 &&
      imageCount <= MAX_IMAGES_PREMIUM &&
      relationship !== null &&
      allBehaviorAnswered
    : imageCount >= 1 && imageCount <= MAX_IMAGES_FREE;

  useEffect(() => {
    (async () => {
      try {
        const deviceId = await getDeviceId();
        const { data, error } = await supabase
          .from("profiles")
          .select("analysis_count")
          .eq("device_id", deviceId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const used = Math.max(
            0,
            Math.floor(Number(data.analysis_count) || 0),
          );
          setFreeCount({
            used,
            remaining: Math.max(0, FREE_LIMIT - used),
          });
        } else {
          setFreeCount({ used: 0, remaining: FREE_LIMIT });
        }
      } catch {
        /* 네트워크 오류 시 분석 API에서 재조회 */
      }
    })();
  }, []);

  /** Free 탭에서는 캡처만 — 메모·관찰 특징 비움 */
  useEffect(() => {
    if (!isPremiumTab) {
      setMemo("");
      setObserverTraitIds([]);
    }
  }, [isPremiumTab]);

  const addImages = useCallback(
    (files) => {
      const cap =
        activeTab === "premium" ? MAX_IMAGES_PREMIUM : MAX_IMAGES_FREE;
      const newImgs = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, cap - images.length)
        .map((f) => ({
          file: f,
          preview: URL.createObjectURL(f),
        }));
      setImages((prev) => [...prev, ...newImgs]);
    },
    [images.length, activeTab],
  );

  const removeImage = useCallback((idx) => {
    setImages((prev) => {
      const removed = prev[idx];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  /** 탭 전환 시 장 수 상한·메모 정리 */
  const handleTabChange = useCallback((tabId) => {
    setActiveTabState(tabId);
    if (tabId === "free") {
      setMemo("");
      setObserverTraitIds([]);
      setImages((prev) => {
        if (prev.length <= MAX_IMAGES_FREE) return prev;
        const kept = prev.slice(0, MAX_IMAGES_FREE);
        prev.slice(MAX_IMAGES_FREE).forEach((img) => {
          if (img?.preview) URL.revokeObjectURL(img.preview);
        });
        return kept;
      });
    }
  }, []);

  /** 티어 카드에서 선택 후 입력 단계로 */
  const enterInputFlow = useCallback((tabId) => {
    handleTabChange(tabId);
    setFlowPhase("input");
  }, [handleTabChange]);

  /** 티어 선택 화면으로 — 폼 초기화 */
  const backToTierPick = useCallback(() => {
    setError(null);
    setGeminiErrorDetail(null);
    images.forEach((img) => {
      if (img?.preview) URL.revokeObjectURL(img.preview);
    });
    setImages([]);
    setTargetName("");
    setMemo("");
    setObserverTraitIds([]);
    setRelationship(null);
    setBehaviorAnswers({});
    setActiveTabState("free");
    setFlowPhase("pickTier");
  }, [images]);

  const toggleObserverTrait = useCallback((traitId) => {
    setObserverTraitIds((prev) =>
      prev.includes(traitId)
        ? prev.filter((id) => id !== traitId)
        : [...prev, traitId],
    );
  }, []);

  const setBehaviorAnswer = useCallback((questionId, choice) => {
    setBehaviorAnswers((prev) => ({ ...prev, [questionId]: choice }));
  }, []);

  const startLoading = useCallback(
    (apiPromise) => {
      setStage("loading");
      setLoadingStep(0);

      const mode = isPremiumTab ? ANALYSIS_MODE.PREMIUM : ANALYSIS_MODE.FREE;
      const { messages } = getLoadingSteps(isMulti, hasMemo, imageCount, mode);

      let step = 0;
      /** 3단계 로딩 — 긴 간격은 체감 대기만 늘림 */
      const intervalMs = 700;

      timerRef.current = setInterval(() => {
        step++;
        if (step < messages.length) {
          setLoadingStep(step);
        }
      }, intervalMs);

      apiPromise
        .then((data) => {
          clearInterval(timerRef.current);

          if (!data) return;

          setLoadingStep(messages.length);

          setTimeout(() => {
            setResult(data);
            if (data.freeCount) setFreeCount(data.freeCount);
            setStage("result");
          }, 220);
        })
        .catch((err) => {
          clearInterval(timerRef.current);
          setError(
            rejectReasonToMessage(err, "분석 중 오류가 발생했어요."),
          );
          setStage("main");
        });
    },
    [isMulti, hasMemo, imageCount, isPremiumTab],
  );

  const callAnalyzeApi = useCallback(
    async (paymentId, modeOverride) => {
      const deviceId = await getDeviceId();
      const mode =
        modeOverride ||
        (isPremiumTab ? ANALYSIS_MODE.PREMIUM : ANALYSIS_MODE.FREE);

      const imageTier =
        mode === ANALYSIS_MODE.PREMIUM ? "premium" : "free";
      const toEncode =
        mode === ANALYSIS_MODE.PREMIUM
          ? selectImagesForApi(images, MAX_IMAGES_SENT_PREMIUM)
          : images;
      const total = toEncode.length;
      const base64Images = await Promise.all(
        toEncode.map(async (img) => {
          const converted = await fileToBase64(img.file, total, undefined, {
            tier: imageTier,
          });
          return {
            base64Data: converted.base64Data,
            mimeType: converted.mimeType,
          };
        }),
      );

      const payload = {
        deviceId,
        targetName: targetName || "미지정",
        memo:
          mode === ANALYSIS_MODE.FREE
            ? ""
            : composePremiumObserverMemo(observerTraitIds, memo),
        images: base64Images,
        paymentId,
        mode,
        ...(mode === ANALYSIS_MODE.FREE
          ? {}
          : {
              relationship: relationship || undefined,
              behaviorAnswers,
            }),
      };

      if (isDevModeClient()) {
        console.log(
          "[DEV_MODE] /api/analyze 요청(클라이언트)",
          JSON.stringify(summarizeAnalyzeBodyForLog(payload), null, 2),
        );
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (isDevModeClient()) {
        console.log(
          "[DEV_MODE] /api/analyze 응답(클라이언트)",
          JSON.stringify(data, null, 2),
        );
      }

      if (!data.success) {
        if (isDevModeClient() && data.devGeminiError) {
          setGeminiErrorDetail(data.devGeminiError);
        } else {
          setGeminiErrorDetail(null);
        }
        if (data.error === "PAYMENT_REQUIRED") {
          setFreeCount(data.freeCount);
          throw new Error("PAYMENT_REQUIRED");
        }
        throw new Error(data.message || "분석에 실패했습니다");
      }

      setGeminiErrorDetail(null);
      return data;
    },
    [
      images,
      targetName,
      memo,
      observerTraitIds,
      isPremiumTab,
      relationship,
      behaviorAnswers,
    ],
  );

  const requestAnalysis = useCallback(async () => {
    if (!canAnalyze) return;
    // 로딩 중 중복 요청 방지: 병렬 호출 시 나중에 실패한 요청이 setStage("main")으로 성공 화면을 덮어쓸 수 있음
    if (stage === "loading") return;
    setError(null);
    setGeminiErrorDetail(null);

    const mode = isPremiumTab ? ANALYSIS_MODE.PREMIUM : ANALYSIS_MODE.FREE;

    if (mode === ANALYSIS_MODE.PREMIUM) {
      if (isDevModeClient()) {
        setIsChecking(true);
        try {
          startLoading(callAnalyzeApi(null, ANALYSIS_MODE.PREMIUM));
        } catch (err) {
          setError(rejectReasonToMessage(err, "분석 요청을 시작할 수 없습니다."));
          setStage("main");
        } finally {
          setIsChecking(false);
        }
        return;
      }
      setStage("payment");
      return;
    }

    const used = freeCount?.used ?? 0;
    if (used >= FREE_LIMIT) {
      if (isDevModeClient()) {
        setIsChecking(true);
        try {
          startLoading(
            callAnalyzeApi(null, ANALYSIS_MODE.FREE).catch((err) => {
              if (
                err instanceof Error &&
                err.message === "PAYMENT_REQUIRED"
              ) {
                clearInterval(timerRef.current);
                setActiveTabState("premium");
                setStage("payment");
                setError(
                  "무료 횟수가 부족해요. 프리미엄 탭에서 결제 후 진행해 주세요.",
                );
                return null;
              }
              throw err;
            }),
          );
        } catch (err) {
          setError(rejectReasonToMessage(err, "분석 요청을 시작할 수 없습니다."));
          setStage("main");
        } finally {
          setIsChecking(false);
        }
        return;
      }
      setError(
        "무료 빠른 추정 3회를 모두 사용했어요. 프리미엄 리포트를 위해 결제를 진행해 주세요.",
      );
      setActiveTabState("premium");
      setStage("payment");
      return;
    }

    setIsChecking(true);

    try {
      const apiPromise = callAnalyzeApi(null, ANALYSIS_MODE.FREE);

      startLoading(
        apiPromise.catch((err) => {
          if (
            err instanceof Error &&
            err.message === "PAYMENT_REQUIRED"
          ) {
            clearInterval(timerRef.current);
            setActiveTabState("premium");
            setStage("payment");
            setError(
              "무료 횟수가 부족해요. 프리미엄 탭에서 결제 후 진행해 주세요.",
            );
            return null;
          }
          throw err;
        }),
      );
    } catch (err) {
      setError(rejectReasonToMessage(err, "분석 요청을 시작할 수 없습니다."));
      setStage("main");
    } finally {
      setIsChecking(false);
    }
  }, [canAnalyze, callAnalyzeApi, startLoading, isPremiumTab, freeCount, stage]);

  const onPaymentComplete = useCallback(
    async (paymentId) => {
      if (!paymentId) return;

      setError(null);
      setGeminiErrorDetail(null);
      const apiPromise = callAnalyzeApi(paymentId, ANALYSIS_MODE.PREMIUM);
      startLoading(apiPromise);
    },
    [callAnalyzeApi, startLoading],
  );

  const onPaymentCancel = useCallback(() => {
    setStage("main");
    setError(null);
    setGeminiErrorDetail(null);
  }, []);

  /** Free 결과 → 프리미엄 탭으로 (이미지·이름 유지) */
  const switchToPremiumTab = useCallback(() => {
    clearInterval(timerRef.current);
    setStage("main");
    setLoadingStep(0);
    setResult(null);
    setError(null);
    setGeminiErrorDetail(null);
    setActiveTabState("premium");
    setFlowPhase("input");
  }, []);

  const reset = useCallback(() => {
    clearInterval(timerRef.current);
    setStage("main");
    setLoadingStep(0);
    setResult(null);
    images.forEach((img) => {
      if (img.preview) URL.revokeObjectURL(img.preview);
    });
    setImages([]);
    setTargetName("");
    setMemo("");
    setObserverTraitIds([]);
    setRelationship(null);
    setBehaviorAnswers({});
    setError(null);
    setGeminiErrorDetail(null);
    setActiveTabState("free");
    setFlowPhase("pickTier");
  }, [images]);

  /** 분석 API 호출 중(버튼 중복 클릭 방지): 확인 중 또는 로딩 스테이지 */
  const isAnalysisBusy = isChecking || stage === "loading";

  const clearGeminiErrorDetail = useCallback(() => setGeminiErrorDetail(null), []);

  return {
    stage,
    flowPhase,
    enterInputFlow,
    backToTierPick,
    activeTab,
    setActiveTab: handleTabChange,
    images,
    targetName,
    memo,
    observerTraitIds,
    toggleObserverTrait,
    relationship,
    behaviorAnswers,
    answeredCount,
    allBehaviorAnswered,
    setRelationship,
    loadingStep,
    result,
    freeCount,
    error,
    geminiErrorDetail,
    isChecking,
    isAnalysisBusy,
    imageCount,
    maxImages,
    isMulti,
    hasMemo,
    canAnalyze,
    isDeepTab: isPremiumTab,

    addImages,
    removeImage,
    setTargetName,
    setMemo,
    setBehaviorAnswer,
    requestAnalysis,
    onPaymentComplete,
    onPaymentCancel,
    switchToPremiumTab,
    reset,
    setError,
    clearGeminiErrorDetail,
  };
}
