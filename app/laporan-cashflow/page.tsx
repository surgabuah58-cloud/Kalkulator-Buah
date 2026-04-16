'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatRupiahFull } from '@/lib/calculations/hpp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BarChart2, Loader2, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Kategori labels ──────────────────────────────────────────
const KM_LABEL: Record<string, string> = {
  modal_awal: 'Modal Awal', injeksi_modal: 'Injeksi Modal',
  pinjaman: 'Pinjaman', lainnya: 'Lainnya',
}
const KK_LABEL: Record<string, string> = {
  sewa: 'Sewa', listrik_air: 'Listrik & Air', gaji: 'Gaji / Upah',
  alat: 'Alat & Peralatan', barang_habis: 'Barang Habis Pakai',
  transport_ops: 'Transport Ops', lainnya: 'Lainnya',
}

// ── Types ────────────────────────────────────────────────────
type PenjualanItem = { tanggal: string; total_nilai: number; jumlah_kg: number; margin_per_kg: number | null; tipe_jual: string }
type ReturItem     = { tanggal: string; total_kredit: number }
type PembelianItem = { tanggal: string; jumlah_peti: number; harga_beli_per_peti: number; biaya_transport_per_peti: number; total_biaya_regu_sortir: number; nilai_recovery_afkir: number }
type KasItem       = { tanggal: string; kategori: string; jumlah: number; deskripsi: string }

type CashflowData = {
  penjualan: PenjualanItem[]
  retur:     ReturItem[]
  pembelian: PembelianItem[]
  kasMasuk:  KasItem[]
  kasKeluar: KasItem[]
}

// ── Helper ───────────────────────────────────────────────────
function nowDate() { return new Date().toISOString().split('T')[0] }
function firstDayOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
}

