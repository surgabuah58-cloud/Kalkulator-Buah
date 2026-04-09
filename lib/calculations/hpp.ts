/**
 * Kalkulasi HPP (Harga Pokok Penjualan) - Core Business Logic
 * 
 * Semua rumus inti platform ada di file ini.
 * File ini PURE FUNCTIONS — tidak ada side effects, mudah di-test dan diaudit.
 * 
 * ============================================================
 * RUMUS UTAMA:
 * 
 * 1. Landed Cost per Peti
 *    = Harga Beli per Peti + Biaya Transport per Peti
 *
 * 2. Berat Afkir
 *    = Berat Bruto Total × (% Afkir / 100)
 *
 * 3. Net Yield (Berat Bersih Jual)
 *    = Berat Bruto Total 
 *      - (Asumsi Berat Peti × Jumlah Peti)  ← tergantung musim
 *      - Berat Afkir
 *
 * 4. Total Landed Cost
 *    = Landed Cost per Peti × Jumlah Peti
 *
 * 5. Biaya Kuli Sortir per Kg
 *    = Total Biaya Regu Sortir / Net Yield
 *
 * 6. True HPP per Kg
 *    = ((Total Landed Cost - Nilai Recovery Afkir) / Net Yield)
 *      + Biaya Kuli Sortir per Kg
 * ============================================================
 */

import type { Musim } from '@/types/database.types'

// ============================================================
// INPUT TYPES
// ============================================================

export interface HppInputParams {
  // Dari form input pembelian
  jumlahPeti: number
  hargaBeliPerPeti: number
  beratBrutoTotal: number          // kg
  biayaTransportPerPeti: number
  totalBiayaReguSortir: number
  nilaiRecoveryAfkir: number

  // Dari master buah (berdasarkan musim aktif)
  beratPetiMusim: number           // kg berat peti (kemarau/hujan)
  pctAfkirMusim: number            // % afkir (kemarau/hujan)
}

export interface HppResult {
  // Intermediate values (untuk preview card)
  landedCostPerPeti: number        // Rp per peti
  totalLandedCost: number          // Rp total
  beratAfkir: number               // kg
  beratPetiTotal: number           // kg total berat peti kosong
  netYield: number                 // kg bersih yang bisa dijual
  biayaKuliSortirPerKg: number     // Rp/kg

  // FINAL RESULT
  hppPerKg: number                 // Rp/kg — True HPP

  // Validasi
  isValid: boolean
  validationErrors: string[]
}

export interface HppInputForBuah {
  musim: Musim
  beratPetiKemarau: number
  pctAfkirKemarau: number
  beratPetiHujan: number
  pctAfkirHujan: number
}

// ============================================================
// FUNGSI UTAMA
// ============================================================

/**
 * Ambil parameter buah berdasarkan musim aktif
 */
export function getParamsByMusim(buah: HppInputForBuah): {
  beratPetiMusim: number
  pctAfkirMusim: number
} {
  return buah.musim === 'kemarau'
    ? { beratPetiMusim: buah.beratPetiKemarau, pctAfkirMusim: buah.pctAfkirKemarau }
    : { beratPetiMusim: buah.beratPetiHujan,   pctAfkirMusim: buah.pctAfkirHujan }
}

/**
 * Validasi input sebelum kalkulasi
 */
function validateInput(params: HppInputParams): string[] {
  const errors: string[] = []

  if (params.jumlahPeti <= 0)            errors.push('Jumlah peti harus lebih dari 0')
  if (params.hargaBeliPerPeti < 0)       errors.push('Harga beli tidak boleh negatif')
  if (params.beratBrutoTotal <= 0)       errors.push('Berat bruto total harus lebih dari 0')
  if (params.biayaTransportPerPeti < 0)  errors.push('Biaya transport tidak boleh negatif')
  if (params.totalBiayaReguSortir < 0)   errors.push('Biaya regu sortir tidak boleh negatif')
  if (params.nilaiRecoveryAfkir < 0)     errors.push('Nilai recovery tidak boleh negatif')
  if (params.beratPetiMusim < 0)         errors.push('Berat peti tidak valid')
  if (params.pctAfkirMusim < 0 || params.pctAfkirMusim > 100)
    errors.push('% Afkir harus antara 0-100')

  return errors
}

/**
 * Kalkulasi utama HPP per Kg
 * Mengembalikan semua intermediate values untuk transparansi
 */
