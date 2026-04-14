-- ============================================================
-- SURGA BUAH - Supply Chain & Pricing Dashboard
-- Database Schema v1.0
-- ============================================================
-- Catatan: Jalankan script ini di Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABEL MASTER
-- ============================================================

-- Master Buah (Fruit Master Data)
-- Menyimpan data buah beserta parameter musiman untuk kalkulasi HPP
CREATE TABLE IF NOT EXISTS buah (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode            VARCHAR(20) UNIQUE,                     -- Kode internal buah (contoh: APL-01)
  nama            VARCHAR(100) NOT NULL,
  kategori        VARCHAR(50),                            -- Kategori buah (contoh: Tropis, Import, Lokal)
  satuan          VARCHAR(20) DEFAULT 'peti',             -- Satuan pembelian (untuk fleksibilitas masa depan)
  -- Parameter Musim Kemarau
  berat_peti_kemarau    DECIMAL(10,2) NOT NULL DEFAULT 0, -- kg
  pct_afkir_kemarau     DECIMAL(5,2)  NOT NULL DEFAULT 0, -- persentase (contoh: 5.5 = 5.5%)
  -- Parameter Musim Hujan
  berat_peti_hujan      DECIMAL(10,2) NOT NULL DEFAULT 0, -- kg
  pct_afkir_hujan       DECIMAL(5,2)  NOT NULL DEFAULT 0, -- persentase
  -- Metadata
  deskripsi       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master Pemasok (Supplier Master Data)
CREATE TABLE IF NOT EXISTS pemasok (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode            VARCHAR(20) UNIQUE,                     -- Kode internal pemasok
  nama            VARCHAR(100) NOT NULL,
  kategori        VARCHAR(20) CHECK (kategori IN ('Tangan 1', 'Tangan 2', 'Tangan 3')), -- Tingkatan suplier
  kontak_nama     VARCHAR(100),
  kontak_telepon  VARCHAR(20),
  alamat          TEXT,
  kota            VARCHAR(100),
  catatan         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL TRANSAKSI
-- ============================================================

-- Pembelian (Daily Purchase Transactions)
-- Menyimpan setiap transaksi pembelian buah harian dari pemasok
CREATE TABLE IF NOT EXISTS pembelian (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  no_transaksi          VARCHAR(50) UNIQUE,               -- Nomor transaksi unik (auto-generate)
  tanggal               DATE NOT NULL DEFAULT CURRENT_DATE,
  buah_id               UUID NOT NULL REFERENCES buah(id) ON DELETE RESTRICT,
  pemasok_id            UUID NOT NULL REFERENCES pemasok(id) ON DELETE RESTRICT,
  
  -- Snapshot kondisi musim saat pembelian (penting untuk audit history)
  musim                 VARCHAR(10) NOT NULL CHECK (musim IN ('kemarau', 'hujan')),
  
  -- === INPUT DATA ===
  jumlah_peti           DECIMAL(10,2) NOT NULL DEFAULT 1 CHECK (jumlah_peti > 0),
  harga_beli_per_peti   DECIMAL(15,2) NOT NULL CHECK (harga_beli_per_peti >= 0),
  berat_bruto_total     DECIMAL(10,2) NOT NULL CHECK (berat_bruto_total > 0), -- kg total
  biaya_transport_per_peti  DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_biaya_regu_sortir   DECIMAL(15,2) NOT NULL DEFAULT 0,
  nilai_recovery_afkir      DECIMAL(15,2) NOT NULL DEFAULT 0, -- Pendapatan dari jual buah afkir
  
  -- === KALKULASI TERSIMPAN (Snapshot saat input untuk audit) ===
  -- Nilai-nilai ini adalah hasil kalkulasi yang disimpan agar tidak berubah jika parameter musim diubah
  snap_berat_peti_used      DECIMAL(10,2),  -- Berat peti yang digunakan (berdasarkan musim)
  snap_pct_afkir_used       DECIMAL(5,2),   -- % afkir yang digunakan
  landed_cost               DECIMAL(15,2),  -- Biaya per peti setelah transport
  berat_afkir               DECIMAL(10,2),  -- kg buah yang terbuang/afkir
  net_yield                 DECIMAL(10,2),  -- Berat bersih yang bisa dijual (kg)
  biaya_kuli_sortir_per_kg  DECIMAL(15,2),  -- Total sortir / net yield
  hpp_per_kg                DECIMAL(15,2),  -- True HPP per Kg (FINAL)
  
  catatan         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master Pelanggan (Customer Master Data)
CREATE TABLE IF NOT EXISTS pelanggan (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode            VARCHAR(20) UNIQUE,
  nama            VARCHAR(100) NOT NULL,
  tipe            VARCHAR(20) NOT NULL CHECK (tipe IN ('sub_supplier', 'dapur_mbg', 'retail')),
  kontak_nama     VARCHAR(100),
  kontak_telepon  VARCHAR(20),
  alamat          TEXT,
  kota            VARCHAR(100),
  catatan         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Penjualan (Daily Sales Transactions)
CREATE TABLE IF NOT EXISTS penjualan (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  no_transaksi          VARCHAR(50) UNIQUE,
  tanggal               DATE NOT NULL DEFAULT CURRENT_DATE,
  buah_id               UUID NOT NULL REFERENCES buah(id) ON DELETE RESTRICT,
  pelanggan_id          UUID NOT NULL REFERENCES pelanggan(id) ON DELETE RESTRICT,
  jumlah_kg             DECIMAL(10,2) NOT NULL CHECK (jumlah_kg > 0),
  harga_jual_per_kg     DECIMAL(15,2) NOT NULL CHECK (harga_jual_per_kg >= 0),
  total_nilai           DECIMAL(15,2) GENERATED ALWAYS AS (jumlah_kg * harga_jual_per_kg) STORED,
  hpp_snapshot          DECIMAL(15,2),  -- HPP saat transaksi (dari v_latest_hpp)
  spare_pct             DECIMAL(5,2)  NOT NULL DEFAULT 0 CHECK (spare_pct >= 0 AND spare_pct <= 100),
  margin_per_kg         DECIMAL(15,2) GENERATED ALWAYS AS (harga_jual_per_kg - COALESCE(hpp_snapshot, 0)) STORED,
  tipe_jual             VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (tipe_jual IN ('normal', 'reject')),
  sortir_id             UUID,  -- FK ke hasil_sortir (diisi setelah tabel tersebut dibuat)
  catatan               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_penjualan_buah_id     ON penjualan(buah_id);
CREATE INDEX IF NOT EXISTS idx_penjualan_pelanggan_id ON penjualan(pelanggan_id);
CREATE INDEX IF NOT EXISTS idx_penjualan_tanggal      ON penjualan(tanggal DESC);

-- Hasil Sortir (Actual Sort Results per Purchase Batch)
-- Dicatat oleh tim gudang setelah proses sortir selesai
CREATE TABLE IF NOT EXISTS hasil_sortir (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  no_sortir             VARCHAR(50) UNIQUE,
  pembelian_id          UUID NOT NULL REFERENCES pembelian(id) ON DELETE RESTRICT,
  tanggal_sortir        DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Hasil aktual pemilahan fisik
  kg_baik               DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (kg_baik >= 0),    -- siap jual normal
  kg_reject             DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (kg_reject >= 0),  -- jual harga reject
  kg_busuk              DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (kg_busuk >= 0),   -- waste, tidak dijual

  -- Harga reject bisa dikustomisasi per batch
  harga_jual_reject_per_kg  DECIMAL(15,2) DEFAULT 0,

  catatan               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hasil_sortir_pembelian_id ON hasil_sortir(pembelian_id);
CREATE INDEX IF NOT EXISTS idx_hasil_sortir_tanggal      ON hasil_sortir(tanggal_sortir DESC);

ALTER TABLE hasil_sortir ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_hasil_sortir" ON hasil_sortir FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER trigger_hasil_sortir_updated_at
  BEFORE UPDATE ON hasil_sortir
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS sortir_sequence START 1;
CREATE OR REPLACE FUNCTION generate_no_sortir()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.no_sortir IS NULL THEN
    NEW.no_sortir := 'SRT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                    LPAD(NEXTVAL('sortir_sequence')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_hasil_sortir_no_sortir
  BEFORE INSERT ON hasil_sortir
  FOR EACH ROW EXECUTE FUNCTION generate_no_sortir();

-- Tambah FK sortir_id ke penjualan setelah hasil_sortir dibuat
ALTER TABLE penjualan
  ADD CONSTRAINT fk_penjualan_sortir
  FOREIGN KEY (sortir_id) REFERENCES hasil_sortir(id) ON DELETE SET NULL;

-- Retur ke Pemasok
-- Mencatat pengembalian barang ke pemasok beserta kredit yang diterima
CREATE TABLE IF NOT EXISTS retur_pemasok (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  no_retur              VARCHAR(50) UNIQUE,
  pembelian_id          UUID NOT NULL REFERENCES pembelian(id) ON DELETE RESTRICT,
  tanggal               DATE NOT NULL DEFAULT CURRENT_DATE,

  kg_diretur            DECIMAL(10,2) NOT NULL CHECK (kg_diretur > 0),
  -- Kredit dari pemasok per kg (bisa berbeda dari harga beli awal)
  harga_kredit_per_kg   DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (harga_kredit_per_kg >= 0),
  total_kredit          DECIMAL(15,2) GENERATED ALWAYS AS (kg_diretur * harga_kredit_per_kg) STORED,

  alasan                TEXT,
  catatan               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retur_pemasok_pembelian_id ON retur_pemasok(pembelian_id);
CREATE INDEX IF NOT EXISTS idx_retur_pemasok_tanggal      ON retur_pemasok(tanggal DESC);

ALTER TABLE retur_pemasok ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_retur_pemasok" ON retur_pemasok FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER trigger_retur_pemasok_updated_at
  BEFORE UPDATE ON retur_pemasok
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS retur_sequence START 1;
CREATE OR REPLACE FUNCTION generate_no_retur()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.no_retur IS NULL THEN
    NEW.no_retur := 'RTR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                   LPAD(NEXTVAL('retur_sequence')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_retur_pemasok_no_retur
  BEFORE INSERT ON retur_pemasok
  FOR EACH ROW EXECUTE FUNCTION generate_no_retur();

ALTER TABLE pelanggan ENABLE ROW LEVEL SECURITY;
ALTER TABLE penjualan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_pelanggan" ON pelanggan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_penjualan" ON penjualan  FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER trigger_pelanggan_updated_at
  BEFORE UPDATE ON pelanggan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trigger_penjualan_updated_at
  BEFORE UPDATE ON penjualan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS jual_sequence START 1;
CREATE OR REPLACE FUNCTION generate_no_penjualan()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.no_transaksi IS NULL THEN
    NEW.no_transaksi := 'JUL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                        LPAD(NEXTVAL('jual_sequence')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_penjualan_no_transaksi
  BEFORE INSERT ON penjualan
  FOR EACH ROW EXECUTE FUNCTION generate_no_penjualan();

-- ============================================================
-- TABEL PRICING
-- ============================================================

-- Pricing Matrix (Harga Jual per Buah)
-- Menyimpan konfigurasi harga jual untuk setiap buah
CREATE TABLE IF NOT EXISTS pricing (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buah_id               UUID NOT NULL REFERENCES buah(id) ON DELETE CASCADE UNIQUE,
  harga_mentok_pasar    DECIMAL(15,2),     -- Harga maksimal pasar (referensi)
  harga_jual_dapur      DECIMAL(15,2),     -- Harga jual ke Kitchen/Dapur
  harga_jual_supplier   DECIMAL(15,2),     -- Harga jual ke Sub-Suplier
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID               -- Future: FK ke tabel users (auth)
);

-- ============================================================
-- VIEWS (Kalkulasi Agregasi untuk Dashboard)
-- ============================================================

-- View: HPP Terbaru per Buah (ambil dari pembelian paling akhir)
CREATE OR REPLACE VIEW v_latest_hpp AS
SELECT DISTINCT ON (p.buah_id)
  p.buah_id,
  b.nama AS nama_buah,
  b.kode AS kode_buah,
  p.hpp_per_kg,
  p.net_yield,
  p.musim,
  p.tanggal AS tanggal_pembelian,
  p.id AS pembelian_id
FROM pembelian p
JOIN buah b ON b.id = p.buah_id
WHERE p.hpp_per_kg IS NOT NULL
ORDER BY p.buah_id, p.tanggal DESC, p.created_at DESC;

-- View: Pricing Matrix Lengkap (untuk halaman /pricing)
CREATE OR REPLACE VIEW v_pricing_matrix AS
SELECT
  b.id AS buah_id,
  b.nama AS nama_buah,
  b.kode AS kode_buah,
  b.is_active,
  lh.hpp_per_kg AS hpp_asli_per_kg,
  lh.tanggal_pembelian,
  lh.musim AS musim_hpp,
  pr.harga_mentok_pasar,
  pr.harga_jual_dapur,
  pr.harga_jual_supplier,
  -- Margin kalkulasi
  CASE WHEN pr.harga_jual_dapur IS NOT NULL AND lh.hpp_per_kg IS NOT NULL
    THEN pr.harga_jual_dapur - lh.hpp_per_kg
    ELSE NULL
  END AS margin_dapur,
  CASE WHEN pr.harga_jual_supplier IS NOT NULL AND lh.hpp_per_kg IS NOT NULL
    THEN pr.harga_jual_supplier - lh.hpp_per_kg
    ELSE NULL
  END AS margin_supplier,
  -- Status validasi harga
  CASE
    WHEN pr.harga_jual_supplier IS NOT NULL AND lh.hpp_per_kg IS NOT NULL 
         AND pr.harga_jual_supplier < lh.hpp_per_kg THEN 'merah'        -- Jual di bawah HPP
    WHEN pr.harga_jual_supplier IS NOT NULL AND pr.harga_jual_dapur IS NOT NULL 
         AND pr.harga_jual_supplier > pr.harga_jual_dapur THEN 'kuning' -- Suplier > Dapur (invalid)
    ELSE 'normal'
  END AS status_harga,
  pr.updated_at AS pricing_updated_at
FROM buah b
LEFT JOIN v_latest_hpp lh ON lh.buah_id = b.id
LEFT JOIN pricing pr ON pr.buah_id = b.id
WHERE b.is_active = TRUE;

-- View: Stok Tersedia per Buah (produk grade baik)
-- kg masuk = Σ kg_baik dari hasil_sortir
-- kg keluar = Σ jumlah_kg dari penjualan tipe 'normal'
CREATE OR REPLACE VIEW v_stok_tersedia AS
SELECT
  b.id AS buah_id,
  b.nama AS nama_buah,
  b.kode AS kode_buah,
  COALESCE(masuk.total_kg_baik, 0)    AS total_kg_masuk,
  COALESCE(keluar.total_kg_jual, 0)   AS total_kg_keluar,
  COALESCE(masuk.total_kg_baik, 0) - COALESCE(keluar.total_kg_jual, 0) AS stok_tersedia
FROM buah b
LEFT JOIN (
  SELECT p.buah_id, SUM(hs.kg_baik) AS total_kg_baik
  FROM hasil_sortir hs
  JOIN pembelian p ON p.id = hs.pembelian_id
  GROUP BY p.buah_id
) masuk ON masuk.buah_id = b.id
LEFT JOIN (
  SELECT buah_id, SUM(jumlah_kg) AS total_kg_jual
  FROM penjualan
  WHERE tipe_jual = 'normal'
  GROUP BY buah_id
) keluar ON keluar.buah_id = b.id
WHERE b.is_active = TRUE;

-- View: Stok Reject per Buah
CREATE OR REPLACE VIEW v_stok_reject AS
SELECT
  b.id AS buah_id,
  b.nama AS nama_buah,
  b.kode AS kode_buah,
  COALESCE(masuk.total_kg_reject, 0)  AS total_kg_reject_masuk,
  COALESCE(keluar.total_kg_jual, 0)   AS total_kg_reject_keluar,
  COALESCE(masuk.total_kg_reject, 0) - COALESCE(keluar.total_kg_jual, 0) AS stok_reject_tersedia,
  COALESCE(masuk.harga_reject_terakhir, 0) AS harga_reject_per_kg
FROM buah b
LEFT JOIN (
  SELECT p.buah_id,
         SUM(hs.kg_reject) AS total_kg_reject,
         (ARRAY_AGG(hs.harga_jual_reject_per_kg ORDER BY hs.tanggal_sortir DESC))[1] AS harga_reject_terakhir
  FROM hasil_sortir hs
  JOIN pembelian p ON p.id = hs.pembelian_id
  WHERE hs.kg_reject > 0
  GROUP BY p.buah_id
) masuk ON masuk.buah_id = b.id
LEFT JOIN (
  SELECT buah_id, SUM(jumlah_kg) AS total_kg_jual
  FROM penjualan
  WHERE tipe_jual = 'reject'
  GROUP BY buah_id
) keluar ON keluar.buah_id = b.id
WHERE b.is_active = TRUE;

-- ============================================================
-- INDEXES (Optimasi Query)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pembelian_buah_id ON pembelian(buah_id);
CREATE INDEX IF NOT EXISTS idx_pembelian_pemasok_id ON pembelian(pemasok_id);
CREATE INDEX IF NOT EXISTS idx_pembelian_tanggal ON pembelian(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_pembelian_buah_tanggal ON pembelian(buah_id, tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_buah_id ON pricing(buah_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Fungsi: Auto-update timestamp 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Terapkan trigger updated_at ke semua tabel utama
CREATE OR REPLACE TRIGGER trigger_buah_updated_at
  BEFORE UPDATE ON buah
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trigger_pemasok_updated_at
  BEFORE UPDATE ON pemasok
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trigger_pembelian_updated_at
  BEFORE UPDATE ON pembelian
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fungsi: Generate nomor transaksi otomatis
CREATE OR REPLACE FUNCTION generate_no_transaksi()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.no_transaksi IS NULL THEN
    NEW.no_transaksi := 'TRX-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                        LPAD(NEXTVAL('trx_sequence')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence untuk nomor transaksi
CREATE SEQUENCE IF NOT EXISTS trx_sequence START 1;

CREATE OR REPLACE TRIGGER trigger_pembelian_no_transaksi
  BEFORE INSERT ON pembelian
  FOR EACH ROW EXECUTE FUNCTION generate_no_transaksi();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Kerangka untuk Auth di Masa Depan
-- ============================================================
-- Aktifkan RLS tapi biarkan semua akses untuk saat ini (tanpa auth)
-- Nanti, saat auth sudah aktif, ubah policy ini

ALTER TABLE buah     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pemasok  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembelian ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing  ENABLE ROW LEVEL SECURITY;

-- Policy sementara: izinkan semua akses (anon & authenticated)
-- TODO: Ganti dengan policy berbasis user saat fitur auth diaktifkan
CREATE POLICY "allow_all_buah"      ON buah      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pemasok"   ON pemasok   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pembelian" ON pembelian  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pricing"   ON pricing   FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DATA SEED (Contoh Data Awal)
-- ============================================================

INSERT INTO buah (kode, nama, berat_peti_kemarau, pct_afkir_kemarau, berat_peti_hujan, pct_afkir_hujan) VALUES
  ('APL-01', 'Apel Fuji Import',    5.0, 3.0,  5.5, 7.0),
  ('JRK-01', 'Jeruk Medan',         4.5, 5.0,  5.0, 10.0),
  ('ANK-01', 'Anggur Red Globe',    3.0, 8.0,  3.5, 12.0),
  ('MNG-01', 'Mangga Harum Manis',  6.0, 6.0,  7.0, 15.0),
  ('MSM-01', 'Semangka Non-Biji',   8.0, 4.0,  9.0, 8.0)
ON CONFLICT (kode) DO NOTHING;

INSERT INTO pemasok (kode, nama, kontak_nama, kontak_telepon, kota) VALUES
  ('SUP-01', 'CV. Buah Segar Nusantara', 'Pak Budi',    '0812-1111-2222', 'Jakarta'),
  ('SUP-02', 'UD. Mitra Agro',           'Pak Santoso', '0813-3333-4444', 'Bandung'),
  ('SUP-03', 'PT. Fresh Fruit Indo',     'Bu Rina',     '0811-5555-6666', 'Surabaya')
ON CONFLICT (kode) DO NOTHING;
