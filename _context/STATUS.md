# Surga Buah — Status Pengembangan

> Update terakhir: April 2026
> Last commit: `fdeb264` — feat: modul keuangan - kas_masuk, kas_keluar, laporan-cashflow + sidebar Keuangan

---

## ✅ Sudah Selesai & Deployed

| Fitur | Commit | Catatan |
|-------|--------|---------|
| Master Buah (CRUD) | awal | — |
| Master Pemasok (CRUD) | awal | — |
| Master Pelanggan (CRUD) | awal | — |
| Input Pembelian + live HPP kalkulator | awal | — |
| Kalkulator HPP standalone | awal | — |
| Pricing Matrix | awal | — |
| Dashboard | awal | — |
| Spare buffer: decimal, mode toggle (%, kg, pcs), HPP efektif | `5ea63e3` | — |
| Jurnal Pembelian (riwayat + hapus per baris) | `5403f2d` | — |
| Jurnal Penjualan (riwayat + hapus per baris) | `5403f2d` | — |
| Pengaturan (hapus per rentang tanggal + hapus semua) | `5403f2d` | — |
| AppSidebar 6 seksi bernama | `5403f2d` | — |
| schema.sql: hasil_sortir, retur_pemasok, tipe_jual, stok views | `5403f2d` | Perlu dijalankan di Supabase |
| types/database.types.ts: semua tipe baru | `5403f2d` | — |
| Input Sortir (halaman baru) | `a735b1c` | — |
| Retur Pemasok (halaman baru) | `a735b1c` | — |
| Input Penjualan: tambah tipe_jual toggle | `a735b1c` | — |
| Sidebar: Input Sortir + Retur Pemasok | `a735b1c` | — |
| Jurnal Penjualan: kolom Tipe (Normal/Reject badge) | `a735b1c` | — |
| schema.sql: fix idempotent (ADD COLUMN IF NOT EXISTS + DO $$ guards) | `a735b1c` | — |
| Kas Masuk (halaman baru: input modal & pemasukan non-buah) | `fdeb264` | — |
| Kas Keluar (halaman baru: input pengeluaran operasional) | `fdeb264` | — |
| Laporan Cashflow (dashboard cashflow + indikator kesehatan usaha) | `fdeb264` | — |
| Sidebar: seksi Keuangan (Kas Masuk, Kas Keluar, Laporan Cashflow) | `fdeb264` | — |
| schema.sql: tabel kas_masuk + kas_keluar | `fdeb264` | Perlu dijalankan di Supabase |

---

## ⚠️ Perlu Aksi Manual

### SQL Migration di Supabase
Jalankan `supabase/schema.sql` penuh di **Supabase SQL Editor**.
Script sudah idempotent — aman dijalankan pada DB yang sudah ada data.

**Ini menambahkan:**
- Kolom `tipe_jual` + `sortir_id` di tabel `penjualan`
- Kolom `spare_pct` di tabel `penjualan` (jika belum ada dari versi sebelumnya)
- Tabel baru: `hasil_sortir`
- Tabel baru: `retur_pemasok`
- View baru: `v_stok_tersedia`, `v_stok_reject`
- FK constraint `fk_penjualan_sortir`

---

## 🔲 Backlog / Pengembangan Selanjutnya

### Prioritas Tinggi
- [ ] **Dashboard stok real-time** — tampilkan data dari `v_stok_tersedia` dan `v_stok_reject`
  - Cards per buah: stok baik tersedia, stok reject tersedia
  - Warning jika stok di bawah threshold
- [ ] **Jurnal Sortir** — riwayat semua hasil_sortir dengan filter tanggal/buah
  - Mirip jurnal pembelian/penjualan, dengan hapus per baris
- [ ] **Input Penjualan: link ke sortir_id** — optional picker untuk link transaksi penjualan ke batch sortir

### Prioritas Menengah
- [ ] **Laporan / Export** — export CSV jurnal pembelian/penjualan
- [ ] **Dashboard Keuangan** — total kredit dari retur pemasok per periode
- [ ] **Grafik trend HPP** — line chart HPP per buah per waktu
- [ ] **Alert stok menipis** — notifikasi jika `stok_tersedia < threshold`

### Prioritas Rendah / Future
- [ ] **Auth / multi-user** — Supabase Auth, RLS berbasis user
- [ ] **Batch sortir tanda selesai** — flag `pembelian` yang sudah disortir
- [ ] **Mobile-optimized input sortir** — untuk digunakan langsung di gudang

---

## Bug & Masalah yang Pernah Terjadi

| Masalah | Solusi |
|---------|--------|
| `step="0.5"` memblokir desimal bebas (1.18) | Ganti ke `step="any"` + plain string state, bukan RHF `valueAsNumber` |
| `z.optional().default()` merusak RHF resolver type inference | Jangan kombinasikan; pakai `.default()` saja atau atur di `useForm defaultValues` |
| HPP efektif tidak merefleksikan biaya buffer | Hitung `hppEfektif = hpp * (totalStok / jumlah)`, `marginEfektif = hargaJual - hppEfektif` |
| `CREATE TABLE IF NOT EXISTS` no-op → `sortir_id` tidak ada → FK error | Tambahkan `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` terpisah |
| `CREATE POLICY` error jika policy sudah ada | Wrap dalam `DO $$ IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE ...) $$` |
| `SelectContent` tidak muncul di posisi benar | Pakai `alignItemWithTrigger={false}` bukan `position="popper"` (Base UI ≠ Radix) |

---

## Arsitektur Keputusan

| Keputusan | Alasan |
|-----------|--------|
| Simpan `hpp_snapshot` di `penjualan` | HPP bisa berubah tiap pembelian; snapshot menjaga audit trail |
| `total_nilai` & `margin_per_kg` sebagai GENERATED ALWAYS | Konsistensi kalkulasi, tidak bisa dimanipulasi dari aplikasi |
| `tipe_jual` di `penjualan` (bukan tabel terpisah) | Simplisitas; filter cukup dengan WHERE clause |
| `total_kredit` GENERATED di `retur_pemasok` | Mencegah human error, selalu konsisten |
| Stok tidak dikurangkan otomatis saat pembelian | Stok riil = hasil sortir (bukan estimate dari pembelian) |
| `spare_pct` disimpan sebagai % (bukan kg) | Mode-agnostic; kg dan pcs dikonversi ke % sebelum simpan |
