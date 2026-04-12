ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'pending',
    'confirmed',
    'awaiting_payment',
    'dp_paid',
    'fully_paid',
    'completed',
    'cancelled'
  ));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Client lihat payment sendiri" ON public.payments;
CREATE POLICY "Client lihat payment sendiri"
  ON public.payments FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin lihat semua payment" ON public.payments;
CREATE POLICY "Admin lihat semua payment"
  ON public.payments FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Client lihat invoice sendiri" ON public.invoices;
CREATE POLICY "Client lihat invoice sendiri"
  ON public.invoices FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin lihat semua invoice" ON public.invoices;
CREATE POLICY "Admin lihat semua invoice"
  ON public.invoices FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );