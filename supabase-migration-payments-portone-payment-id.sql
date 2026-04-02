-- payments.portone_payment_id 컬럼 추가
-- 오류: PGRST204 "Could not find the 'portone_payment_id' column of 'payments'"
-- 원인: 원격 DB의 payments 테이블 정의가 supabase-schema.sql 과 불일치할 때
--
-- 사용: Supabase Dashboard → SQL Editor → 아래 전체 실행 (프로젝트가 .env 의 Supabase URL 과 동일한지 확인)
--
-- 적용 확인:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'portone_payment_id';

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS portone_payment_id TEXT;

COMMENT ON COLUMN public.payments.portone_payment_id IS '포트원 V2 결제 고유 ID';

CREATE UNIQUE INDEX IF NOT EXISTS payments_portone_payment_id_key
  ON public.payments (portone_payment_id);

-- (선택) 레거시 행이 없고 컬럼이 모두 채워졌다면 NOT NULL 을 걸 수 있음
-- ALTER TABLE public.payments ALTER COLUMN portone_payment_id SET NOT NULL;

-- PostgREST 스키마 캐시 갱신 (마이그레이션 직후에도 PGRST204 가 나올 때)
NOTIFY pgrst, 'reload schema';
