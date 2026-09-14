-- Customer identity rule: mobile number UNIQUE PER STORE (not globally).
--
-- Why: the original table declared phone UNIQUE globally, so a customer of
-- Shop A could never be added by Shop B (cryptic unique-violation error).
-- The correct business rule is one record per phone per shop - the same
-- person can be a customer of two shops independently.
--
-- Also normalizes obvious Indian format variants ("919876543210",
-- "09876543210", "+91 98765 43210" -> "9876543210") so the same number
-- can't double up inside one store. Rows that would collide after
-- normalization are left untouched (staff can merge them in the UI).

-- 1. Normalize safe rows to last-10-digits (Indian mobiles only).
UPDATE public.customers AS c
SET phone = right(regexp_replace(c.phone, '\D', '', 'g'), 10),
    updated_at = now()
WHERE c.phone IS NOT NULL
  AND regexp_replace(c.phone, '\D', '', 'g') ~ '^(91|0)?[6-9][0-9]{9}$'
  AND NOT EXISTS (
    SELECT 1 FROM public.customers AS other
    WHERE other.id <> c.id
      AND other.store_id IS NOT DISTINCT FROM c.store_id
      AND other.phone = right(regexp_replace(c.phone, '\D', '', 'g'), 10)
  );

-- 2. Replace the global unique constraint with a per-store one.
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_phone_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_store_phone_unique
  ON public.customers (store_id, phone);
