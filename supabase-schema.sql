-- =============================================
-- 카톡 MBTI 스캐너 — Supabase DB 스키마
-- Supabase SQL Editor에서 실행하세요
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
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analyses_profile_id ON analyses(profile_id);

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
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_all" ON profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analyses_all" ON analyses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_all" ON payments FOR ALL USING (true) WITH CHECK (true);
