import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;
const EXPECTED_AMOUNT = 1900;

/** 포트원 V2 결제 고유 ID (중복 검사·UNIQUE 기준) */
const PAYMENTS_PORTONE_ID_COLUMN = "portone_payment_id";

/**
 * 일부 DB에만 있는 레거시 컬럼. NOT NULL 이면 `portone_payment_id` 와 동일 값으로 채움.
 */
const PAYMENTS_PORTONE_LEGACY_COLUMN = "portone_payment";

/** 스키마에 결제 ID 컬럼 없음(PGRST204) — Supabase 마이그레이션 미적용 */
const MISSING_COLUMN_HINT =
  `DB에 payments.${PAYMENTS_PORTONE_ID_COLUMN} 컬럼이 없습니다. supabase-schema.sql 또는 마이그레이션 SQL을 연결된 Supabase 프로젝트에서 실행한 뒤 NOTIFY pgrst 로 스키마를 다시 로드하세요.`;

function isMissingPortoneColumnError(err) {
  if (err?.code !== "PGRST204") return false;
  const msg = String(err?.message ?? "");
  return (
    msg.includes("portone_payment_id") ||
    msg.includes(PAYMENTS_PORTONE_LEGACY_COLUMN)
  );
}

/** PortOne V2 결제 단건 조회 응답에서 결제 객체·금액·상태 정규화 */
function parsePortonePaymentPayload(json) {
  const payment =
    json?.payment ??
    json?.data?.payment ??
    (json?.status && json?.amount !== undefined ? json : null) ??
    json;
  if (!payment || typeof payment !== "object") {
    return { payment: null, amountValue: null, status: "" };
  }
  const amt = payment.amount;
  let amountValue = null;
  if (amt && typeof amt === "object") {
    // 결제 완료 건은 paid가 실제 청구액인 경우가 많고, total과 다를 수 있음 — 둘 다 허용
    const paid = Number(amt.paid);
    const total = Number(amt.total);
    if (Number.isFinite(paid) && paid > 0) amountValue = paid;
    else if (Number.isFinite(total) && total > 0) amountValue = total;
    else {
      const raw = amt.total ?? amt.paid;
      if (raw != null && Number.isFinite(Number(raw))) amountValue = Number(raw);
    }
  } else if (typeof amt === "number" && Number.isFinite(amt)) {
    amountValue = amt;
  }
  const status = String(payment.status ?? "").toUpperCase();
  return { payment, amountValue, status };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(request) {
  try {
    if (!PORTONE_API_SECRET?.trim()) {
      console.error("PORTONE_API_SECRET 미설정");
      return NextResponse.json(
        {
          success: false,
          message:
            "서버에 PORTONE_API_SECRET이 설정되지 않았습니다. Vercel/호스트 환경변수를 확인하세요.",
        },
        { status: 500 },
      );
    }

    const { paymentId, deviceId } = await request.json();

    if (!paymentId || !deviceId) {
      return NextResponse.json(
        { success: false, message: "paymentId와 deviceId가 필요합니다" },
        { status: 400 },
      );
    }

    // 1. 중복 결제 확인
    const { data: existing, error: dupErr } = await supabase
      .from("payments")
      .select("id")
      .eq(PAYMENTS_PORTONE_ID_COLUMN, paymentId)
      .maybeSingle();

    if (dupErr && isMissingPortoneColumnError(dupErr)) {
      console.error("Supabase payments (중복 조회):", dupErr);
      return NextResponse.json(
        { success: false, message: MISSING_COLUMN_HINT },
        { status: 503 },
      );
    }

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
    const maxAttempts = 8;

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
        // 결제 직후 단건 조회가 404/502면 잠시 뒤 재시도 (즉시 실패 금지)
        const retryable =
          portoneRes.status === 404 ||
          portoneRes.status === 502 ||
          portoneRes.status === 503;
        if (retryable && attempt < maxAttempts - 1) {
          console.warn(
            "[verify] PortOne 재시도",
            portoneRes.status,
            paymentId,
          );
          await sleep(500);
          continue;
        }
        console.error(
          "포트원 검증 실패:",
          portoneRes.status,
          errText?.slice?.(0, 500),
        );
        return NextResponse.json(
          {
            success: false,
            message:
              portoneRes.status === 401
                ? "포트원 API 인증에 실패했습니다. PORTONE_API_SECRET을 확인하세요."
                : "결제 검증에 실패했습니다",
          },
          { status: 400 },
        );
      }

      const body = await portoneRes.json();
      const parsed = parsePortonePaymentPayload(body);
      total = parsed.amountValue;
      statusStr = parsed.status;

      const isPaid = statusStr === "PAID";
      const amountCorrect =
        total === EXPECTED_AMOUNT ||
        (total != null && Math.abs(total - EXPECTED_AMOUNT) < 0.01);

      if (isPaid && amountCorrect) break;

      if (attempt === maxAttempts - 1) {
        console.error("[verify] PortOne 결제 미검증", {
          paymentId,
          statusStr,
          amount: total,
          rawKeys: body && typeof body === "object" ? Object.keys(body) : [],
        });
      }

      if (attempt < maxAttempts - 1) {
        await sleep(500);
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
          message:
            "포트원에서 결제 완료(PAID) 또는 금액(₩1,900)이 확인되지 않았습니다. 잠시 후 다시 시도하거나 대시보드에서 결제 상태를 확인해 주세요.",
        },
      });
    }

    // 4. 프로필 ID 조회
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("device_id", deviceId)
      .maybeSingle();

    // 5. payments 테이블에 기록 — portone_payment_id 가 식별자, portone_payment 는 레거시 NOT NULL 대비 동일 값
    const { error: insertError } = await supabase.from("payments").insert({
      profile_id: profile?.id || null,
      [PAYMENTS_PORTONE_ID_COLUMN]: paymentId,
      [PAYMENTS_PORTONE_LEGACY_COLUMN]: paymentId,
      amount: EXPECTED_AMOUNT,
      status: "paid",
    });

    if (insertError) {
      // 동시 요청 등으로 UNIQUE(portone_payment_id) 충돌 시 이미 성공한 결제로 간주
      if (insertError.code === "23505") {
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
      if (isMissingPortoneColumnError(insertError)) {
        console.error("Supabase payments insert:", insertError);
        return NextResponse.json(
          { success: false, message: MISSING_COLUMN_HINT },
          { status: 503 },
        );
      }
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
