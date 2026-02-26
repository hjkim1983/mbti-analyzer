"use client";

import { useState } from "react";
import { requestPayment } from "@/lib/portone";

export default function usePayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  async function pay(deviceId) {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await requestPayment(deviceId);

      if (!result) {
        setError("결제가 취소되었거나 실패했습니다.");
        return null;
      }

      const verifyRes = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: result.paymentId,
          deviceId,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyData.success || !verifyData.data?.verified) {
        setError("결제 검증에 실패했습니다. 다시 시도해주세요.");
        return null;
      }

      return result.paymentId;
    } catch (err) {
      console.error("결제 오류:", err);
      setError("결제 처리 중 오류가 발생했습니다.");
      return null;
    } finally {
      setIsProcessing(false);
    }
  }

  return { pay, isProcessing, error, clearError: () => setError(null) };
}
