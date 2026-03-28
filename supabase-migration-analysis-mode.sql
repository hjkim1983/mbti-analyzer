-- (선택) analysis_mode만 추가할 때 사용. 전체 스키마는 supabase-schema.sql 통합본을 권장합니다.
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS analysis_mode VARCHAR(10) DEFAULT 'simple';

COMMENT ON COLUMN analyses.analysis_mode IS 'simple: 무료 간단, deep: 유료 심층';
