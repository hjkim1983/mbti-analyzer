import { supabase } from "./supabase";
import { FREE_LIMIT, ANALYSIS_MODE, normalizeAnalysisMode } from "./analysis-tier";

export { FREE_LIMIT };
export const PRICE_PER_ANALYSIS = 1900;

/** CSV 등으로 analysis_count가 NULL/문자열이어도 숫자로 통일 */
function normalizeCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/**
 * 디바이스의 분석 횟수 조회 (없으면 프로필 자동 생성)
 */
export async function getAnalysisCount(deviceId) {
  let { data: profile, error } = await supabase
    .from("profiles")
    .select("id, analysis_count")
    .eq("device_id", deviceId)
    .limit(1)
    .maybeSingle();

  if (!profile && (!error || error.code === "PGRST116")) {
    const { data: newProfile, error: insertErr } = await supabase
      .from("profiles")
      .insert({ device_id: deviceId, analysis_count: 0 })
      .select("id, analysis_count")
      .single();

    if (insertErr) {
      // 동일 device_id가 CSV로 이미 있으면 unique 위반 → 다시 조회
      if (insertErr.code === "23505") {
        const retry = await supabase
          .from("profiles")
          .select("id, analysis_count")
          .eq("device_id", deviceId)
          .limit(1)
          .maybeSingle();
        if (retry.data) {
          profile = retry.data;
        } else {
          throw insertErr;
        }
      } else {
        throw insertErr;
      }
    } else {
      profile = newProfile;
    }
  } else if (error) {
    throw error;
  }

  return {
    profileId: profile.id,
    count: normalizeCount(profile.analysis_count),
  };
}

/**
 * 분석 횟수 +1 증가
 */
export async function incrementAnalysisCount(profileId) {
  const { data, error } = await supabase.rpc("increment_analysis_count", {
    p_profile_id: profileId,
  });

  if (error) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("analysis_count")
      .eq("id", profileId)
      .maybeSingle();

    const newCount = normalizeCount(profile?.analysis_count) + 1;

    await supabase
      .from("profiles")
      .update({
        analysis_count: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    return newCount;
  }

  return data;
}

/**
 * 분석 결과 DB 저장
 */
export async function saveAnalysis({
  profileId,
  targetName,
  result,
  memo,
  imageCount,
  isPaid,
  paymentId,
  analysisMode = ANALYSIS_MODE.FREE,
}) {
  const rawConf = Number(result.confidence);
  const confidence = Number.isFinite(rawConf) ? Math.round(rawConf) : 0;

  const { data, error } = await supabase
    .from("analyses")
    .insert({
      profile_id: profileId,
      target_name: targetName,
      mbti_type: String(result.mbtiType || "XXXX").slice(0, 4),
      confidence,
      confidence_level: result.confidenceLevel ?? null,
      analysis_detail: result,
      memo: memo || null,
      image_count: Math.max(0, Math.floor(Number(imageCount) || 0)),
      is_paid: Boolean(isPaid),
      payment_id: paymentId || null,
      analysis_mode:
        normalizeAnalysisMode(analysisMode) === ANALYSIS_MODE.PREMIUM
          ? "premium"
          : "free",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}
