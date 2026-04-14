# Surga Buah — Database Schema Reference

> Supabase Project: `sdaufrgkegahyqfzksrh.supabase.co`
> Schema file: `supabase/schema.sql` (idempotent — aman dijalankan ulang pada DB yang sudah ada)

---

## Tabel Master

### `buah`
```
id, kode (UNIQUE), nama, kategori, satuan (default 'peti')
berat_peti_kemarau, pct_afkir_kemarau
berat_peti_hujan, pct_afkir_hujan
berat_per_pcs_gram (nullable) -- untuk konversi pcs→kg di spare buffer
deskripsi, is_active, created_at, updated_at
```

### `pemasok`
```
id, kode (UNIQUE), nama
kategori: 'Tangan 1' | 'Tangan 2' | 'Tangan 3'
kontak_nama, kontak_telepon, alamat, kota, catatan
is_active, created_at, updated_at
```

### `pelanggan`
```
id, kode (UNIQUE), nama
tipe: 'sub_supplier' | 'dapur_mbg' | 'retail'
kontak_nama, kontak_telepon, alamat, kota, catatan
is_active, created_at, updated_at
```

---

## Tabel Transaksi

### `pembelian`
```
id, no_transaksi (UNIQUE, auto: TRX-YYYYMMDD-0001)
tanggal, buah_id FK, pemasok_id FK
musim: 'kemarau' | 'hujan'
jumlah_peti DECIMAL(10,2), harga_beli_per_peti
berat_bruto_total, biaya_transport_per_peti
total_biaya_regu_sortir, nilai_recovery_afkir

-- Kalkulasi tersimpan (snapshot)
snap_berat_peti_used, snap_pct_afkir_used
landed_cost, berat_afkir, net_yield
biaya_kuli_sortir_per_kg, hpp_per_kg

catatan, created_at, updated_at
```
- **Trigger**: `trigger_pembelian_no_transaksi` — auto `no_transaksi`
- **Sequence**: `trx_sequence`

### `penjualan`
```
id, no_transaksi (UNIQUE, auto: JUL-YYYYMMDD-0001)
tanggal, buah_id FK, pelanggan_id FK
jumlah_kg, harga_jual_per_kg
total_nilai GENERATED (jumlah_kg * harga_jual_per_kg)
hpp_snapshot (dari v_latest_hpp saat transaksi)
spare_pct DECIMAL(5,2) DEFAULT 0 CHECK 0-100
margin_per_kg GENERATED (harga_jual - COALESCE(hpp_snapshot,0))
tipe_jual: 'normal' | 'reject' DEFAULT 'normal'
sortir_id UUID FK → hasil_sortir(id) ON DELETE SET NULL (nullable)
catatan, created_at, updated_at
```
- **Trigger**: `trigger_penjualan_no_transaksi` — auto `no_transaksi`
- **Sequence**: `jual_sequence`
- **Kolom tipe_jual + sortir_id**: ditambahkan via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`

### `hasil_sortir`
```
id, no_sortir (UNIQUE, auto: SRT-YYYYMMDD-0001)
pembelian_id FK → pembelian(id)
tanggal_sortir DATE DEFAULT CURRENT_DATE
kg_baik DECIMAL(10,2) DEFAULT 0    -- stok layak jual normal
kg_reject DECIMAL(10,2) DEFAULT 0  -- jual harga reject
kg_busuk DECIMAL(10,2) DEFAULT 0   -- waste, tidak dijual
harga_jual_reject_per_kg DECIMAL(15,2) DEFAULT 0
catatan, created_at, updated_at
```
- **Trigger**: `trigger_hasil_sortir_no_sortir` — auto `no_sortir`
- **Sequence**: `sortir_sequence`

### `retur_pemasok`
```
id, no_retur (UNIQUE, auto: RTR-YYYYMMDD-0001)
pembelian_id FK → pembelian(id)
tanggal DATE DEFAULT CURRENT_DATE
kg_diretur DECIMAL(10,2) CHECK > 0
harga_kredit_per_kg DECIMAL(15,2) DEFAULT 0
total_kredit DECIMAL GENERATED ALWAYS AS (kg_diretur * harga_kredit_per_kg) STORED
alasan TEXT, catatan TEXT
created_at, updated_at
```
- **Trigger**: `trigger_retur_pemasok_no_retur` — auto `no_retur`
- **Sequence**: `retur_sequence`

### `pricing`
```
id, buah_id FK UNIQUE
harga_mentok_pasar, harga_jual_dapur, harga_jual_supplier
updated_at, updated_by UUID (future auth)
```

---

## Views

### `v_latest_hpp`
HPP terbaru per buah dari `pembelian` paling akhir.
```
buah_id, nama_buah, kode_buah, hpp_per_kg, net_yield, musim
tanggal_pembelian, pembelian_id
```
> Digunakan di `input-penjualan` untuk hint HPP saat input harga jual.

### `v_pricing_matrix`
Join `buah + v_latest_hpp + pricing`, dengan kalkulasi margin dan `status_harga: 'normal'|'merah'|'kuning'`.

### `v_stok_tersedia`
```
buah_id, nama_buah, kode_buah
total_kg_masuk    -- Σ kg_baik dari hasil_sortir
total_kg_keluar   -- Σ jumlah_kg penjualan WHERE tipe_jual='normal'
stok_tersedia     -- masuk - keluar
```

### `v_stok_reject`
```
buah_id, nama_buah, kode_buah
total_kg_reject_masuk, total_kg_reject_keluar, stok_reject_tersedia
harga_reject_per_kg  -- dari hasil_sortir terbaru
```

---

## Row Level Security
Semua tabel: RLS enabled + policy `allow_all_*` (allow semua, untuk saat ini tanpa auth).
Policy dibuat dalam `DO $$ IF NOT EXISTS ... $$` agar idempotent.

---

## Convenience Types (types/database.types.ts)
```typescript
BuahRow, BuahInsert, BuahUpdate
PemasokRow, PemasokInsert, PemasokUpdate
PembelianRow, PembelianInsert
PelangganRow, PelangganInsert, PelangganUpdate
PenjualanRow, PenjualanInsert
HasilSortirRow, HasilSortirInsert
ReturPemasokRow, ReturPemasokInsert
PricingRow, PricingUpdate
LatestHppRow, PricingMatrixRow
StokTersediaRow, StokRejectRow
Musim, StatusHarga, TipePelanggan  // union types
```

---

## Catatan Migrasi untuk DB yang Sudah Ada
Jalankan `supabase/schema.sql` **penuh** di Supabase SQL Editor.
Script sudah idempotent:
- `CREATE TABLE IF NOT EXISTS` untuk semua tabel
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` untuk kolom baru di `penjualan`
- `DO $$ IF NOT EXISTS ... $$` untuk semua policy dan FK constraint
- `CREATE OR REPLACE` untuk semua trigger function dan views
- `CREATE SEQUENCE IF NOT EXISTS` untuk semua sequence
