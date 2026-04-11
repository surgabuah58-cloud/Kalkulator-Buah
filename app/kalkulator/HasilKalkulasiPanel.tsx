'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, Calculator, Sun, CloudRain, ChevronDown, ChevronUp } from 'lucide-react'
import { formatRupiahFull, formatKg, formatPersen, type HppResult } from '@/lib/calculations/hpp'
import { cn } from '@/lib/utils'
import type { ItemBuah } from './types'
import { SATUAN_OPTIONS } from './types'

interface HasilSatu {
  item: ItemBuah
  result: HppResult
  hargaBeliPerKemasan: number
  transportPerKemasan: number
  // Distribusi ukuran
  beratRataGram: number
  estimasiPcsPerKemasan: number
  estimasiTotalPcs: number
  pcsL: number; pcsM: number; pcsS: number
  hppPerPcsL: number | null
  hppPerPcsM: number | null
  hppPerPcsS: number | null
}

interface Props {
  hasilList: HasilSatu[]
  isKemarau: boolean
}

export function HasilKalkulasiPanel({ hasilList, isKemarau }: Props) {
  if (hasilList.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Calculator className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">
            Isi data buah di sebelah kiri untuk melihat hasil HPP
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {hasilList.map((h, i) => (
        <HasilSatuCard key={h.item.id} hasil={h} index={i} isKemarau={isKemarau} />
      ))}

      {/* Ringkasan multi-item */}
      {hasilList.length > 1 && (
        <RingkasanMultiItem hasilList={hasilList} />
      )}
    </div>
  )
}