function LineRow({ label, value, indent = false, bold = false, muted = false, negative = false }:
  { label: string; value: number; indent?: boolean; bold?: boolean; muted?: boolean; negative?: boolean }) {
  if (value === 0 && !bold) return null
  return (
    <div className={cn('flex justify-between items-center text-sm py-1', indent && 'pl-4', bold && 'font-semibold border-t mt-1 pt-2')}>
      <span className={cn(muted && 'text-muted-foreground', indent && 'text-muted-foreground text-xs')}>{label}</span>
      <span className={cn(negative ? 'text-green-600' : '', bold && (value >= 0 ? 'text-primary' : 'text-destructive'))}>
        {negative ? `(${formatRupiahFull(value)})` : formatRupiahFull(value)}
      </span>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────
export default function LaporanCashflowPage() {
  const supabase = createClient()

  const [filterFrom, setFilterFrom] = useState(firstDayOfMonth())
  const [filterTo,   setFilterTo]   = useState(nowDate())
  const [data,       setData]       = useState<CashflowData | null>(null)
  const [isLoading,  setIsLoading]  = useState(false)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    const [penjRes, returRes, beliRes, kmRes, kkRes] = await Promise.all([
      supabase.from('penjualan').select('tanggal, total_nilai, jumlah_kg, margin_per_kg, tipe_jual')
        .gte('tanggal', filterFrom).lte('tanggal', filterTo),
      supabase.from('retur_pemasok').select('tanggal, total_kredit')
        .gte('tanggal', filterFrom).lte('tanggal', filterTo),
      supabase.from('pembelian').select('tanggal, jumlah_peti, harga_beli_per_peti, biaya_transport_per_peti, total_biaya_regu_sortir, nilai_recovery_afkir')
        .gte('tanggal', filterFrom).lte('tanggal', filterTo),
      supabase.from('kas_masuk').select('tanggal, kategori, jumlah, deskripsi')
        .gte('tanggal', filterFrom).lte('tanggal', filterTo),
      supabase.from('kas_keluar').select('tanggal, kategori, jumlah, deskripsi')
        .gte('tanggal', filterFrom).lte('tanggal', filterTo),
    ])

    const anyError = [penjRes, returRes, beliRes, kmRes, kkRes].find(r => r.error)
    if (anyError?.error) {
      console.error('Fetch error:', anyError.error.message)
    }

    setData({
      penjualan: (penjRes.data ?? []) as PenjualanItem[],
      retur:     (returRes.data ?? []) as ReturItem[],
      pembelian: (beliRes.data ?? []) as PembelianItem[],
      kasMasuk:  (kmRes.data ?? []) as KasItem[],
      kasKeluar: (kkRes.data ?? []) as KasItem[],
    })
    setIsLoading(false)
  }, [filterFrom, filterTo])

  // ── Calculations ─────────────────────────────────────────────
  const calc = data ? (() => {
    const penjNormal  = data.penjualan.filter(r => r.tipe_jual === 'normal').reduce((s, r) => s + r.total_nilai, 0)
    const penjReject  = data.penjualan.filter(r => r.tipe_jual === 'reject').reduce((s, r) => s + r.total_nilai, 0)
    const totalPenj   = penjNormal + penjReject

    const totalRetur  = data.retur.reduce((s, r) => s + r.total_kredit, 0)

    const kmByKat = Object.keys(KM_LABEL).reduce((acc, k) => {
      acc[k] = data.kasMasuk.filter(r => r.kategori === k).reduce((s, r) => s + r.jumlah, 0)
      return acc
    }, {} as Record<string, number>)
    const totalKM = data.kasMasuk.reduce((s, r) => s + r.jumlah, 0)
    const totalMasuk = totalPenj + totalRetur + totalKM

    // Pembelian buah: harga beli + transport - recovery (regu sortir sudah masuk landed_cost)
    const hargaBeli   = data.pembelian.reduce((s, p) => s + p.harga_beli_per_peti * p.jumlah_peti, 0)
    const biayaTrans  = data.pembelian.reduce((s, p) => s + p.biaya_transport_per_peti * p.jumlah_peti, 0)
    const biayaSortir = data.pembelian.reduce((s, p) => s + p.total_biaya_regu_sortir, 0)
    const recovery    = data.pembelian.reduce((s, p) => s + p.nilai_recovery_afkir, 0)
    const totalBeli   = hargaBeli + biayaTrans + biayaSortir - recovery

    const kkByKat = Object.keys(KK_LABEL).reduce((acc, k) => {
      acc[k] = data.kasKeluar.filter(r => r.kategori === k).reduce((s, r) => s + r.jumlah, 0)
      return acc
    }, {} as Record<string, number>)
    const totalKK     = data.kasKeluar.reduce((s, r) => s + r.jumlah, 0)
    const totalKeluar = totalBeli + totalKK
    const saldo       = totalMasuk - totalKeluar

    // Indicators
    const totalMargin = data.penjualan.reduce((s, r) =>
      s + (r.margin_per_kg != null ? r.margin_per_kg * r.jumlah_kg : 0), 0)
    const marginPct   = totalPenj > 0 ? (totalMargin / totalPenj) * 100 : null
    const bebanPct    = totalPenj > 0 ? (totalKK / totalPenj) * 100 : null
    const netPct      = totalMasuk > 0 ? (saldo / totalMasuk) * 100 : null

    return {
      penjNormal, penjReject, totalPenj,
      totalRetur, kmByKat, totalKM, totalMasuk,
      hargaBeli, biayaTrans, biayaSortir, recovery, totalBeli,
      kkByKat, totalKK, totalKeluar,
      saldo, marginPct, bebanPct, netPct,
    }
  })() : null

  // ── Period label ──────────────────────────────────────────────
  const periodLabel = (() => {
    const f = new Date(filterFrom + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    const t = new Date(filterTo   + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    return `${f} — ${t}`
  })()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          Laporan Cashflow
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Alur kas masuk & keluar beserta indikator kesehatan usaha per periode
        </p>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Dari Tanggal</Label>
              <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sampai Tanggal</Label>
              <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="w-40" />
            </div>
            <Button onClick={fetchAll} disabled={isLoading} className="gap-1.5">
              {isLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Search className="h-3.5 w-3.5" />
              }
              Tampilkan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* No data state */}
      {!data && !isLoading && (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          Klik <strong>Tampilkan</strong> untuk memuat laporan periode ini
        </div>
      )}

      {/* Results */}
      {data && calc && (
        <>
          <p className="text-xs text-muted-foreground -mt-2">Periode: {periodLabel}</p>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Total Masuk</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400 mt-0.5">
                  {formatRupiahFull(calc.totalMasuk)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Total Keluar</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-400 mt-0.5">
                  {formatRupiahFull(calc.totalKeluar)}
                </p>
              </CardContent>
            </Card>
            <Card className={cn(
              'border-2',
              calc.saldo > 0  && 'border-green-400 bg-green-50/50 dark:bg-green-950/20',
              calc.saldo < 0  && 'border-red-400 bg-red-50/50 dark:bg-red-950/20',
              calc.saldo === 0 && 'border-gray-300',
            )}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Saldo Bersih</p>
                <p className={cn(
                  'text-xl font-bold mt-0.5',
                  calc.saldo > 0  && 'text-green-700 dark:text-green-400',
                  calc.saldo < 0  && 'text-red-700 dark:text-red-400',
                  calc.saldo === 0 && 'text-muted-foreground',
                )}>
                  {calc.saldo >= 0 ? '+' : ''}{formatRupiahFull(calc.saldo)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Margin Buah</p>
                {calc.marginPct != null ? (
                  <p className={cn(
                    'text-xl font-bold mt-0.5',
                    calc.marginPct > 15 && 'text-green-600',
                    calc.marginPct > 0 && calc.marginPct <= 15 && 'text-amber-600',
                    calc.marginPct <= 0 && 'text-red-600',
                  )}>
                    {calc.marginPct.toFixed(1)}%
                  </p>
                ) : (
                  <p className="text-xl font-bold mt-0.5 text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Columns */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* PEMASUKAN */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Rincian Pemasukan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {/* Penjualan Buah */}
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-1.5">Penjualan Buah</div>
                <LineRow label="Penjualan Normal"       value={calc.penjNormal}  indent />
                <LineRow label="Penjualan Reject"       value={calc.penjReject}  indent />
                <LineRow label="Subtotal Penjualan"     value={calc.totalPenj}   bold />

                {/* Kredit Retur */}
                {calc.totalRetur > 0 && (
                  <>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-1.5 mt-2">Kredit Retur Pemasok</div>
                    <LineRow label="Total Kredit Diterima"  value={calc.totalRetur}  indent />
                  </>
                )}

                {/* Modal & Lainnya */}
                {calc.totalKM > 0 && (
                  <>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-1.5 mt-2">Modal & Dana Masuk</div>
                    {Object.entries(KM_LABEL).map(([k, lbl]) =>
                      calc.kmByKat[k] > 0
                        ? <LineRow key={k} label={lbl} value={calc.kmByKat[k]} indent />
                        : null
                    )}
                  </>
                )}

                <Separator className="my-3" />
                <div className="flex justify-between font-bold text-sm py-1">
                  <span>TOTAL PEMASUKAN</span>
                  <span className="text-green-700">{formatRupiahFull(calc.totalMasuk)}</span>
                </div>
              </CardContent>
            </Card>

            {/* PENGELUARAN */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Rincian Pengeluaran
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {/* Pembelian Buah */}
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-1.5">Pembelian Buah</div>
                <LineRow label="Harga Beli Buah"          value={calc.hargaBeli}   indent />
                <LineRow label="Biaya Transport"           value={calc.biayaTrans}  indent />
                <LineRow label="Biaya Regu Sortir"         value={calc.biayaSortir} indent />
                {calc.recovery > 0 && (
                  <LineRow label="(−) Recovery Afkir"      value={calc.recovery}    indent negative />
                )}
                <LineRow label="Subtotal Pembelian Buah"   value={calc.totalBeli}   bold />

                {/* Pengeluaran Operasional */}
                {calc.totalKK > 0 && (
                  <>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-1.5 mt-2">Pengeluaran Operasional</div>
                    {Object.entries(KK_LABEL).map(([k, lbl]) =>
                      calc.kkByKat[k] > 0
                        ? <LineRow key={k} label={lbl} value={calc.kkByKat[k]} indent />
                        : null
                    )}
                    <LineRow label="Subtotal Ops"  value={calc.totalKK} bold />
                  </>
                )}

                <Separator className="my-3" />
                <div className="flex justify-between font-bold text-sm py-1">
                  <span>TOTAL PENGELUARAN</span>
                  <span className="text-red-700">{formatRupiahFull(calc.totalKeluar)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Saldo Bersih */}
          <Card className={cn(
            'border-2',
            calc.saldo > 0  && 'border-green-400',
            calc.saldo < 0  && 'border-red-400',
            calc.saldo === 0 && 'border-gray-300',
          )}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Saldo Bersih Periode</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    calc.saldo > 0  && 'text-green-700',
                    calc.saldo < 0  && 'text-red-700',
                    calc.saldo === 0 && 'text-muted-foreground',
                  )}>
                    {calc.saldo >= 0 ? '+' : ''}{formatRupiahFull(calc.saldo)}
                  </p>
                </div>
                <div className={cn(
                  'rounded-full p-3',
                  calc.saldo > 0  && 'bg-green-100 text-green-700',
                  calc.saldo < 0  && 'bg-red-100 text-red-700',
                  calc.saldo === 0 && 'bg-gray-100 text-gray-500',
                )}>
                  {calc.saldo > 0  && <TrendingUp className="h-5 w-5" />}
                  {calc.saldo < 0  && <TrendingDown className="h-5 w-5" />}
                  {calc.saldo === 0 && <Minus className="h-5 w-5" />}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Indikator Usaha */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" />
                Indikator Kesehatan Usaha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                {/* Status */}
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-2">Status Periode</p>
                  {calc.saldo > 0 ? (
                    <Badge className="bg-green-100 text-green-700 border-green-300 text-sm px-3 py-1">UNTUNG</Badge>
                  ) : calc.saldo < 0 ? (
                    <Badge className="bg-red-100 text-red-700 border-red-300 text-sm px-3 py-1">RUGI</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-600 border-gray-300 text-sm px-3 py-1">IMPAS</Badge>
                  )}
                </div>

                {/* Margin Buah */}
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Margin Usaha Buah</p>
                  {calc.marginPct != null ? (
                    <>
                      <p className={cn(
                        'text-2xl font-bold',
                        calc.marginPct > 15 && 'text-green-600',
                        calc.marginPct > 0 && calc.marginPct <= 15 && 'text-amber-600',
                        calc.marginPct <= 0 && 'text-red-600',
                      )}>
                        {calc.marginPct.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {calc.marginPct > 15 ? 'Margin sehat' : calc.marginPct > 0 ? 'Margin tipis' : 'Di bawah HPP'}
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-muted-foreground">—</p>
                  )}
                </div>

                {/* Beban Ops */}
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Beban Ops / Omset</p>
                  {calc.bebanPct != null ? (
                    <>
                      <p className={cn(
                        'text-2xl font-bold',
                        calc.bebanPct < 10 && 'text-green-600',
                        calc.bebanPct >= 10 && calc.bebanPct < 25 && 'text-amber-600',
                        calc.bebanPct >= 25 && 'text-red-600',
                      )}>
                        {calc.bebanPct.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {calc.bebanPct < 10 ? 'Efisien' : calc.bebanPct < 25 ? 'Perlu ditekan' : 'Terlalu tinggi'}
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-muted-foreground">—</p>
                  )}
                </div>

                {/* Net Profit Margin */}
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Net Profit Margin</p>
                  {calc.netPct != null ? (
                    <>
                      <p className={cn(
                        'text-2xl font-bold',
                        calc.netPct > 0  && 'text-green-600',
                        calc.netPct <= 0 && 'text-red-600',
                      )}>
                        {calc.netPct.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Saldo / Total Masuk
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-muted-foreground">—</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
