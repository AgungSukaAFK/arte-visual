-- ============================================================
-- Extend invoices: add invoice_type, status, dp_percentage
-- ============================================================
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_type text NOT NULL DEFAULT 'pelunasan',
  ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS dp_percentage integer;

-- CHECK constraints (safe: ignore if already exists)
DO $$ BEGIN
  ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_invoice_type_check
    CHECK (invoice_type IN ('dp', 'pelunasan'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('unpaid', 'paid', 'cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Make payment_id nullable so invoices can exist before payment
ALTER TABLE public.invoices
  ALTER COLUMN payment_id DROP NOT NULL;

-- ============================================================
-- Extend payments: add invoice_id for reverse lookup
-- ============================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS invoice_id uuid
    REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id
  ON public.payments(invoice_id);

-- ============================================================
-- RLS: allow clients to insert invoices for their own bookings
-- ============================================================
DROP POLICY IF EXISTS "Client bisa buat invoice sendiri" ON public.invoices;
CREATE POLICY "Client bisa buat invoice sendiri"
  ON public.invoices FOR INSERT
  WITH CHECK (
    booking_id IN (
      SELECT id FROM public.bookings WHERE client_id = auth.uid()
    )
  );
