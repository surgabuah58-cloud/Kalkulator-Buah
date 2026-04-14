# Surga Buah — Halaman & Fitur

Semua halaman ada di `app/` menggunakan Next.js App Router.
Semua halaman adalah `'use client'` (no server components digunakan).

---

## Sidebar Navigation (`components/layout/AppSidebar.tsx`)

6 seksi:

| Seksi | Halaman |
|-------|---------|
| _(no title)_ | Dashboard `/` |
| Master Data | Master Buah `/master-buah`, Master Pemasok `/master-pemasok`, Master Pelanggan `/master-pelanggan` |
| Transaksi | Input Pembelian `/input-pembelian`, Input Penjualan `/input-penjualan`, Input Sortir `/input-sortir`, Retur Pemasok `/retur-pemasok` |
| Riwayat | Jurnal Pembelian `/jurnal-pembelian`, Jurnal Penjualan `/jurnal-penjualan` |
| Analitik | Kalkulator HPP `/kalkulator`, Pricing Matrix `/pricing` |
| Sistem | Pengaturan `/pengaturan` |

---

## Layout & Global Components

### `components/layout/LayoutShell.tsx`
- Wrapper dengan `AppSidebar` + `AppHeader`
- Mobile: sidebar toggle + backdrop overlay

### `components/layout/AppHeader.tsx`
- Top bar dengan burger menu (mobile), judul halaman, `SeasonToggle`

### `components/layout/SeasonToggle.tsx`
- Toggle global musim: Kemarau ☀️ / Hujan 🌧
- State via `context/season-context.tsx`

---

## Halaman — Detail Fitur

### `/` — Dashboard (`app/page.tsx`)
- Summary cards: total pembelian, total penjualan, HPP terbaru per buah
- Status deployed ✅

### `/master-buah` (`app/master-buah/page.tsx`)
- CRUD buah: tambah, edit inline, hapus dengan konfirmasi
- Parameter musiman (berat peti, % afkir) per musim kemarau/hujan
- Field `berat_per_pcs_gram` (opsional, untuk konversi spare pcs→kg)
- Status deployed ✅

### `/master-pemasok` (`app/master-pemasok/page.tsx`)
- CRUD pemasok
- Kategori: Tangan 1/2/3
- Status deployed ✅

### `/master-pelanggan` (`app/master-pelanggan/page.tsx`)
- CRUD pelanggan
- Tipe: sub_supplier / dapur_mbg / retail
- Status deployed ✅

### `/input-pembelian` (`app/input-pembelian/page.tsx`)
- Form pembelian buah dari pemasok
- Select musim (dari `useContext(SeasonContext)`) — otomatis ambil berat_peti & pct_afkir
- Input: jumlah_peti (DECIMAL), harga_beli_per_peti, berat_bruto_total, biaya_transport, biaya_regu_sortir, nilai_recovery_afkir
- **Live kalkulasi** real-time di preview panel kanan:
  - landed_cost, berat_afkir, net_yield, biaya_kuli_sortir_per_kg, **HPP per kg**
- Submit menyimpan semua snapshot kalkulasi ke DB
- Status deployed ✅

### `/input-penjualan` (`app/input-penjualan/page.tsx`)
- Form penjualan buah ke pelanggan
- Select buah, pelanggan
- Input jumlah_kg, harga_jual_per_kg
- **Tipe Jual toggle**: Normal / Reject (local state `tipeJual`, disimpan ke `tipe_jual`)
- **Spare/Buffer** (local state, 3 mode):
  - `% Persen` — input % langsung
  - `kg` — input kg, auto-hitung persen
  - `pcs` — input jumlah buah, konversi via `berat_per_pcs_gram`
  - `step="any"` + plain string state (bukan RHF valueAsNumber) agar desimal bebas
- **Live preview** panel kanan:
  - HPP/kg (dari `v_latest_hpp`)
  - Buffer %, spareKg, totalStok
  - HPP Efektif/kg (hpp * totalStok / jumlah) — tampil amber saat spare > 0
  - Biaya Buffer, Margin Nominal, Margin Efektif/kg, Total Margin Efektif, %
  - Status badge (hijau/merah) berdasarkan `marginEfektif` jika ada spare
