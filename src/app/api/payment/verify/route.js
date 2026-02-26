import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;
const EXPECTED_AMOUNT = 1900;

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
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, message: "이미 처리된 결제입니다" },
        { status: 409 },
      );
    }

    // 2. 포트원 V2 API로 결제 검증
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

    const payment = await portoneRes.json();

    // 3. 결제 상태 및 금액 확인
    const isPaid = payment.status === "PAID";
    const amountCorrect = payment.amount?.total === EXPECTED_AMOUNT;

    if (!isPaid || !amountCorrect) {
      return NextResponse.json({
        success: true,
        data: {
          verified: false,
          paymentId,
          amount: payment.amount?.total || 0,
          status: payment.status?.toLowerCase() || "unknown",
        },
      });
    }

    // 4. 프로필 ID 조회
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("device_id", deviceId)
      .single();

    // 5. payments 테이블에 기록
    await supabase.from("payments").insert({
      profile_id: profile?.id || null,
      portone_payment_id: paymentId,
      amount: EXPECTED_AMOUNT,
      status: "paid",
    });

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
