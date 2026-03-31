import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;
const EXPECTED_AMOUNT = 1900;

/** PortOne V2 결제 단건 조회 응답에서 결제 객체·금액·상태 정규화 */
function parsePortonePaymentPayload(json) {
  const payment = json?.payment ?? json;
  if (!payment || typeof payment !== "object") {
    return { payment: null, total: null, status: "" };
  }
  const amt = payment.amount;
  let total = null;
  if (amt && typeof amt === "object") {
    const raw = amt.total ?? amt.paid;
    if (raw != null && Number.isFinite(Number(raw))) {
      total = Number(raw);
    }
  } else if (typeof amt === "number" && Number.isFinite(amt)) {
    total = amt;
  }
  const status = String(payment.status ?? "").toUpperCase();
  return { payment, total, status };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(request) {
  try {
    const { paymentId, deviceId } = await request.json();

    if (!paymentId || !deviceId) {
      return NextResponse.json(
        { success: false, message: "paymentId와 deviceId가 필요합니다" },
        { status: 400 },
      );
    }

    // 1. 중복 결제 확인
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("portone_payment_id", paymentId)
      .maybeSingle();

    // 이미 검증·기록된 결제는 멱등 성공 처리 (재시도·중복 요청 시에도 분석 단계로 진행)
    if (existing) {
      return NextResponse.json({
        success: true,
        data: {
          verified: true,
          paymentId,
          amount: EXPECTED_AMOUNT,
          status: "paid",
          alreadyRecorded: true,
        },
      });
    }

    // 2. 포트원 V2 API로 결제 검증 (결제 직후 GET이 아직 PAID가 아닐 수 있어 짧게 재시도)
    let total = null;
    let statusStr = "";
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const portoneRes = await fetch(
        `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
        {
          headers: {
            Authorization: `PortOne ${PORTONE_API_SECRET}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!portoneRes.ok) {
        const errText = await portoneRes.text();
        console.error("포트원 검증 실패:", errText);
        return NextResponse.json(
          { success: false, message: "결제 검증에 실패했습니다" },
          { status: 400 },
        );
      }

      const body = await portoneRes.json();
      const parsed = parsePortonePaymentPayload(body);
      total = parsed.total;
      statusStr = parsed.status;

      const isPaid = statusStr === "PAID";
      const amountCorrect =
        total === EXPECTED_AMOUNT ||
        (total != null && Math.abs(total - EXPECTED_AMOUNT) < 0.01);

      if (isPaid && amountCorrect) break;

      // 아직 반영 전이거나 금액 필드만 늦게 채워지는 경우 재시도
      if (attempt < maxAttempts - 1) {
        await sleep(400);
      }
    }

    // 3. 결제 상태 및 금액 확인
    const isPaid = statusStr === "PAID";
    const amountCorrect =
      total === EXPECTED_AMOUNT ||
      (total != null && Math.abs(total - EXPECTED_AMOUNT) < 0.01);

    if (!isPaid || !amountCorrect) {
      return NextResponse.json({
        success: true,
        data: {
          verified: false,
          paymentId,
          amount: total ?? 0,
          status: (statusStr || "unknown").toLowerCase(),
        },
      });
    }

    // 4. 프로필 ID 조회
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("device_id", deviceId)
      .maybeSingle();

    // 5. payments 테이블에 기록
    const { error: insertError } = await supabase.from("payments").insert({
      profile_id: profile?.id || null,
      portone_payment_id: paymentId,
      amount: EXPECTED_AMOUNT,
      status: "paid",
    });

    if (insertError) {
      console.error("Supabase payments insert:", insertError);
      return NextResponse.json(
        { success: false, message: "결제 기록 저장에 실패했습니다" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        paymentId,
        amount: EXPECTED_AMOUNT,
        status: "paid",
      },
    });
  } catch (err) {
    console.error("결제 검증 오류:", err);
    return NextResponse.json(
      { success: false, message: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
