-- =============================================
-- Table Editor CSV 임포트 후 데이터·스키마 정합성 보정
-- Supabase SQL Editor에서 한 번 실행 (여러 번 실행해도 무방)
-- =============================================

-- 1) CSV로 들어온 NULL/빈 문자열을 스키마 기본값에 맞춤
UPDATE profiles
SET analysis_count = 0
WHERE analysis_count IS NULL;

UPDATE analyses
SET analysis_mode = 'simple'
WHERE analysis_mode IS NULL OR TRIM(COALESCE(analysis_mode, '')) = '';

UPDATE analyses
SET image_count = 0
WHERE image_count IS NULL;

UPDATE analyses
SET is_paid = false
WHERE is_paid IS NULL;

-- 2) analysis_detail이 CSV 때문에 JSON "문자열" 한 겹으로만 들어간 경우(드묾) 수동 확인:
--    SELECT id, jsonb_typeof(analysis_detail), analysis_detail FROM analyses LIMIT 5;
--    object가 아니면 앱에서 파싱 오류 가능 — Table Editor 또는 SQL로 수정

-- 3) (선택) 부모 없는 analyses 행 제거 — FK 위반으로 임포트 실패했을 때는 보통 해당 행이 없음
-- DELETE FROM analyses a WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = a.profile_id);

-- 4) increment RPC (supabase-schema.sql 5번과 동일 — 함수만 단독 적용할 때)
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