// ── Kartu hasil 1 item ──
function HasilSatuCard({ hasil, index, isKemarau }: { hasil: HasilSatu; index: number; isKemarau: boolean }) {
  const { item, result } = hasil
  const satuanLabel = SATUAN_OPTIONS.find(s => s.value === item.satuan)?.label ?? 'Peti'
  const valid = result.isValid && result.netYield > 0

  return (
    <Card className={cn('border-2', valid ? 'border-green-300' : 'border-red-300')}>
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className={cn(
              'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white',
              valid ? 'bg-green-500' : 'bg-red-500'
            )}>{index + 1}</span>
            {item.nama || `Buah #${index + 1}`}
          </span>
          <Badge variant="outline" className={cn(
            'text-[10px]',
            isKemarau ? 'border-amber-300 text-amber-700' : 'border-blue-300 text-blue-700'
          )}>
            {isKemarau ? <Sun className="mr-1 h-2.5 w-2.5" /> : <CloudRain className="mr-1 h-2.5 w-2.5" />}
            {isKemarau ? 'Kemarau' : 'Hujan'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Error */}
        {result.validationErrors.length > 0 && (
          <div className="rounded-md bg-red-50 border border-red-200 p-2.5 space-y-1">
            {result.validationErrors.map((e, i) => (
              <p key={i} className="text-xs text-red-600 flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />{e}
              </p>
            ))}
          </div>
        )}

        {/* Breakdown singkat */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Landed Cost/{satuanLabel}</span>
            <span className="font-medium">{formatRupiahFull(result.landedCostPerPeti)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Berat Tara Total</span>
            <span className="text-red-500">- {formatKg(result.beratPetiTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Penyusutan/Afkir ({formatPersen(parseFloat(item.pct_afkir) || 0)})</span>
            <span className="text-amber-600">- {formatKg(result.beratAfkir)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-1.5">
            <span>Net Yield</span>
            <span className={result.netYield > 0 ? 'text-green-600' : 'text-red-600'}>{formatKg(result.netYield)}</span>
          </div>
        </div>

        <Separator />

        {/* HPP utama */}
        <div className={cn(
          'rounded-lg p-3 text-center',
          valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        )}>
          <p className="text-xs text-muted-foreground mb-0.5">True HPP per Kg</p>
          <p className={cn('text-2xl font-bold', valid ? 'text-green-700' : 'text-red-600')}>
            {formatRupiahFull(result.hppPerKg)}
          </p>
          {valid && (
            <p className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3" />Kalkulasi valid
            </p>
          )}
        </div>

        {/* Distribusi pcs L/M/S */}
        {hasil.estimasiTotalPcs > 0 && (
          <DistribusiHasil hasil={hasil} satuanLabel={satuanLabel} />
        )}

        {/* Simulasi harga jual (inline ringkas) */}
        {valid && result.hppPerKg > 0 && (
          <SimulasiRingkas hppPerKg={result.hppPerKg} />
        )}
      </CardContent>
    </Card>
  )
}

// ── Distribusi hasil L/M/S ──
function DistribusiHasil({ hasil, satuanLabel }: { hasil: HasilSatu; satuanLabel: string }) {
  const { item } = hasil

  const pL = parseFloat(item.dist_l_pct) || 0
  const pM = parseFloat(item.dist_m_pct) || 0
  const pS = parseFloat(item.dist_s_pct) || 0
  const gL = parseFloat(item.dist_l_gram) || 0
  const gM = parseFloat(item.dist_m_gram) || 0
  const gS = parseFloat(item.dist_s_gram) || 0

  const hpp = hasil.result.hppPerKg
  const hppL = gL > 0 ? (hpp * gL) / 1000 : null
  const hppM = gM > 0 ? (hpp * gM) / 1000 : null
  const hppS = gS > 0 ? (hpp * gS) / 1000 : null

  return (
    <div className="rounded-lg bg-muted/30 border p-3 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Estimasi Distribusi Ukuran
      </p>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Berat rata-rata</span>
        <span className="font-medium">{hasil.beratRataGram.toFixed(1)} gram/buah</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Per {satuanLabel}</span>
        <span className="font-medium">~{hasil.estimasiPcsPerKemasan} buah</span>
      </div>
      <div className="flex justify-between text-xs font-semibold">
        <span>Total estimasi</span>
        <span className="text-primary">~{hasil.estimasiTotalPcs.toLocaleString('id-ID')} buah</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 border-t pt-2">
        {[
          { label: 'Besar (L)', pcs: hasil.pcsL, gram: gL, hpp: hppL, pct: pL, color: 'text-emerald-600' },
          { label: 'Sedang (M)', pcs: hasil.pcsM, gram: gM, hpp: hppM, pct: pM, color: 'text-blue-600' },
          { label: 'Kecil (S)', pcs: hasil.pcsS, gram: gS, hpp: hppS, pct: pS, color: 'text-orange-500' },
        ].map(t => (
          <div key={t.label} className="rounded-md bg-white border text-center py-2 px-1 space-y-0.5">
            <p className={cn('text-sm font-bold', t.color)}>{t.pcs.toLocaleString('id-ID')}</p>
            <p className="text-[10px] text-muted-foreground">{t.label}</p>
            {t.gram > 0 && <p className="text-[10px] text-muted-foreground">{t.gram}g · {t.pct}%</p>}
            {t.hpp !== null && (
              <p className="text-[10px] font-semibold text-foreground">{formatRupiahFull(t.hpp)}/btr</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Simulasi harga jual ringkas ──
function SimulasiRingkas({ hppPerKg }: { hppPerKg: number }) {
  const [margin, setMargin] = useState('2000')
  const [showDetail, setShowDetail] = useState(false)
  const [hargaT1, setHargaT1] = useState('')
  const [hargaT2, setHargaT2] = useState('')
  const [hargaT3, setHargaT3] = useState('')

  const targetHarga = hppPerKg + (parseFloat(margin) || 0)

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Simulasi Harga Jual
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Margin (Rp/kg)</Label>
          <Input
            type="number" className="h-7 text-xs"
            value={margin} onChange={e => setMargin(e.target.value)}
          />
        </div>
        <div className="flex-1 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Harga Jual</p>
          <p className="text-lg font-bold text-primary">{formatRupiahFull(targetHarga)}/kg</p>
        </div>
      </div>

      <button
        type="button"
        className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setShowDetail(v => !v)}
      >
        <span>Bandingkan dengan harga pasar</span>
        {showDetail ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {showDetail && (
        <div className="space-y-2 border-t pt-2">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'T1 / Petani', val: hargaT1, set: setHargaT1 },
              { label: 'T2 / Agen', val: hargaT2, set: setHargaT2 },
              { label: 'T3 / Retail', val: hargaT3, set: setHargaT3 },
            ].map(t => (
              <div key={t.label} className="space-y-1">
                <Label className="text-[10px] leading-tight">{t.label}</Label>
                <Input type="number" className="h-6 text-xs" placeholder="0" value={t.val} onChange={e => t.set(e.target.value)} />
              </div>
            ))}
          </div>
          {[
            { label: 'T1 / Petani', val: hargaT1 },
            { label: 'T2 / Agen', val: hargaT2 },
            { label: 'T3 / Retail', val: hargaT3 },
          ].filter(t => parseFloat(t.val) > 0).map(t => {
            const harga = parseFloat(t.val)
            const gap = harga - hppPerKg
            return (
              <div key={t.label} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t.label}</span>
                <span className={cn('font-medium', gap < 0 ? 'text-red-500' : gap < hppPerKg * 0.05 ? 'text-yellow-600' : 'text-green-600')}>
                  {formatRupiahFull(harga)} ({gap >= 0 ? '+' : ''}{formatRupiahFull(gap)})
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Ringkasan multi-item ──
function RingkasanMultiItem({ hasilList }: { hasilList: HasilSatu[] }) {
  const valid = hasilList.filter(h => h.result.isValid && h.result.netYield > 0)
  if (valid.length === 0) return null

  const totalNetYield = valid.reduce((a, h) => a + h.result.netYield, 0)
  const totalLandedCost = valid.reduce((a, h) => a + h.result.totalLandedCost, 0)
  const totalSortir = valid.reduce((a, h) => a + (h.result.biayaKuliSortirPerKg * h.result.netYield), 0)
  const totalRecovery = valid.reduce((a, h) => a + (parseFloat(h.item.nilai_recovery_afkir) || 0), 0)
  const hppRataRata = totalNetYield > 0
    ? ((totalLandedCost - totalRecovery) / totalNetYield) + (totalNetYield > 0 ? totalSortir / totalNetYield : 0)
    : 0

  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm">Ringkasan 1 Muat ({valid.length} jenis buah)</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Net Yield</span>
          <span className="font-semibold">{formatKg(totalNetYield)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Landed Cost</span>
          <span className="font-semibold">{formatRupiahFull(totalLandedCost)}</span>
        </div>
        <Separator />
        <div className="flex justify-between items-center">
          <span className="font-semibold">HPP Rata-rata (mix)</span>
          <span className="text-xl font-bold text-primary">{formatRupiahFull(hppRataRata)}/kg</span>
        </div>
        {/* Tabel per jenis */}
        <div className="rounded-md border bg-white overflow-hidden mt-2">
          <div className="grid grid-cols-3 gap-1 px-2 py-1.5 bg-muted/50 font-medium text-muted-foreground">
            <span>Buah</span>
            <span className="text-right">Net Yield</span>
            <span className="text-right">HPP/kg</span>
          </div>
          {valid.map(h => (
            <div key={h.item.id} className="grid grid-cols-3 gap-1 px-2 py-1.5 border-t">
              <span className="truncate">{h.item.nama || 'Buah'}</span>
              <span className="text-right">{formatKg(h.result.netYield)}</span>
              <span className="text-right font-semibold text-primary">{formatRupiahFull(h.result.hppPerKg)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