export function calculateHpp(params: HppInputParams): HppResult {
  const validationErrors = validateInput(params)

  // Langkah 1: Landed Cost per Peti
  const landedCostPerPeti = params.hargaBeliPerPeti + params.biayaTransportPerPeti

  // Langkah 2: Total Landed Cost
  const totalLandedCost = landedCostPerPeti * params.jumlahPeti

  // Langkah 3: Berat Afkir (buah rusak/tidak layak jual)
  const beratAfkir = params.beratBrutoTotal * (params.pctAfkirMusim / 100)

  // Langkah 4: Berat total peti kosong yang harus dikurangi
  const beratPetiTotal = params.beratPetiMusim * params.jumlahPeti

  // Langkah 5: Net Yield = Bruto - Berat Peti - Afkir
  const netYield = params.beratBrutoTotal - beratPetiTotal - beratAfkir

  // Langkah 6: Biaya Kuli Sortir per Kg
  const biayaKuliSortirPerKg = netYield > 0
    ? params.totalBiayaReguSortir / netYield
    : 0

  // Langkah 7: True HPP per Kg
  const hppPerKg = netYield > 0
    ? ((totalLandedCost - params.nilaiRecoveryAfkir) / netYield) + biayaKuliSortirPerKg
    : 0

  // Validasi tambahan hasil kalkulasi
  if (netYield <= 0) {
    validationErrors.push('Net Yield ≤ 0: periksa kembali berat bruto, berat peti, dan % afkir')
  }
  if (hppPerKg < 0) {
    validationErrors.push('HPP negatif: nilai recovery afkir melebihi total landed cost')
  }

  return {
    landedCostPerPeti,
    totalLandedCost,
    beratAfkir,
    beratPetiTotal,
    netYield,
    biayaKuliSortirPerKg,
    hppPerKg,
    isValid: validationErrors.length === 0,
    validationErrors,
  }
}

// ============================================================
// FUNGSI PRICING
// ============================================================

export interface PricingValidation {
  statusDapur: 'ok' | 'warning' | 'error'
  statusSupplier: 'ok' | 'merah' | 'kuning'
  marginDapur: number | null
  marginSupplier: number | null
  pesanDapur: string | null
  pesanSupplier: string | null
}

/**
 * Validasi dan kalkulasi margin untuk Pricing Matrix
 */
export function calculatePricingValidation(
  hppPerKg: number | null,
  hargaJualDapur: number | null,
  hargaJualSupplier: number | null,
  hargaMentokPasar: number | null,
): PricingValidation {
  const marginDapur = hargaJualDapur !== null && hppPerKg !== null
    ? hargaJualDapur - hppPerKg
    : null

  const marginSupplier = hargaJualSupplier !== null && hppPerKg !== null
    ? hargaJualSupplier - hppPerKg
    : null

  // Validasi Supplier
  let statusSupplier: 'ok' | 'merah' | 'kuning' = 'ok'
  let pesanSupplier: string | null = null

  if (hargaJualSupplier !== null && hppPerKg !== null) {
    if (hargaJualSupplier < hppPerKg) {
      statusSupplier = 'merah'
      pesanSupplier = `Rugi Rp ${formatRupiah(hppPerKg - hargaJualSupplier)}/kg di bawah HPP`
    } else if (hargaJualDapur !== null && hargaJualSupplier > hargaJualDapur) {
      statusSupplier = 'kuning'
      pesanSupplier = 'Harga suplier melebihi harga dapur (tidak logis)'
    }
  }

  // Validasi Dapur
  let statusDapur: 'ok' | 'warning' | 'error' = 'ok'
  let pesanDapur: string | null = null

  if (hargaJualDapur !== null && hppPerKg !== null) {
    if (hargaJualDapur < hppPerKg) {
      statusDapur = 'error'
      pesanDapur = 'Harga dapur di bawah HPP'
    } else if (hargaMentokPasar !== null && hargaJualDapur > hargaMentokPasar) {
      statusDapur = 'warning'
      pesanDapur = 'Melampaui harga mentok pasar'
    }
  }

  return {
    statusDapur,
    statusSupplier,
    marginDapur,
    marginSupplier,
    pesanDapur,
    pesanSupplier,
  }
}

// ============================================================
// UTILITY FORMATTERS
// ============================================================

/**
 * Format angka ke format Rupiah (tanpa simbol Rp)
 * Contoh: 15000 → "15.000"
 */
export function formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format angka ke format Rupiah dengan prefix Rp
 * Contoh: 15000 → "Rp 15.000"
 */
export function formatRupiahFull(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `Rp ${formatRupiah(value)}`
}

/**
 * Format kg dengan 2 desimal
 * Contoh: 12.5 → "12,50 kg"
 */
export function formatKg(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${value.toFixed(2)} kg`
}

/**
 * Format persentase
 * Contoh: 5.5 → "5,50%"
 */
export function formatPersen(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${value.toFixed(2)}%`
}

/**
 * Parse string input ke number, return 0 jika invalid
 */
export function parseInputNumber(value: string): number {
  const parsed = parseFloat(value.replace(/[.,]/g, (m) => (m === '.' ? '' : '.')))
  return isNaN(parsed) ? 0 : parsed
}
