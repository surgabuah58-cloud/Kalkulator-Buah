-- ============================================================
-- MIGRASI: Buat tabel kas_masuk dan kas_keluar
-- Jalankan script ini di Supabase SQL Editor
-- ============================================================

-- Pastikan fungsi updated_at ada (CREATE OR REPLACE = aman dijalankan ulang)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Kas Masuk
-- ============================================================
CREATE TABLE IF NOT EXISTS kas_masuk (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tanggal     DATE NOT NULL DEFAULT CURRENT_DATE,
  kategori    VARCHAR(30) NOT NULL CHECK (kategori IN ('modal_awal', 'injeksi_modal', 'pinjaman', 'lainnya')),
  jumlah      DECIMAL(15,2) NOT NULL CHECK (jumlah > 0),
  deskripsi   VARCHAR(200) NOT NULL,
  catatan     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kas_masuk_tanggal ON kas_masuk(tanggal DESC);

ALTER TABLE kas_masuk ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'allow_all_kas_masuk' AND tablename = 'kas_masuk'
  ) THEN
    CREATE POLICY "allow_all_kas_masuk" ON kas_masuk
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE TRIGGER trigger_kas_masuk_updated_at
  BEFORE UPDATE ON kas_masuk
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Kas Keluar
-- ============================================================
CREATE TABLE IF NOT EXISTS kas_keluar (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tanggal     DATE NOT NULL DEFAULT CURRENT_DATE,
  kategori    VARCHAR(30) NOT NULL CHECK (kategori IN ('sewa', 'listrik_air', 'gaji', 'alat', 'barang_habis', 'transport_ops', 'lainnya')),
  jumlah      DECIMAL(15,2) NOT NULL CHECK (jumlah > 0),
  deskripsi   VARCHAR(200) NOT NULL,
  catatan     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kas_keluar_tanggal ON kas_keluar(tanggal DESC);

ALTER TABLE kas_keluar ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'allow_all_kas_keluar' AND tablename = 'kas_keluar'
  ) THEN
    CREATE POLICY "allow_all_kas_keluar" ON kas_keluar
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE TRIGGER trigger_kas_keluar_updated_at
  BEFORE UPDATE ON kas_keluar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
