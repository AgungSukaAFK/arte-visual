-- Seed Data Paket
insert into public.packages (name, description, price, original_price, badge, features)
values 
  ('Paket Wisuda Basic', 'Dokumentasi momen wisuda personal selama 2 jam.', 500000, null, null, '["1 Fotografer", "50 Foto Edit", "Semua File Mentah"]'),
  ('Paket Pre-Wedding', 'Sesi foto pre-wedding outdoor full day.', 2500000, 3000000, 'Diskon 500rb', '["1 Fotografer", "1 Videografer", "Video Teaser 1 Menit", "Cetak Kanvas 40x60"]'),
  ('Paket Event Corporate', 'Dokumentasi acara perusahaan atau seminar.', 3500000, null, 'Best Seller', '["2 Fotografer", "1 Videografer", "Video Highlight 3 Menit", "Liputan Full Day"]');

-- Seed Data Gallery (Gambar Dummy dari Unsplash)
insert into public.gallery (media_url, media_type, caption)
values
  ('https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1000&auto=format&fit=crop', 'image', 'Wedding Reception - Jakarta'),
  ('https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1000&auto=format&fit=crop', 'image', 'Prewedding Outdoor in Bali'),
  ('https://images.unsplash.com/photo-1527529482837-4698179dc6ce?q=80&w=1000&auto=format&fit=crop', 'image', 'Corporate Seminar Gala');