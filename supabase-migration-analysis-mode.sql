-- 기존 DB에 analysis_mode 컬럼 추가 (Supabase SQL Editor에서 1회 실행)
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS analysis_mode VARCHAR(10) DEFAULT 'simple';

COMMENT ON COLUMN analyses.analysis_mode IS 'simple: 무료 간단, deep: 유료 심층';
