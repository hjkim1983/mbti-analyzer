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

export default function useAnalysis() {
  const [stage, setStage] = useState("main");
  /** free | premium — UI 탭 (API mode와 동일) */
  const [activeTab, setActiveTabState] = useState("free");
  const [images, setImages] = useState([]);
  const [targetName, setTargetName] = useState("");
  const [memo, setMemo] = useState("");
  /** 행동형 태그 (메모 텍스트와 분리) */
  const [selectedTags, setSelectedTags] = useState([]);
  const [relationship, setRelationship] = useState(null);
  const [chatContext, setChatContext] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [freeCount, setFreeCount] = useState(null);
  const [error, setError] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const timerRef = useRef(null);

  const imageCount = images.length;
  /** API로 실제 전송되는 장수(프리미엄은 대표 샘플만) */
  const sentImageCount =
    activeTab === "premium"
      ? Math.min(imageCount, MAX_IMAGES_SENT_PREMIUM)
      : imageCount;
  const maxImages =
    activeTab === "premium" ? MAX_IMAGES_PREMIUM : MAX_IMAGES_FREE;
  const isMulti = imageCount >= 2;
  const hasMemo =
    memo.trim().length > 0 ||
    selectedTags.length > 0 ||
    Boolean(relationship) ||
    Boolean(chatContext);
  const isPremiumTab = activeTab === "premium";

  const canAnalyze = isPremiumTab
    ? imageCount >= 1 && imageCount <= MAX_IMAGES_PREMIUM
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

  /** Free 탭에서는 캡처만 — 메모 비움 */
  useEffect(() => {
    if (!isPremiumTab) {
      setMemo("");
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

  const toggleTag = useCallback((tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
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
          setError(err.message || "분석 중 오류가 발생했어요.");
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

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          targetName: targetName || "미지정",
          memo: mode === ANALYSIS_MODE.FREE ? "" : memo,
          images: base64Images,
          paymentId,
          mode,
          tags: selectedTags,
          relationship: relationship || undefined,
          chatContext: chatContext || undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        if (data.error === "PAYMENT_REQUIRED") {
          setFreeCount(data.freeCount);
          throw new Error("PAYMENT_REQUIRED");
        }
        throw new Error(data.message || "분석에 실패했습니다");
      }

      return data;
    },
    [
      images,
      targetName,
      memo,
      isPremiumTab,
      selectedTags,
      relationship,
      chatContext,
    ],
  );

  const requestAnalysis = useCallback(async () => {
    if (!canAnalyze) return;
    // 로딩 중 중복 요청 방지: 병렬 호출 시 나중에 실패한 요청이 setStage("main")으로 성공 화면을 덮어쓸 수 있음
    if (stage === "loading") return;
    setError(null);

    const mode = isPremiumTab ? ANALYSIS_MODE.PREMIUM : ANALYSIS_MODE.FREE;

    if (mode === ANALYSIS_MODE.PREMIUM) {
      setStage("payment");
      return;
    }

    const used = freeCount?.used ?? 0;
    if (used >= FREE_LIMIT) {
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
          if (err.message === "PAYMENT_REQUIRED") {
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
      setError(err.message);
      setStage("main");
    } finally {
      setIsChecking(false);
    }
  }, [canAnalyze, callAnalyzeApi, startLoading, isPremiumTab, freeCount, stage]);

  const onPaymentComplete = useCallback(
    async (paymentId) => {
      if (!paymentId) return;

      setError(null);
      const apiPromise = callAnalyzeApi(paymentId, ANALYSIS_MODE.PREMIUM);
      startLoading(apiPromise);
    },
    [callAnalyzeApi, startLoading],
  );

  const onPaymentCancel = useCallback(() => {
    setStage("main");
    setError(null);
  }, []);

  /** Free 결과 → 프리미엄 탭으로 (이미지·이름 유지) */
  const switchToPremiumTab = useCallback(() => {
    clearInterval(timerRef.current);
    setStage("main");
    setLoadingStep(0);
    setResult(null);
    setError(null);
    setActiveTabState("premium");
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
    setSelectedTags([]);
    setRelationship(null);
    setChatContext(null);
    setError(null);
    setActiveTabState("free");
  }, [images]);

  /** 분석 API 호출 중(버튼 중복 클릭 방지): 확인 중 또는 로딩 스테이지 */
  const isAnalysisBusy = isChecking || stage === "loading";

  return {
    stage,
    activeTab,
    setActiveTab: handleTabChange,
    images,
    targetName,
    memo,
    selectedTags,
    relationship,
    chatContext,
    setRelationship,
    setChatContext,
    loadingStep,
    result,
    freeCount,
    error,
    isChecking,
    isAnalysisBusy,
    imageCount,
    sentImageCount,
    maxImages,
    isMulti,
    hasMemo,
    canAnalyze,
    isDeepTab: isPremiumTab,

    addImages,
    removeImage,
    setTargetName,
    setMemo,
    toggleTag,
    requestAnalysis,
    onPaymentComplete,
    onPaymentCancel,
    switchToPremiumTab,
    reset,
    setError,
  };
}
