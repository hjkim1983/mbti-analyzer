-- payments: portone_payment_id 추가 및 레거시 portone_payment 정리
-- 앱은 portone_payment_id(식별) + portone_payment(레거시 NOT NULL 대비 동일 값) 로 INSERT 함
--
-- Supabase Dashboard → SQL Editor → 전체 실행 (.env 의 프로젝트와 동일한지 확인)

-- 1) V2 식별자 컬럼 (없으면 추가)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS portone_payment_id TEXT;

-- 2) 예전에 portone_payment 만 있던 행이 있으면 id 로 복사
UPDATE public.payments
SET portone_payment_id = portone_payment
WHERE portone_payment_id IS NULL
  AND portone_payment IS NOT NULL
  AND trim(portone_payment) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS payments_portone_payment_id_key
  ON public.payments (portone_payment_id);

COMMENT ON COLUMN public.payments.portone_payment_id IS '포트원 V2 결제 고유 ID';
COMMENT ON COLUMN public.payments.portone_payment IS '레거시 컬럼 — 앱은 portone_payment_id 와 동일 값으로 채움';

-- 적용 확인:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'payments'
--   AND column_name IN ('portone_payment', 'portone_payment_id');

NOTIFY pgrst, 'reload schema';
