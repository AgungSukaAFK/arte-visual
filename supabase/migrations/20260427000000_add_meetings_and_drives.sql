-- ============================================================
-- Tabel meetings: jadwal meeting antara klien dan admin
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meetings (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    uuid        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  meeting_type  text        NOT NULL CHECK (meeting_type IN ('online', 'offline')),
  status        text        NOT NULL DEFAULT 'requested'
                            CHECK (status IN ('requested', 'confirmed', 'cancelled', 'done')),
  scheduled_at  text,
  admin_notes   text,
  client_notes  text,
  created_by    text        NOT NULL CHECK (created_by IN ('client', 'admin')),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_booking_id ON public.meetings(booking_id);

-- RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Client lihat meeting pesanannya" ON public.meetings;
CREATE POLICY "Client lihat meeting pesanannya"
  ON public.meetings FOR SELECT
  USING (
    booking_id IN (SELECT id FROM public.bookings WHERE client_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin lihat semua meeting" ON public.meetings;
CREATE POLICY "Admin lihat semua meeting"
  ON public.meetings FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Client insert meeting pesanannya" ON public.meetings;
CREATE POLICY "Client insert meeting pesanannya"
  ON public.meetings FOR INSERT
  WITH CHECK (
    booking_id IN (SELECT id FROM public.bookings WHERE client_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin insert meeting" ON public.meetings;
CREATE POLICY "Admin insert meeting"
  ON public.meetings FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin update meeting" ON public.meetings;
CREATE POLICY "Admin update meeting"
  ON public.meetings FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Client update meeting miliknya" ON public.meetings;
CREATE POLICY "Client update meeting miliknya"
  ON public.meetings FOR UPDATE
  USING (
    booking_id IN (SELECT id FROM public.bookings WHERE client_id = auth.uid())
  );

-- ============================================================
-- Tabel booking_drives: link Google Drive hasil dokumentasi
-- ============================================================
CREATE TABLE IF NOT EXISTS public.booking_drives (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid    NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  drive_name   text    NOT NULL,
  photo_count  integer NOT NULL DEFAULT 0,
  video_count  integer NOT NULL DEFAULT 0,
  file_size    text,
  drive_url    text    NOT NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.booking_drives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Client lihat drive pesanannya" ON public.booking_drives;
CREATE POLICY "Client lihat drive pesanannya"
  ON public.booking_drives FOR SELECT
  USING (
    booking_id IN (SELECT id FROM public.bookings WHERE client_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin lihat semua drive" ON public.booking_drives;
CREATE POLICY "Admin lihat semua drive"
  ON public.booking_drives FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin insert drive" ON public.booking_drives;
CREATE POLICY "Admin insert drive"
  ON public.booking_drives FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin update drive" ON public.booking_drives;
CREATE POLICY "Admin update drive"
  ON public.booking_drives FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin delete drive" ON public.booking_drives;
CREATE POLICY "Admin delete drive"
  ON public.booking_drives FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
