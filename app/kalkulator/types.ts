// ============================================================
// TIPE DATA KALKULATOR MULTI-ITEM
// ============================================================

export const SATUAN_OPTIONS = [
  { value: 'peti',    label: 'Peti' },
  { value: 'krat',    label: 'Krat' },
  { value: 'dus',     label: 'Dus' },
  { value: 'karung',  label: 'Karung' },
  { value: 'pcs',     label: 'Pcs / Buah' },
  { value: 'lainnya', label: 'Lainnya' },
]

// State satu baris item buah
export interface ItemBuah {
  id: string
  nama: string
  satuan: string
  // Parameter kemasan
  berat_tara_kemasan: string
  pct_afkir: string
  // Fisik
  jumlah_kemasan: string
  berat_bruto_per_kemasan: string
  // Biaya — mode
  mode_harga_beli: 'per_kemasan' | 'per_kg_netto'
  harga_beli_per_kemasan: string
  harga_beli_per_kg_netto: string
  biaya_sortir: string
  nilai_recovery_afkir: string
  // Distribusi ukuran L/M/S
  aktif_distribusi: boolean
  dist_l_gram: string   // berat rata-rata buah BESAR (gram)
  dist_m_gram: string   // berat rata-rata buah SEDANG (gram)
  dist_s_gram: string   // berat rata-rata buah KECIL (gram)
  dist_l_pct: string    // proporsi buah BESAR (%)
  dist_m_pct: string    // proporsi buah SEDANG (%)
  dist_s_pct: string    // proporsi buah KECIL (%)
}

export function createItem(id: string): ItemBuah {
  return {
    id,
    nama: '',
    satuan: 'peti',
    berat_tara_kemasan: '',
    pct_afkir: '',
    jumlah_kemasan: '1',
    berat_bruto_per_kemasan: '',
    mode_harga_beli: 'per_kemasan',
    harga_beli_per_kemasan: '',
    harga_beli_per_kg_netto: '',
    biaya_sortir: '',
    nilai_recovery_afkir: '',
    aktif_distribusi: false,
    dist_l_gram: '',
    dist_m_gram: '',
    dist_s_gram: '',
    dist_l_pct: '33',
    dist_m_pct: '34',
    dist_s_pct: '33',
  }
}

// State biaya bersama (transport borongan 1 trip untuk semua item)
export interface BiayaBersama {
  biaya_transport_borongan: string
}

export const DEFAULT_BIAYA_BERSAMA: BiayaBersama = {
  biaya_transport_borongan: '',
}

// Hasil kalkulasi distribusi ukuran
export interface HasilDistribusi {
  beratRataGram: number          // berat rata-rata tertimbang (gram)
  estimasiPcsPerKemasan: number  // estimasi jumlah buah per kemasan
  estimasiTotalPcs: number       // total semua kemasan
  estimasiPcsL: number
  estimasiPcsM: number
  estimasiPcsS: number
  hppPerPcsL: number | null
  hppPerPcsM: number | null
  hppPerPcsS: number | null
}
