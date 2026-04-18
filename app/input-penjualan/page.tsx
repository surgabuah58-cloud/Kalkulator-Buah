'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatRupiahFull, formatKg } from '@/lib/calculations/hpp'
import type { BuahRow, PelangganRow, TipePelanggan } from '@/types/database.types'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RupiahInput } from '@/components/ui/rupiah-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { TrendingUp, TrendingDown, Loader2, AlertTriangle, CheckCircle2, Plus, Trash2, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIPE_LABEL: Record<TipePelanggan, string> = {
  sub_supplier: 'Sub Supplier',
  dapur_mbg:    'Dapur MBG',
  retail:       'Retail',
}

interface ItemState {
  key: string
  buahId: string
  jumlahKg: string
  hargaJual: number
  tipeJual: 'normal' | 'reject'
  spareMode: 'pct' | 'kg' | 'pcs'
  spareRaw: string
  catatan: string
  errors: Record<string, string>
}

function emptyItem(): ItemState {
  return {
    key: Math.random().toString(36).slice(2),
    buahId: '',
    jumlahKg: '',
    hargaJual: 0,
    tipeJual: 'normal',
    spareMode: 'pct',
    spareRaw: '',
    catatan: '',
    errors: {},
  }
}

export default function InputPenjualanPage() {
  const supabase = createClient()

  const [buahList, setBuahList]           = useState<BuahRow[]>([])
  const [pelangganList, setPelangganList] = useState<PelangganRow[]>([])
  const [hppMap, setHppMap]               = useState<Record<string, number>>({})
  const [isSaving, setIsSaving]           = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const [tanggal, setTanggal]             = useState(today)
  const [pelangganId, setPelangganId]     = useState('')
  const [pelangganError, setPelangganError] = useState('')

  const [items, setItems] = useState<ItemState[]>([emptyItem()])

  useEffect(() => {
    async function fetchData() {
      const [buahRes, pelangganRes, hppRes] = await Promise.all([
        supabase.from('buah').select('*').eq('is_active', true).order('nama'),
        supabase.from('pelanggan').select('*').eq('is_active', true).order('nama'),
        supabase.from('v_latest_hpp').select('buah_id, hpp_per_kg'),
      ])
      setBuahList(buahRes.data ?? [])
      setPelangganList(pelangganRes.data ?? [])
      const map: Record<string, number> = {}
      for (const row of hppRes.data ?? []) map[row.buah_id] = row.hpp_per_kg
      setHppMap(map)
    }
    fetchData()
  }, [])

  function updateItem(key: string, patch: Partial<ItemState>) {
    setItems(prev => prev.map(it => it.key === key ? { ...it, ...patch } : it))
  }

  function computePreview(item: ItemState, bList: BuahRow[], hMap: Record<string, number>) {
    const jumlah    = parseFloat(item.jumlahKg) || 0
    const hargaJual = item.hargaJual
    const hpp       = hMap[item.buahId] ?? null
    const rawNum    = parseFloat(item.spareRaw) || 0

    let sparePct = 0
    let spareWarning: string | null = null
    let spareKgFromInput = 0

    if (item.spareMode === 'pct') {
      sparePct = Math.min(100, Math.max(0, rawNum))
    } else if (item.spareMode === 'kg') {
      spareKgFromInput = rawNum
      sparePct = jumlah > 0 ? Math.min(100, (rawNum / jumlah) * 100) : 0
    } else if (item.spareMode === 'pcs') {
      const buah = bList.find(b => b.id === item.buahId)
      if (buah?.berat_per_pcs_gram && buah.berat_per_pcs_gram > 0) {
        spareKgFromInput = (rawNum * buah.berat_per_pcs_gram) / 1000
        sparePct = jumlah > 0 ? Math.min(100, (spareKgFromInput / jumlah) * 100) : 0
      } else if (rawNum > 0) {
        spareWarning = 'Data berat per pcs tidak tersedia untuk buah ini'
      }
    }

    const spareKg  = (item.spareMode === 'kg' || item.spareMode === 'pcs')
      ? spareKgFromInput
      : jumlah * (sparePct / 100)
    const totalStok = jumlah + spareKg

    const totalNilai         = jumlah * hargaJual
    const marginPerKg        = hpp !== null ? hargaJual - hpp : null
    const totalMargin        = hpp !== null ? (hargaJual - hpp) * jumlah : null
    const pctMargin          = hpp !== null && hpp > 0 ? ((hargaJual - hpp) / hpp) * 100 : null
    const biayaBuffer        = hpp !== null && spareKg > 0 ? spareKg * hpp : null
    const hppEfektif         = hpp !== null && jumlah > 0 ? hpp * (totalStok / jumlah) : null
    const marginEfektif      = hppEfektif !== null ? hargaJual - hppEfektif : null
    const totalMarginEfektif = marginEfektif !== null ? marginEfektif * jumlah : null
    const pctMarginEfektif   = hppEfektif !== null && hppEfektif > 0
      ? (marginEfektif! / hppEfektif) * 100 : null

    return {
      jumlah, hargaJual, hpp, sparePct, spareKg, totalStok, totalNilai,
      marginPerKg, totalMargin, pctMargin,
      biayaBuffer, hppEfektif, marginEfektif, totalMarginEfektif, pctMarginEfektif,
      spareWarning,
    }
  }

  function validateItem(item: ItemState): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!item.buahId) errors.buahId = 'Pilih buah'
    const jumlah = parseFloat(item.jumlahKg)
    if (!jumlah || jumlah <= 0) errors.jumlahKg = 'Jumlah harus > 0'
    if (item.hargaJual <= 0) errors.hargaJual = 'Harga jual harus diisi'
    return errors
  }

  async function handleSave() {
    if (!pelangganId) {
      setPelangganError('Pilih pelanggan')
      return
    }
    setPelangganError('')

    let hasError = false
    const validatedItems = items.map(item => {
      const errors = validateItem(item)
      if (Object.keys(errors).length > 0) hasError = true
      return { ...item, errors }
    })
    setItems(validatedItems)
    if (hasError) {
      toast.error('Perbaiki error di form sebelum menyimpan')
      return
    }

    setIsSaving(true)
    try {
      const insertPromises = validatedItems.map(item => {
        const preview = computePreview(item, buahList, hppMap)
        return supabase.from('penjualan').insert({
          tanggal,
          buah_id:           item.buahId,
          pelanggan_id:      pelangganId,
          jumlah_kg:         parseFloat(item.jumlahKg),
          harga_jual_per_kg: item.hargaJual,
          hpp_snapshot:      hppMap[item.buahId] ?? null,
          spare_pct:         preview.sparePct,
          tipe_jual:         item.tipeJual,
          catatan:           item.catatan || null,
        })
      })

      const results  = await Promise.all(insertPromises)
      const failures = results.filter(r => r.error)

      if (failures.length > 0) {
        toast.error(`${failures.length} item gagal: ${failures[0].error?.message}`)
      } else {
        toast.success(
          items.length > 1
            ? `${items.length} transaksi penjualan berhasil disimpan`
            : 'Transaksi penjualan berhasil disimpan'
        )
        setItems([emptyItem()])
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* ===== HEADER: Tanggal + Pelanggan (shared) ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4" />
            Form Penjualan Baru
          </CardTitle>
          <CardDescription className="text-xs">
            Catat transaksi penjualan buah ke pelanggan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Tanggal <span className="text-red-500">*</span></Label>
              <Input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Pelanggan <span className="text-red-500">*</span></Label>
              <Select
                value={pelangganId}
                onValueChange={v => { setPelangganId(v ?? ''); setPelangganError('') }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pelanggan...">
                    {pelangganList.find(p => p.id === pelangganId)?.nama ?? null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {pelangganList.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span>{p.nama}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">({TIPE_LABEL[p.tipe]})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pelangganError && <p className="text-xs text-red-500">{pelangganError}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== ITEM CARDS ===== */}
      {items.map((item, index) => {
        const preview        = computePreview(item, buahList, hppMap)
        const hasInput       = preview.jumlah > 0 && preview.hargaJual > 0
        const hasErrors      = Object.values(item.errors).some(v => v)
        const effectiveMargin = preview.sparePct > 0 ? preview.marginEfektif : preview.marginPerKg

        return (
          <Card
            key={item.key}
            className={cn('border-2', hasErrors ? 'border-red-200' : 'border-transparent')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Buah #{index + 1}
                </CardTitle>
                {items.length > 1 && (
                  <Button
                    type="button" variant="ghost" size="sm"
                    onClick={() => setItems(prev => prev.filter(it => it.key !== item.key))}
                    className="h-7 gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                {/* ---- FORM (2/3) ---- */}
                <div className="lg:col-span-2 space-y-5">

                  {/* Pilih Buah + quick create */}
                  <div className="space-y-1.5">
                    <Label>Buah <span className="text-red-500">*</span></Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={item.buahId}
                        onValueChange={v => {
                          const newErrors = { ...item.errors }
                          delete newErrors.buahId
                          updateItem(item.key, { buahId: v ?? '', errors: newErrors })
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Pilih buah...">
                            {buahList.find(b => b.id === item.buahId)?.nama ?? null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          {buahList.map(b => (
                            <SelectItem key={b.id} value={b.id}>{b.nama}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button" variant="outline" size="sm" 
                        className="shrink-0 gap-1 text-xs"
                      >
                        <Link href="/master-buah">
                          <Plus className="h-3.5 w-3.5" /> Buat Baru
                        </Link>
                      </Button>
                    </div>
                    {item.errors.buahId && (
                      <p className="text-xs text-red-500">{item.errors.buahId}</p>
                    )}
                    {item.buahId && hppMap[item.buahId] !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        HPP saat ini:{' '}
                        <span className="font-medium text-foreground">
                          {formatRupiahFull(hppMap[item.buahId])}/kg
                        </span>
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Data Penjualan */}
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Data Penjualan
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Jumlah (kg) <span className="text-red-500">*</span></Label>
                        <Input
                          type="number" min="0.01" step="0.01" placeholder="0.00"
                          value={item.jumlahKg}
                          onChange={e => {
                            const newErrors = { ...item.errors }
                            delete newErrors.jumlahKg
                            updateItem(item.key, { jumlahKg: e.target.value, errors: newErrors })
                          }}
                        />
                        {item.errors.jumlahKg && (
                          <p className="text-xs text-red-500">{item.errors.jumlahKg}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Harga Jual per Kg (Rp) <span className="text-red-500">*</span></Label>
                        <RupiahInput
                          value={item.hargaJual}
                          onChange={v => {
                            const newErrors = { ...item.errors }
                            delete newErrors.hargaJual
                            updateItem(item.key, { hargaJual: v, errors: newErrors })
                          }}
                          placeholder="Contoh: 15.000"
                        />
                        {item.errors.hargaJual && (
                          <p className="text-xs text-red-500">{item.errors.hargaJual}</p>
                        )}
                      </div>
                    </div>

                    {/* Tipe Jual */}
                    <div className="space-y-2 pt-3">
                      <Label>Tipe Penjualan</Label>
                      <div className="flex items-center gap-1">
                        {(['normal', 'reject'] as const).map(t => (
                          <button
                            key={t} type="button"
                            onClick={() => updateItem(item.key, { tipeJual: t })}
                            className={cn(
                              'px-3 py-1 text-xs rounded-md border transition-colors',
                              item.tipeJual === t
                                ? t === 'normal'
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-amber-500 text-white border-amber-500'
                                : 'bg-background text-muted-foreground border-input hover:bg-muted',
                            )}
                          >
                            {t === 'normal' ? 'Normal' : 'Reject'}
                          </button>
                        ))}
                        {item.tipeJual === 'reject' && (
                          <span className="ml-2 text-xs text-amber-600">Stok buah kelas reject</span>
                        )}
                      </div>
                    </div>

                    {/* Spare / Buffer */}
                    <div className="space-y-2 pt-3">
                      <Label>
                        Spare / Buffer{' '}
                        <span className="text-muted-foreground text-xs">
                          (stok cadangan antisipasi buah rusak/gagal saat pengiriman)
                        </span>
                      </Label>
                      <div className="flex items-center gap-1">
                        {(['pct', 'kg', 'pcs'] as const).map(m => (
                          <button
                            key={m} type="button"
                            onClick={() => updateItem(item.key, { spareMode: m, spareRaw: '' })}
                            className={cn(
                              'px-3 py-1 text-xs rounded-md border transition-colors',
                              item.spareMode === m
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground border-input hover:bg-muted',
                            )}
                          >
                            {m === 'pct' ? '% Persen' : m === 'kg' ? 'kg' : 'pcs'}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number" min="0" step="any" placeholder="0" className="w-28"
                            value={item.spareRaw}
                            onChange={e => updateItem(item.key, { spareRaw: e.target.value })}
                          />
                          <span className="text-sm text-muted-foreground">
                            {item.spareMode === 'pct' ? '%' : item.spareMode === 'kg' ? 'kg' : 'pcs'}
                          </span>
                        </div>
                        {preview.spareWarning ? (
                          <span className="text-xs text-amber-600">{preview.spareWarning}</span>
                        ) : preview.sparePct > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            = +{formatKg(preview.spareKg)} cadangan &rarr; total stok{' '}
                            <span className="font-medium text-foreground">{formatKg(preview.totalStok)}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Catatan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
                    <Input
                      placeholder="Catatan tambahan..."
                      value={item.catatan}
                      onChange={e => updateItem(item.key, { catatan: e.target.value })}
                    />
                  </div>
                </div>

                {/* ---- PREVIEW (1/3) ---- */}
                <div>
                  <Card className={cn(
                    'sticky top-6 border',
                    !hasInput ? 'border-dashed' :
                    effectiveMargin !== null && effectiveMargin >= 0 ? 'border-green-300' : 'border-red-300'
                  )}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-1.5 text-xs">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Live Preview Penjualan
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {!hasInput ? (
                        <p className="py-3 text-center text-xs text-muted-foreground">
                          Isi data untuk kalkulasi
                        </p>
                      ) : (
                        <>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Jumlah Jual</span>
                              <span className="font-medium">{formatKg(preview.jumlah)}</span>
                            </div>
                            {preview.sparePct > 0 && (
                              <>
                                <div className="flex justify-between text-amber-600">
                                  <span>Buffer ({preview.sparePct.toFixed(2)}%)</span>
                                  <span>+{formatKg(preview.spareKg)}</span>
                                </div>
                                <div className="flex justify-between border-t border-dashed border-muted pt-1">
                                  <span className="font-semibold text-muted-foreground">Stok Disiapkan</span>
                                  <span className="font-bold">{formatKg(preview.totalStok)}</span>
                                </div>
                              </>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Harga Jual/kg</span>
                              <span className="font-medium">{formatRupiahFull(preview.hargaJual)}</span>
                            </div>
                            {preview.hpp !== null && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">HPP/kg</span>
                                <span>{formatRupiahFull(preview.hpp)}</span>
                              </div>
                            )}
                            {preview.hppEfektif !== null && preview.sparePct > 0 && (
                              <div className="flex justify-between text-amber-700">
                                <span>HPP Efektif/kg</span>
                                <span className="font-semibold">{formatRupiahFull(preview.hppEfektif)}</span>
                              </div>
                            )}
                          </div>

                          <Separator />

                          {/* Total Nilai */}
                          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 text-center">
                            <p className="text-xs text-muted-foreground mb-0.5">Total Nilai Penjualan</p>
                            <p className="text-xl font-bold text-primary">{formatRupiahFull(preview.totalNilai)}</p>
                          </div>

                          {/* Margin */}
                          {preview.marginPerKg !== null && (
                            <>
                              <Separator />
                              <div className="space-y-1.5 text-xs">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                  Analisa Margin
                                </p>

                                {preview.sparePct > 0 ? (
                                  <>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Margin Nominal/kg</span>
                                      <span className={cn('font-medium', (preview.marginPerKg ?? 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                                        {formatRupiahFull(preview.marginPerKg)}
                                      </span>
                                    </div>
                                    {preview.biayaBuffer !== null && preview.biayaBuffer > 0 && (
                                      <div className="flex justify-between text-amber-600">
                                        <span>Biaya Buffer</span>
                                        <span>-{formatRupiahFull(preview.biayaBuffer)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between items-center border-t border-dashed border-muted pt-1">
                                      <span className="font-semibold">Margin Efektif/kg</span>
                                      <span className={cn('font-bold flex items-center gap-0.5', (preview.marginEfektif ?? 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                                        {(preview.marginEfektif ?? 0) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                        {formatRupiahFull(preview.marginEfektif ?? 0)}
                                      </span>
                                    </div>
                                    {preview.totalMarginEfektif !== null && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Total Margin</span>
                                        <span className={cn('font-semibold', preview.totalMarginEfektif >= 0 ? 'text-green-600' : 'text-red-600')}>
                                          {formatRupiahFull(preview.totalMarginEfektif)}
                                        </span>
                                      </div>
                                    )}
                                    {preview.pctMarginEfektif !== null && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Margin %</span>
                                        <span className={cn('font-semibold', preview.pctMarginEfektif >= 0 ? 'text-green-600' : 'text-red-600')}>
                                          {preview.pctMarginEfektif >= 0 ? '+' : ''}{preview.pctMarginEfektif.toFixed(1)}%
                                        </span>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">Margin/kg</span>
                                      <span className={cn('font-semibold flex items-center gap-0.5', preview.marginPerKg >= 0 ? 'text-green-600' : 'text-red-600')}>
                                        {preview.marginPerKg >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                        {formatRupiahFull(preview.marginPerKg)}
                                      </span>
                                    </div>
                                    {preview.totalMargin !== null && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Total Margin</span>
                                        <span className={cn('font-semibold', preview.totalMargin >= 0 ? 'text-green-600' : 'text-red-600')}>
                                          {formatRupiahFull(preview.totalMargin)}
                                        </span>
                                      </div>
                                    )}
                                    {preview.pctMargin !== null && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Margin %</span>
                                        <span className={cn('font-semibold', preview.pctMargin >= 0 ? 'text-green-600' : 'text-red-600')}>
                                          {preview.pctMargin >= 0 ? '+' : ''}{preview.pctMargin.toFixed(1)}%
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Status */}
                              {effectiveMargin !== null && (
                                <div className={cn(
                                  'rounded-lg p-2 text-center text-xs font-medium flex items-center justify-center gap-1',
                                  effectiveMargin >= 0
                                    ? 'bg-green-50 border border-green-200 text-green-700'
                                    : 'bg-red-50 border border-red-200 text-red-700'
                                )}>
                                  {effectiveMargin >= 0
                                    ? <><CheckCircle2 className="h-3 w-3" /> Margin positif</>
                                    : <><AlertTriangle className="h-3 w-3" /> Margin negatif &mdash; Rugi</>}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* ===== TOMBOL AKSI ===== */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setItems(prev => [...prev, emptyItem()])}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Tambah Buah Lain
        </Button>

        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="min-w-40"
        >
          {isSaving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          {items.length > 1 ? `Simpan ${items.length} Buah` : 'Simpan Transaksi'}
        </Button>
      </div>
    </div>
  )
}
