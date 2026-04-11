-- Migration to add extra booking fields
-- Date: 2026-04-11

ALTER TABLE public.bookings
ADD COLUMN phone_number TEXT,
ADD COLUMN is_whatsapp BOOLEAN DEFAULT FALSE,
ADD COLUMN instagram_accounts JSONB DEFAULT '[]'::JSONB,
ADD COLUMN latitude NUMERIC,
ADD COLUMN longitude NUMERIC,
ADD COLUMN end_time TIME WITHOUT TIME ZONE;

-- Add comment for clarity
COMMENT ON COLUMN public.bookings.instagram_accounts IS 'Array of instagram usernames';
COMMENT ON COLUMN public.bookings.latitude IS 'Location pinpoint latitude';
COMMENT ON COLUMN public.bookings.longitude IS 'Location pinpoint longitude';
COMMENT ON COLUMN public.bookings.end_time IS 'Service end time (auto-set to 17:00)';
