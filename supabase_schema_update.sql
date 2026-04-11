-- 1. Tambahkan kolom total_amount ke tabel bookings (jika belum ada)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;

-- 2. Update status booking (Enum atau Constraint)
-- Karena PostgreSQL tidak mudah mengubah enum, kita gunakan CHECK constraint jika perlu, 
-- atau biarkan text namun kita handle di level aplikasi. 
-- Pastikan status yang diperbolehkan: pending, confirmed, awaiting_payment, dp_paid, fully_paid, completed, cancelled

-- 3. Buat Tabel Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    payment_type TEXT CHECK (payment_type IN ('dp', 'final', 'full')),
    midtrans_order_id TEXT UNIQUE,
    snap_token TEXT,
    status TEXT DEFAULT 'pending', -- pending, settlement, expire, cancel
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Buat Tabel Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    invoice_number TEXT UNIQUE,
    amount NUMERIC NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing untuk kecepatan
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);
