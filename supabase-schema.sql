-- =============================================
-- 카톡 MBTI 스캐너 — Supabase DB 스키마
-- Supabase SQL Editor에 그대로 붙여넣어 실행하세요.
-- (신규 프로젝트 / 이미 운영 중인 DB 모두 안전하게 여러 번 실행 가능)
-- =============================================

-- 1. profiles: 디바이스 기반 사용자 프로필
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  nickname TEXT,
  analysis_count INTEGER DEFAULT 0,
  birth_date DATE,
  birth_time TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_device_id ON profiles(device_id);

-- 2. analyses: MBTI 분석 결과
CREATE TABLE IF NOT EXISTS analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_name TEXT NOT NULL,
  mbti_type VARCHAR(4) NOT NULL,
  confidence INTEGER NOT NULL,
  confidence_level VARCHAR(10),
  analysis_detail JSONB NOT NULL,
  memo TEXT,
  image_count INTEGER DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  payment_id TEXT,
  analysis_mode VARCHAR(10) DEFAULT 'simple',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analyses_profile_id ON analyses(profile_id);

-- 2-1. 기존 DB 호환: 예전 스크립트로만 만들어진 analyses에도 analysis_mode 추가
-- (CREATE TABLE IF NOT EXISTS 는 "이미 테이블이 있으면" 정의를 갱신하지 않으므로 필요)
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS analysis_mode VARCHAR(10) DEFAULT 'simple';

COMMENT ON COLUMN analyses.analysis_mode IS 'simple: 무료 간단, deep: 유료 심층';

-- 3. payments: 포트원 결제 기록
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  portone_payment_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,
  analysis_id UUID REFERENCES analyses(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS 정책 (비로그인 서비스 — anon 키 허용)
-- 재실행 시 정책 중복 오류를 피하기 위해 DROP 후 CREATE
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_all" ON profiles;
CREATE POLICY "profiles_all" ON profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "analyses_all" ON analyses;
CREATE POLICY "analyses_all" ON analyses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_all" ON payments;
CREATE POLICY "payments_all" ON payments FOR ALL USING (true) WITH CHECK (true);

-- 5. RPC: 분석 횟수 +1 (CSV 이전 DB 등에서 함수가 없으면 클라이언트 폴백이 동작하지만, 여기서 통일)
CREATE OR REPLACE FUNCTION increment_analysis_count(p_profile_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE profiles
  SET
    analysis_count = COALESCE(analysis_count, 0) + 1,
    updated_at = now()
  WHERE id = p_profile_id
  RETURNING analysis_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION increment_analysis_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_analysis_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_analysis_count(UUID) TO service_role;
