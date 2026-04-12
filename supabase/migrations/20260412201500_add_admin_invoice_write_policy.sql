-- ============================================================
-- Allow admin to create/update invoices (including overtime invoices)
-- ============================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin bisa insert invoice" ON public.invoices;
CREATE POLICY "Admin bisa insert invoice"
  ON public.invoices FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin bisa update invoice" ON public.invoices;
CREATE POLICY "Admin bisa update invoice"
  ON public.invoices FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
