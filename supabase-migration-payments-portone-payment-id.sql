-- payments.portone_payment_id 컬럼 추가
-- 오류: PGRST204 "Could not find the 'portone_payment_id' column of 'payments'"
-- 원인: 원격 DB의 payments 테이블 정의가 supabase-schema.sql 과 불일치할 때
--
-- 사용: Supabase Dashboard → SQL Editor → 아래 실행 후 결제 재시도

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS portone_payment_id TEXT;

COMMENT ON COLUMN public.payments.portone_payment_id IS '포트원 V2 결제 고유 ID';

CREATE UNIQUE INDEX IF NOT EXISTS payments_portone_payment_id_key
  ON public.payments (portone_payment_id);

-- (선택) 레거시 행이 없고 컬럼이 모두 채워졌다면 NOT NULL 을 걸 수 있음
-- ALTER TABLE public.payments ALTER COLUMN portone_payment_id SET NOT NULL;
