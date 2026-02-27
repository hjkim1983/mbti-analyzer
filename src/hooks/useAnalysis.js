"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { fileToBase64 } from "@/lib/image-utils";
import { getDeviceId } from "@/lib/device-id";
import { getLoadingSteps } from "@/constants/loading-steps";
import { supabase } from "@/lib/supabase";

const FREE_LIMIT = 3;

export default function useAnalysis() {
  const [stage, setStage] = useState("main");
  const [images, setImages] = useState([]);
  const [targetName, setTargetName] = useState("");
  const [memo, setMemo] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [freeCount, setFreeCount] = useState(null);
  const [error, setError] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const timerRef = useRef(null);
  const pendingPaymentId = useRef(null);

  const imageCount = images.length;
  const isMulti = imageCount >= 2;
  const hasMemo = memo.trim().length > 0;
  const canAnalyze = imageCount > 0 || hasMemo;

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
        // 첫 사용자는 프로필이 없으므로 무시
      }
    })();
  }, []);

  const addImages = useCallback(
    (files) => {
      const newImgs = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, 5 - images.length)
        .map((f) => ({
          file: f,
          preview: URL.createObjectURL(f),
        }));
      setImages((prev) => [...prev, ...newImgs]);
    },
    [images.length],
  );

  const removeImage = useCallback((idx) => {
    setImages((prev) => {
      const removed = prev[idx];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const toggleTag = useCallback((tag) => {
    setMemo((prev) => {
      const lines = prev.split("\n").filter(Boolean);
      if (lines.includes(tag))
        return lines.filter((l) => l !== tag).join("\n");
      return [...lines, tag].join("\n");
    });
  }, []);

  // 로딩 애니메이션 시작
  const startLoading = useCallback(
    (apiPromise) => {
      setStage("loading");
      setLoadingStep(0);

      const { messages } = getLoadingSteps(isMulti, hasMemo, imageCount);
      let step = 0;

      // 이미지 장수가 많을수록 각 단계 간격을 늘려 체감 대기시간 분산
      const intervalMs = isMulti ? Math.max(900, imageCount * 600) : 900;

      timerRef.current = setInterval(() => {
        step++;
        if (step < messages.length) {
          setLoadingStep(step);
        }
      }, intervalMs);

      apiPromise
        .then((data) => {
          clearInterval(timerRef.current);

          // PAYMENT_REQUIRED로 null이 반환된 경우 — payment stage로 이미 전환됨
          if (!data) return;

          // 모든 로딩 단계를 완료 표시
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
    [isMulti, hasMemo],
  );

  // API 분석 호출
  const callAnalyzeApi = useCallback(
    async (paymentId = null) => {
      const deviceId = await getDeviceId();

      // 이미지 Base64 변환 (장수에 따라 자동 압축 강도 조정)
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
          memo,
          images: base64Images,
          paymentId,
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
    [images, targetName, memo],
  );

  // 분석 요청 (메인 진입점)
  const requestAnalysis = useCallback(async () => {
    if (!canAnalyze) return;
    setError(null);
    setIsChecking(true);

    try {
      const apiPromise = callAnalyzeApi();

      // 로딩과 동시에 API 호출
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
  }, [canAnalyze, callAnalyzeApi, startLoading]);

  // 결제 완료 후 분석 진행
  const onPaymentComplete = useCallback(
    async (paymentId) => {
      if (!paymentId) return;

      setError(null);
      const apiPromise = callAnalyzeApi(paymentId);
      startLoading(apiPromise);
    },
    [callAnalyzeApi, startLoading],
  );

  // 결제 취소
  const onPaymentCancel = useCallback(() => {
    setStage("main");
    setError(null);
  }, []);

  // 리셋
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
  }, [images]);

  return {
    stage,
    images,
    targetName,
    memo,
    loadingStep,
    result,
    freeCount,
    error,
    isChecking,
    imageCount,
    isMulti,
    hasMemo,
    canAnalyze,

    addImages,
    removeImage,
    setTargetName,
    setMemo,
    toggleTag,
    requestAnalysis,
    onPaymentComplete,
    onPaymentCancel,
    reset,
    setError,
  };
}
