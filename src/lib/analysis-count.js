import { supabase } from "./supabase";

export const FREE_LIMIT = 3;
export const PRICE_PER_ANALYSIS = 1900;

/**
 * 디바이스의 분석 횟수 조회 (없으면 프로필 자동 생성)
 */
export async function getAnalysisCount(deviceId) {
  let { data: profile, error } = await supabase
    .from("profiles")
    .select("id, analysis_count")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (!profile && (!error || error.code === "PGRST116")) {
    const { data: newProfile, error: insertErr } = await supabase
      .from("profiles")
      .insert({ device_id: deviceId, analysis_count: 0 })
      .select("id, analysis_count")
      .single();

    if (insertErr) throw insertErr;
    profile = newProfile;
  } else if (error) {
    throw error;
  }

  return {
    profileId: profile.id,
    count: profile.analysis_count,
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
      .single();

    const newCount = (profile?.analysis_count || 0) + 1;

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
}) {
  const { data, error } = await supabase
    .from("analyses")
    .insert({
      profile_id: profileId,
      target_name: targetName,
      mbti_type: result.mbtiType,
      confidence: result.confidence,
      confidence_level: result.confidenceLevel,
      analysis_detail: result,
      memo: memo || null,
      image_count: imageCount,
      is_paid: isPaid,
      payment_id: paymentId || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}
