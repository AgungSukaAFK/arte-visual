-- ============================================================
-- Add package image URL and backfill temporary Unsplash images
-- ============================================================

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS image_url text;

WITH ranked_packages AS (
  SELECT
    id,
    row_number() OVER (ORDER BY created_at, id) AS rn
  FROM public.packages
)
UPDATE public.packages AS p
SET image_url = CASE ranked_packages.rn
  WHEN 1 THEN 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=80'
  WHEN 2 THEN 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1400&q=80'
  WHEN 3 THEN 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1400&q=80'
  WHEN 4 THEN 'https://images.unsplash.com/photo-1504198458649-3128b932f49b?auto=format&fit=crop&w=1400&q=80'
  ELSE 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=1400&q=80'
END
FROM ranked_packages
WHERE p.id = ranked_packages.id
  AND (p.image_url IS NULL OR btrim(p.image_url) = '');
