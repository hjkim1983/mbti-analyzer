const STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
const PRICE = 1900;

/**
 * 포트원 V2 결제 요청
 * @param {string} deviceId - 디바이스 식별자
 * @returns {Promise<{paymentId: string} | null>} 결제 성공 시 paymentId, 실패/취소 시 null
 */
export async function requestPayment(deviceId) {
  const PortOne = await import("@portone/browser-sdk/v2");

  const paymentId = `mbti-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const response = await PortOne.requestPayment({
    storeId: STORE_ID,
    channelKey: CHANNEL_KEY,
    paymentId,
    orderName: "카톡 MBTI 분석 1회",
    totalAmount: PRICE,
    currency: "CURRENCY_KRW",
    payMethod: "CARD",
    customer: {
      customerId: deviceId,
    },
  });

  if (response.code) {
    if (response.code === "FAILURE_TYPE_PG") {
      return null;
    }
    return null;
  }

  return { paymentId: response.paymentId || paymentId };
}
