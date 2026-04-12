-- ============================================================
-- Support overtime invoice flow
-- ============================================================

-- 1) Extend invoice type check to include 'lembur'
DO $$ BEGIN
  ALTER TABLE public.invoices
    DROP CONSTRAINT IF EXISTS invoices_invoice_type_check;

  ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_invoice_type_check
    CHECK (invoice_type IN ('dp', 'pelunasan', 'lembur'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Add overtime metadata fields
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS overtime_hours integer,
  ADD COLUMN IF NOT EXISTS overtime_rate numeric,
  ADD COLUMN IF NOT EXISTS notes text;

-- 3) Validate overtime invoice completeness
DO $$ BEGIN
  ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_lembur_fields_check
    CHECK (
      invoice_type <> 'lembur'
      OR (
        overtime_hours IS NOT NULL
        AND overtime_hours > 0
        AND overtime_rate IS NOT NULL
        AND overtime_rate > 0
        AND notes IS NOT NULL
        AND btrim(notes) <> ''
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_booking_type_status
  ON public.invoices(booking_id, invoice_type, status);