- Submit menyimpan: `spare_pct`, `tipe_jual`, `hpp_snapshot`
- Status deployed ✅

### `/input-sortir` (`app/input-sortir/page.tsx`) ← BARU
- Form input hasil sortir fisik per batch pembelian
- Dropdown pilih batch pembelian (dengan nama buah + no_transaksi + tanggal)
- Tampilkan info batch: buah, pemasok, berat_bruto, net_yield estimasi, HPP/kg
- Input: kg_baik, kg_reject, kg_busuk (semua step="any")
  - Warna border: hijau/amber/merah per kolom
- Input: harga_jual_reject_per_kg (opsional)
- **Validasi real-time**: bandingkan total sortir vs berat_bruto
  - ⚠️ merah jika melebihi, amber jika kurang (susut), hijau jika sesuai
- **Live breakdown preview** kanan:
  - Progress bar tiga warna (baik/reject/busuk)
  - Persentase masing-masing kategori
  - Estimasi pendapatan reject (kg_reject × harga_reject)
  - Badge "X kg yield baik"
- Submit → insert ke `hasil_sortir`
- Status deployed ✅

### `/retur-pemasok` (`app/retur-pemasok/page.tsx`) ← BARU
- Form retur buah ke pemasok
- Dropdown pilih batch pembelian
- Input: kg_diretur, harga_kredit_per_kg, alasan, catatan
- Preview total_kredit (kg × harga) real-time
- Info panel kanan: penjelasan konsep kredit & dampak HPP
- **Riwayat retur** di bawah form (table dengan hapus per baris)
  - Kolom: tanggal, no_retur, buah/batch, kg diretur, harga kredit/kg, total kredit, alasan, hapus
- Delete dialog konfirmasi
- Status deployed ✅

### `/jurnal-pembelian` (`app/jurnal-pembelian/page.tsx`)
- Riwayat transaksi pembelian
- Filter: tanggal dari-sampai, search nama buah
- Summary pills: jumlah transaksi, total kg, total nilai beli, total HPP
- Table: tanggal, no_transaksi, buah, pemasok, musim badge, jml kemasan, net yield, HPP/kg, total beli, hapus
- Delete per baris dengan dialog konfirmasi
- Status deployed ✅

### `/jurnal-penjualan` (`app/jurnal-penjualan/page.tsx`)
- Riwayat transaksi penjualan
- Filter: tanggal dari-sampai, search nama buah
- Summary pills: jumlah transaksi, total kg, total nilai jual, total margin
- Table: tanggal, no_transaksi, buah, pelanggan+tipe, kg, harga/kg, total nilai, margin/kg (colored), **Tipe** (Normal/Reject badge), buffer%, hapus
- Delete per baris dengan dialog konfirmasi
- Status deployed ✅

### `/kalkulator` (`app/kalkulator/page.tsx`)
- Kalkulator HPP standalone (tanpa simpan ke DB)
- Input parameter manual musim + biaya
- Live kalkulasi HPP
- Status deployed ✅

### `/pricing` (`app/pricing/page.tsx`)
- Pricing Matrix dari `v_pricing_matrix`
- Tampilkan HPP per buah + harga jual (dapur, supplier)
- Margin kalkulasi + status badge (normal/merah/kuning)
- Edit harga inline, simpan ke `pricing` table
- Status deployed ✅

### `/pengaturan` (`app/pengaturan/page.tsx`)
- Stats card: total pembelian, total penjualan
- **Hapus per rentang tanggal**: pilih scope (pembelian/penjualan), pick tanggal, "Cek Jumlah" → tampilkan count → ketik "HAPUS" → konfirmasi
- **Danger zone**: hapus semua data dengan ketik "HAPUS"
- Status deployed ✅

---

## Library Kalkulator (`lib/calculations/hpp.ts`)

```typescript
calculateHpp(params): { landedCost, beratAfkir, netYield, biayaKuliSortir, hppPerKg }
formatRupiahFull(value): string   // Rp 1.234.567
formatKg(value): string           // 123,45 kg
formatPersen(value): string       // 12,34%
```
