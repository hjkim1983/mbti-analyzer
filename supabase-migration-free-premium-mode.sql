-- 기존 simple/deep 값을 free/premium으로 일괄 치환 (선택 실행)
UPDATE analyses SET analysis_mode = 'free' WHERE analysis_mode = 'simple';
UPDATE analyses SET analysis_mode = 'premium' WHERE analysis_mode = 'deep';

ALTER TABLE analyses
  ALTER COLUMN analysis_mode SET DEFAULT 'free';

COMMENT ON COLUMN analyses.analysis_mode IS 'free: 무료 빠른 추정, premium: 유료 프리미엄 리포트';
