-- Allow clients to delete their own unpaid invoices (e.g. changing payment scheme)
DROP POLICY IF EXISTS "Client bisa hapus invoice unpaid pesanannya" ON public.invoices;
CREATE POLICY "Client bisa hapus invoice unpaid pesanannya"
  ON public.invoices FOR DELETE
  USING (
    status = 'unpaid'
    AND booking_id IN (SELECT id FROM public.bookings WHERE client_id = auth.uid())
  );
