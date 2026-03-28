"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { fileToBase64 } from "@/lib/image-utils";
import { getDeviceId } from "@/lib/device-id";
import { getLoadingSteps } from "@/constants/loading-steps";
import { supabase } from "@/lib/supabase";
import {
  FREE_LIMIT,
  MAX_IMAGES_SIMPLE,
  MAX_IMAGES_DEEP,
  MEMO_MIN_DEEP,
  ANALYSIS_MODE,
} from "@/lib/analysis-tier";

export default function useAnalysis() {
  const [stage, setStage] = useState("main");
  /** simple | deep — UI 탭 (API mode와 동일) */
  const [activeTab, setActiveTab] = useState("simple");
  const [images, setImages] = useState([]);
  const [targetName, setTargetName] = useState("");
  const [memo, setMemo] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [freeCount, setFreeCount] = useState(null);
  const [error, setError] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const timerRef = useRef(null);

  const imageCount = images.length;
  const maxImages = activeTab === "deep" ? MAX_IMAGES_DEEP : MAX_IMAGES_SIMPLE;
  const isMulti = imageCount >= 2;
  const hasMemo = memo.trim().length > 0;
  const isDeepTab = activeTab === "deep";

  const canAnalyze = isDeepTab
    ? imageCount >= 1 && memo.trim().length >= MEMO_MIN_DEEP
    : imageCount >= 1 && imageCount <= MAX_IMAGES_SIMPLE;

  useEffect(() => {
    (async () => {
      try {
        const deviceId = await getDeviceId();
        const { data } = await supabase
          .from("profiles")
          .select("analysis_count")
          .eq("device_id", deviceId)
          .maybeSingle();

        if (data) {
          setFreeCount({
            used: data.analysis_count,
            remaining: Math.max(0, FREE_LIMIT - data.analysis_count),
          });
        }
      } catch {
        // 첫 사용자
      }
    })();
  }, []);

  /** 간단 탭에서는 추가 텍스트 비사용 */
  useEffect(() => {
    if (!isDeepTab) {
      setMemo("");
    }
  }, [isDeepTab]);

  const addImages = useCallback(
    (files) => {
      const cap = activeTab === "deep" ? MAX_IMAGES_DEEP : MAX_IMAGES_SIMPLE;
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

  /** 탭 전환 시 장 수 상한 맞추기 */
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    if (tabId === "simple") {
      setImages((prev) => {
        if (prev.length <= MAX_IMAGES_SIMPLE) return prev;
        const kept = prev.slice(0, MAX_IMAGES_SIMPLE);
        prev.slice(MAX_IMAGES_SIMPLE).forEach((img) => {
          if (img?.preview) URL.revokeObjectURL(img.preview);
        });
        return kept;
      });
    }
  }, []);

  const toggleTag = useCallback((tag) => {
    setMemo((prev) => {
      const lines = prev.split("\n").filter(Boolean);
      if (lines.includes(tag))
        return lines.filter((l) => l !== tag).join("\n");
      return [...lines, tag].join("\n");
    });
  }, []);

  const startLoading = useCallback(
    (apiPromise) => {
      setStage("loading");
      setLoadingStep(0);

      const mode = isDeepTab ? ANALYSIS_MODE.DEEP : ANALYSIS_MODE.SIMPLE;
      const { messages } = getLoadingSteps(isMulti, hasMemo, imageCount, mode);

      let step = 0;
      const intervalMs = isMulti
        ? Math.max(900, imageCount * 600)
        : isDeepTab
          ? 1000
          : 900;

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
          }, 600);
        })
        .catch((err) => {
          clearInterval(timerRef.current);
          setError(err.message || "분석 중 오류가 발생했어요.");
          setStage("main");
        });
    },
    [isMulti, hasMemo, imageCount, isDeepTab],
  );

  const callAnalyzeApi = useCallback(
    async (paymentId, modeOverride) => {
      const deviceId = await getDeviceId();
      const mode =
        modeOverride ||
        (isDeepTab ? ANALYSIS_MODE.DEEP : ANALYSIS_MODE.SIMPLE);

      const total = images.length;
      const base64Images = await Promise.all(
        images.map(async (img) => {
          const converted = await fileToBase64(img.file, total);
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
          memo: mode === ANALYSIS_MODE.SIMPLE ? "" : memo,
          images: base64Images,
          paymentId,
          mode,
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
    [images, targetName, memo, isDeepTab],
  );

  const requestAnalysis = useCallback(async () => {
    if (!canAnalyze) return;
    setError(null);

    const mode = isDeepTab ? ANALYSIS_MODE.DEEP : ANALYSIS_MODE.SIMPLE;

    if (mode === ANALYSIS_MODE.DEEP) {
      setStage("payment");
      return;
    }

    const used = freeCount?.used ?? 0;
    if (used >= FREE_LIMIT) {
      setStage("payment");
      return;
    }

    setIsChecking(true);

    try {
      const apiPromise = callAnalyzeApi(null, ANALYSIS_MODE.SIMPLE);

      startLoading(
        apiPromise.catch((err) => {
          if (err.message === "PAYMENT_REQUIRED") {
            clearInterval(timerRef.current);
            setStage("payment");
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
  }, [canAnalyze, callAnalyzeApi, startLoading, isDeepTab, freeCount]);

  const onPaymentComplete = useCallback(
    async (paymentId) => {
      if (!paymentId) return;

      setError(null);
      const mode = isDeepTab ? ANALYSIS_MODE.DEEP : ANALYSIS_MODE.SIMPLE;
      const apiPromise = callAnalyzeApi(paymentId, mode);
      startLoading(apiPromise);
    },
    [callAnalyzeApi, startLoading, isDeepTab],
  );

  const onPaymentCancel = useCallback(() => {
    setStage("main");
    setError(null);
  }, []);

  /** 간단 결과 → 심층 탭으로 (이미지·이름 유지) */
  const switchToDeepTab = useCallback(() => {
    clearInterval(timerRef.current);
    setStage("main");
    setLoadingStep(0);
    setResult(null);
    setError(null);
    setMemo("");
    setActiveTab("deep");
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
    setError(null);
    setActiveTab("simple");
  }, [images]);

  return {
    stage,
    activeTab,
    setActiveTab: handleTabChange,
    images,
    targetName,
    memo,
    loadingStep,
    result,
    freeCount,
    error,
    isChecking,
    imageCount,
    maxImages,
    isMulti,
    hasMemo,
    canAnalyze,
    isDeepTab,

    addImages,
    removeImage,
    setTargetName,
    setMemo,
    toggleTag,
    requestAnalysis,
    onPaymentComplete,
    onPaymentCancel,
    switchToDeepTab,
    reset,
    setError,
  };
}
