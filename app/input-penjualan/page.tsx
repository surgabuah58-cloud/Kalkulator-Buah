'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatRupiahFull, formatKg } from '@/lib/calculations/hpp'
import type { BuahRow, PelangganRow, TipePelanggan } from '@/types/database.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { TrendingUp, TrendingDown, Minus, Loader2, CheckCircle2, AlertTriangle, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIPE_LABEL: Record<TipePelanggan, string> = {
  sub_supplier: 'Sub Supplier',
  dapur_mbg:    'Dapur MBG',
  retail:       'Retail',
}

// ============================================================
// SCHEMA VALIDASI
// ============================================================
const penjualanSchema = z.object({
  buah_id:          z.string().min(1, 'Pilih buah'),
  pelanggan_id:     z.string().min(1, 'Pilih pelanggan'),
  tanggal:          z.string().min(1, 'Tanggal wajib diisi'),
  jumlah_kg:        z.number().min(0.01, 'Jumlah harus > 0'),
  harga_jual_per_kg: z.number().min(0, 'Harga tidak boleh negatif'),
  catatan:          z.string().optional(),
})
type PenjualanFormValues = z.infer<typeof penjualanSchema>

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function InputPenjualanPage() {
  const supabase = createClient()

  const [buahList, setBuahList]           = useState<BuahRow[]>([])
  const [pelangganList, setPelangganList] = useState<PelangganRow[]>([])
  const [hppMap, setHppMap]               = useState<Record<string, number>>({})
  const [isSaving, setIsSaving]           = useState(false)
  const [spareMode, setSpareMode]         = useState<'pct' | 'kg' | 'pcs'>('pct')
  const [spareRaw, setSpareRaw]           = useState('')

  const today = new Date().toISOString().split('T')[0]

  const form = useForm<PenjualanFormValues>({
    resolver: zodResolver(penjualanSchema),
    defaultValues: {
      tanggal: today,
      buah_id: '', pelanggan_id: '',
      jumlah_kg: 0, harga_jual_per_kg: 0, catatan: '',
    },
  })

  const watchedValues = form.watch()

  // ============================================================
  // DATA FETCHING
  // ============================================================
  useEffect(() => {
    async function fetchData() {
      const [buahRes, pelangganRes, hppRes] = await Promise.all([
        supabase.from('buah').select('*').eq('is_active', true).order('nama'),
        supabase.from('pelanggan').select('*').eq('is_active', true).order('nama'),
        supabase.from('v_latest_hpp').select('buah_id, hpp_per_kg'),
      ])
      if (buahRes.error)      toast.error('Gagal memuat buah: '      + buahRes.error.message)
      if (pelangganRes.error) toast.error('Gagal memuat pelanggan: ' + pelangganRes.error.message)
      setBuahList(buahRes.data ?? [])
      setPelangganList(pelangganRes.data ?? [])
      // Build HPP lookup map
      const map: Record<string, number> = {}
      for (const row of hppRes.data ?? []) map[row.buah_id] = row.hpp_per_kg
      setHppMap(map)
    }
    fetchData()
  }, [])

  // ============================================================
  // LIVE KALKULASI
  // ============================================================
  const preview = useMemo(() => {
    const jumlah    = watchedValues.jumlah_kg        || 0
    const hargaJual = watchedValues.harga_jual_per_kg || 0
    const hpp       = hppMap[watchedValues.buah_id]  ?? null
    const rawNum    = parseFloat(spareRaw) || 0

    // Compute sparePct from local mode/value
    let sparePct = 0
    let spareWarning: string | null = null
    let spareKgFromInput = 0
    if (spareMode === 'pct') {
      sparePct = Math.min(100, Math.max(0, rawNum))
    } else if (spareMode === 'kg') {
      spareKgFromInput = rawNum
      sparePct = jumlah > 0 ? Math.min(100, (rawNum / jumlah) * 100) : 0
    } else if (spareMode === 'pcs') {
      const buah = buahList.find(b => b.id === watchedValues.buah_id)
      if (buah?.berat_per_pcs_gram && buah.berat_per_pcs_gram > 0) {
        spareKgFromInput = (rawNum * buah.berat_per_pcs_gram) / 1000
        sparePct = jumlah > 0 ? Math.min(100, (spareKgFromInput / jumlah) * 100) : 0
      } else if (rawNum > 0) {
        spareWarning = 'Data berat per pcs tidak tersedia untuk buah ini'
      }
    }

    const spareKg    = spareMode === 'kg'  ? spareKgFromInput
                     : spareMode === 'pcs' ? spareKgFromInput
                     : jumlah * (sparePct / 100)
    const totalStok  = jumlah + spareKg

    const totalNilai  = jumlah * hargaJual
    const marginPerKg = hpp !== null ? hargaJual - hpp : null
    const totalMargin = hpp !== null ? (hargaJual - hpp) * jumlah : null
    const pctMargin   = hpp !== null && hpp > 0 ? ((hargaJual - hpp) / hpp) * 100 : null

    // HPP Efektif: biaya buffer (spareKg * HPP) dibebankan ke penjual, membebani margin
    const biayaBuffer        = hpp !== null && spareKg > 0 ? spareKg * hpp : null
    const hppEfektif         = hpp !== null && jumlah > 0 ? hpp * (totalStok / jumlah) : null
    const marginEfektif      = hppEfektif !== null ? hargaJual - hppEfektif : null
    const totalMarginEfektif = marginEfektif !== null ? marginEfektif * jumlah : null
    const pctMarginEfektif   = hppEfektif !== null && hppEfektif > 0
                               ? ((marginEfektif!) / hppEfektif) * 100 : null

    return {
      jumlah, hargaJual, hpp, sparePct, spareKg, totalStok, totalNilai,
      marginPerKg, totalMargin, pctMargin,
      biayaBuffer, hppEfektif, marginEfektif, totalMarginEfektif, pctMarginEfektif,
      spareWarning,
    }
  }, [
    watchedValues.jumlah_kg, watchedValues.harga_jual_per_kg, watchedValues.buah_id,
    hppMap, spareMode, spareRaw, buahList,
  ])

  const hasInput = preview.jumlah > 0 && preview.hargaJual > 0

  // ============================================================
  // SUBMIT
  // ============================================================
  async function onSubmit(values: PenjualanFormValues) {
    setIsSaving(true)
    const { error } = await supabase.from('penjualan').insert({
      tanggal:           values.tanggal,
      buah_id:           values.buah_id,
      pelanggan_id:      values.pelanggan_id,
      jumlah_kg:         values.jumlah_kg,
      harga_jual_per_kg: values.harga_jual_per_kg,
      hpp_snapshot:      hppMap[values.buah_id] ?? null,
      spare_pct:         preview.sparePct,
      catatan:           values.catatan || null,
    })

    if (error) {
      toast.error('Gagal menyimpan: ' + error.message)
    } else {
      toast.success('Transaksi penjualan berhasil disimpan')
      form.reset({
        tanggal: today,
        buah_id: '', pelanggan_id: '',
        jumlah_kg: 0, harga_jual_per_kg: 0, catatan: '',
      })
      setSpareRaw('')
      setSpareMode('pct')
    }
    setIsSaving(false)
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* ── FORM KIRI ── */}
      <div className="lg:col-span-2">
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Baris 1: Tanggal, Buah, Pelanggan */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Tanggal <span className="text-red-500">*</span></Label>
                  <Input type="date" {...form.register('tanggal')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Buah <span className="text-red-500">*</span></Label>
                  <Select
                    onValueChange={(v) => form.setValue('buah_id', v ?? '', { shouldValidate: true })}
                    value={form.watch('buah_id')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih buah...">
                        {buahList.find(b => b.id === form.watch('buah_id'))?.nama ?? null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {buahList.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.buah_id && (
                    <p className="text-xs text-red-500">{form.formState.errors.buah_id.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Pelanggan <span className="text-red-500">*</span></Label>
                  <Select
                    onValueChange={(v) => form.setValue('pelanggan_id', v ?? '', { shouldValidate: true })}
                    value={form.watch('pelanggan_id')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pelanggan...">
                        {pelangganList.find(p => p.id === form.watch('pelanggan_id'))?.nama ?? null}
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
                  {form.formState.errors.pelanggan_id && (
                    <p className="text-xs text-red-500">{form.formState.errors.pelanggan_id.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Data Transaksi */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Data Penjualan
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Jumlah (kg) <span className="text-red-500">*</span></Label>
                    <Input
                      type="number" min="0.01" step="0.01"
                      placeholder="0.00"
                      {...form.register('jumlah_kg', { valueAsNumber: true })}
                    />
                    {form.formState.errors.jumlah_kg && (
                      <p className="text-xs text-red-500">{form.formState.errors.jumlah_kg.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Harga Jual per Kg (Rp) <span className="text-red-500">*</span></Label>
                    <Input
                      type="number" min="0" step="100"
                      placeholder="0"
                      {...form.register('harga_jual_per_kg', { valueAsNumber: true })}
                    />
                    {/* Hint HPP */}
                    {preview.hpp !== null && (
                      <p className="text-xs text-muted-foreground">
                        HPP saat ini: <span className="font-medium text-foreground">{formatRupiahFull(preview.hpp)}/kg</span>
                      </p>
                    )}
                    {form.formState.errors.harga_jual_per_kg && (
                      <p className="text-xs text-red-500">{form.formState.errors.harga_jual_per_kg.message}</p>
                    )}
                  </div>
                </div>
                {/* Spare / Buffer */}
                <div className="space-y-2 pt-2">
                  <Label>
                    Spare / Buffer{' '}
                    <span className="text-muted-foreground text-xs">(stok cadangan antisipasi buah rusak/gagal saat pengiriman)</span>
                  </Label>
                  {/* Mode toggle */}
                  <div className="flex items-center gap-1">
                    {(['pct', 'kg', 'pcs'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSpareMode(m)}
                        className={cn(
                          'px-3 py-1 text-xs rounded-md border transition-colors',
                          spareMode === m
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
                        type="number" min="0" step="any"
                        placeholder="0"
                        className="w-28"
                        value={spareRaw}
                        onChange={(e) => setSpareRaw(e.target.value)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {spareMode === 'pct' ? '%' : spareMode === 'kg' ? 'kg' : 'pcs'}
                      </span>
                    </div>
                    {preview.spareWarning ? (
                      <span className="text-xs text-amber-600">{preview.spareWarning}</span>
                    ) : preview.sparePct > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {spareMode === 'pct' && `= +${formatKg(preview.spareKg)} cadangan`}
                        {spareMode === 'kg'  && `= ${preview.sparePct.toFixed(2)}% dari jual`}
                        {spareMode === 'pcs' && `= ${formatKg(preview.spareKg)} (${preview.sparePct.toFixed(2)}%)`}
                        {' → total stok '}
                        <span className="font-medium text-foreground">{formatKg(preview.totalStok)}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Catatan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
                <Input placeholder="Catatan tambahan..." {...form.register('catatan')} />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving || !hasInput}>
                  {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Simpan Transaksi
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ── LIVE PREVIEW KANAN ── */}
      <div>
        <Card className={cn(
          'border-2 md:sticky md:top-6',
          !hasInput ? 'border-dashed' : (() => {
            const m = preview.sparePct > 0 ? preview.marginEfektif : preview.marginPerKg
            return m !== null && m >= 0 ? 'border-green-300' : 'border-red-300'
          })()
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Live Preview Penjualan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!hasInput ? (
              <div className="py-8 text-center">
                <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">
                  Isi data di sebelah kiri untuk melihat preview
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jumlah Jual</span>
                    <span className="font-medium">{formatKg(preview.jumlah)}</span>
                  </div>
                  {preview.sparePct > 0 && (
                    <>
                      <div className="flex justify-between text-amber-600">
                        <span>Buffer ({preview.sparePct.toFixed(2)}%)</span>
                        <span className="font-medium">+{formatKg(preview.spareKg)}</span>
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
                      <span className="font-medium">{formatRupiahFull(preview.hpp)}</span>
                    </div>
                  )}
                  {preview.hppEfektif !== null && preview.sparePct > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span className="font-medium">HPP Efektif/kg</span>
                      <span className="font-semibold">{formatRupiahFull(preview.hppEfektif)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Total Nilai */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Nilai Penjualan</p>
                  <p className="text-2xl font-bold text-primary">{formatRupiahFull(preview.totalNilai)}</p>
                </div>

                {/* Margin */}
                {preview.marginPerKg !== null && (
                  <>
                    <Separator />
                    <div className="space-y-2 text-xs">
                      <p className="font-semibold text-muted-foreground uppercase tracking-wide">Analisa Margin</p>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">
                          {preview.sparePct > 0 ? 'Margin Nominal/kg' : 'Margin/kg'}
                        </span>
                        <span className={cn(
                          'font-semibold flex items-center gap-1',
                          preview.marginPerKg >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {preview.marginPerKg >= 0
                            ? <TrendingUp className="h-3 w-3" />
                            : <TrendingDown className="h-3 w-3" />}
                          {formatRupiahFull(preview.marginPerKg)}
                        </span>
                      </div>

                      {/* Buffer cost impact */}
                      {preview.biayaBuffer !== null && preview.biayaBuffer > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>Biaya Buffer ({preview.sparePct.toFixed(2)}%)</span>
                          <span className="font-medium">−{formatRupiahFull(preview.biayaBuffer)}</span>
                        </div>
                      )}

                      {/* Effective margin after buffer */}
                      {preview.marginEfektif !== null && preview.sparePct > 0 ? (
                        <>
                          <div className="flex justify-between items-center border-t border-dashed border-muted pt-1">
                            <span className="font-semibold">Margin Efektif/kg</span>
                            <span className={cn(
                              'font-bold flex items-center gap-1',
                              preview.marginEfektif >= 0 ? 'text-green-600' : 'text-red-600'
                            )}>
                              {preview.marginEfektif >= 0
                                ? <TrendingUp className="h-3 w-3" />
                                : <TrendingDown className="h-3 w-3" />}
                              {formatRupiahFull(preview.marginEfektif)}
                            </span>
                          </div>
                          {preview.totalMarginEfektif !== null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Margin Efektif</span>
                              <span className={cn('font-semibold', preview.totalMarginEfektif >= 0 ? 'text-green-600' : 'text-red-600')}>
                                {formatRupiahFull(preview.totalMarginEfektif)}
                              </span>
                            </div>
                          )}
                          {preview.pctMarginEfektif !== null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Margin Efektif %</span>
                              <span className={cn('font-semibold', preview.pctMarginEfektif >= 0 ? 'text-green-600' : 'text-red-600')}>
                                {preview.pctMarginEfektif >= 0 ? '+' : ''}{preview.pctMarginEfektif.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
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
                    {(() => {
                      const m = preview.sparePct > 0 ? preview.marginEfektif : preview.marginPerKg
                      return m !== null ? (
                        <div className={cn(
                          'rounded-lg p-3 text-center text-xs font-medium flex items-center justify-center gap-1.5',
                          m >= 0
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
                        )}>
                          {m >= 0
                            ? <><CheckCircle2 className="h-3.5 w-3.5" /> Margin positif — Siap disimpan</>
                            : <><AlertTriangle className="h-3.5 w-3.5" /> Margin negatif — Rugi</>}
                        </div>
                      ) : null
                    })()}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
