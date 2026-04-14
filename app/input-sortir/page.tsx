'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatRupiahFull, formatKg } from '@/lib/calculations/hpp'
import type { PembelianRow } from '@/types/database.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SlidersHorizontal, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// TYPES
// ============================================================
type PembelianOption = Pick<PembelianRow,
  'id' | 'no_transaksi' | 'tanggal' | 'berat_bruto_total' | 'net_yield' | 'hpp_per_kg'
> & {
  buah: { nama: string } | null
  pemasok: { nama: string } | null
}

// ============================================================
// SCHEMA
// ============================================================
const sortirSchema = z.object({
  pembelian_id:             z.string().min(1, 'Pilih batch pembelian'),
  tanggal_sortir:           z.string().min(1, 'Tanggal wajib diisi'),
  kg_baik:                  z.number().min(0, 'Tidak boleh negatif'),
  kg_reject:                z.number().min(0, 'Tidak boleh negatif'),
  kg_busuk:                 z.number().min(0, 'Tidak boleh negatif'),
  harga_jual_reject_per_kg: z.number().min(0, 'Tidak boleh negatif'),
  catatan:                  z.string().optional(),
})
type SortirFormValues = z.infer<typeof sortirSchema>

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function InputSortirPage() {
  const supabase = createClient()

  const [pembelianList, setPembelianList] = useState<PembelianOption[]>([])
  const [isSaving, setIsSaving]           = useState(false)
  const [isLoading, setIsLoading]         = useState(true)

  const today = new Date().toISOString().split('T')[0]

  const form = useForm<SortirFormValues>({
    resolver: zodResolver(sortirSchema),
    defaultValues: {
      pembelian_id:             '',
      tanggal_sortir:           today,
      kg_baik:                  0,
      kg_reject:                0,
      kg_busuk:                 0,
      harga_jual_reject_per_kg: 0,
      catatan:                  '',
    },
  })

  const watchedValues = form.watch()

  // ============================================================
  // FETCH
  // ============================================================
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('pembelian')
        .select('id, no_transaksi, tanggal, berat_bruto_total, net_yield, hpp_per_kg, buah:buah_id(nama), pemasok:pemasok_id(nama)')
        .order('tanggal', { ascending: false })
        .limit(100)
      if (error) {
        toast.error('Gagal memuat data pembelian: ' + error.message)
      } else {
        setPembelianList((data ?? []) as unknown as PembelianOption[])
      }
      setIsLoading(false)
    }
    fetchData()
  }, [])

  // ============================================================
  // SELECTED PEMBELIAN INFO
  // ============================================================
  const selectedPembelian = useMemo(
    () => pembelianList.find(p => p.id === watchedValues.pembelian_id) ?? null,
    [pembelianList, watchedValues.pembelian_id],
  )

  // ============================================================
  // LIVE BREAKDOWN
  // ============================================================
  const breakdown = useMemo(() => {
    const baik   = watchedValues.kg_baik   || 0
    const reject = watchedValues.kg_reject || 0
    const busuk  = watchedValues.kg_busuk  || 0
    const total  = baik + reject + busuk
    const bruto  = selectedPembelian?.berat_bruto_total ?? null

    const pctBaik   = total > 0 ? (baik   / total) * 100 : 0
    const pctReject = total > 0 ? (reject / total) * 100 : 0
    const pctBusuk  = total > 0 ? (busuk  / total) * 100 : 0

    const overBruto = bruto !== null && total > bruto + 0.01
    const underBruto = bruto !== null && total < bruto - 0.01

    return { baik, reject, busuk, total, pctBaik, pctReject, pctBusuk, overBruto, underBruto, bruto }
  }, [watchedValues.kg_baik, watchedValues.kg_reject, watchedValues.kg_busuk, selectedPembelian])

  // ============================================================
  // SUBMIT
  // ============================================================
  async function onSubmit(values: SortirFormValues) {
    setIsSaving(true)
    const { error } = await supabase.from('hasil_sortir').insert({
      pembelian_id:             values.pembelian_id,
      tanggal_sortir:           values.tanggal_sortir,
      kg_baik:                  values.kg_baik,
      kg_reject:                values.kg_reject,
      kg_busuk:                 values.kg_busuk,
      harga_jual_reject_per_kg: values.harga_jual_reject_per_kg || null,
      catatan:                  values.catatan || null,
    })

    if (error) {
      toast.error('Gagal menyimpan: ' + error.message)
    } else {
      toast.success('Hasil sortir berhasil disimpan')
      form.reset({
        pembelian_id:             '',
        tanggal_sortir:           today,
        kg_baik:                  0,
        kg_reject:                0,
        kg_busuk:                 0,
        harga_jual_reject_per_kg: 0,
        catatan:                  '',
      })
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
              <SlidersHorizontal className="h-4 w-4" />
              Form Input Hasil Sortir
            </CardTitle>
            <CardDescription className="text-xs">
              Catat hasil sortir buah dari batch pembelian
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              {/* Pilih Pembelian + Tanggal */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Batch Pembelian <span className="text-red-500">*</span></Label>
                  {isLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground h-9">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Memuat...
                    </div>
                  ) : (
                    <Select
                      onValueChange={(v) => form.setValue('pembelian_id', v ?? '', { shouldValidate: true })}
                      value={form.watch('pembelian_id')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih batch pembelian...">
                          {selectedPembelian
                            ? `${selectedPembelian.buah?.nama ?? '—'} · ${selectedPembelian.no_transaksi ?? selectedPembelian.id.slice(0, 8)}`
                            : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {pembelianList.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-medium">{p.buah?.nama ?? '—'}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {p.no_transaksi ?? p.id.slice(0, 8)} · {new Date(p.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {form.formState.errors.pembelian_id && (
                    <p className="text-xs text-red-500">{form.formState.errors.pembelian_id.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Tanggal Sortir <span className="text-red-500">*</span></Label>
                  <Input type="date" {...form.register('tanggal_sortir')} />
                  {form.formState.errors.tanggal_sortir && (
                    <p className="text-xs text-red-500">{form.formState.errors.tanggal_sortir.message}</p>
                  )}
                </div>
              </div>

              {/* Info Pembelian */}
              {selectedPembelian && (
                <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1.5">
                  <p className="font-semibold text-muted-foreground uppercase tracking-wide">Info Batch</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Buah</span>
                      <span className="font-medium">{selectedPembelian.buah?.nama ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pemasok</span>
                      <span className="font-medium">{selectedPembelian.pemasok?.nama ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Berat Bruto</span>
                      <span className="font-medium">{formatKg(selectedPembelian.berat_bruto_total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Net Yield Est.</span>
                      <span className="font-medium">{selectedPembelian.net_yield != null ? formatKg(selectedPembelian.net_yield) : '—'}</span>
                    </div>
                    {selectedPembelian.hpp_per_kg != null && (
                      <div className="flex justify-between col-span-2">
                        <span className="text-muted-foreground">HPP/kg</span>
                        <span className="font-medium">{formatRupiahFull(selectedPembelian.hpp_per_kg)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Hasil Sortir */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Hasil Sortir (kg)
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-green-700">Baik (kg) <span className="text-red-500">*</span></Label>
                    <Input
                      type="number" min="0" step="any" placeholder="0.00"
                      className="border-green-200 focus-visible:ring-green-300"
                      {...form.register('kg_baik', { valueAsNumber: true })}
                    />
                    {form.formState.errors.kg_baik && (
                      <p className="text-xs text-red-500">{form.formState.errors.kg_baik.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-amber-700">Reject (kg)</Label>
                    <Input
                      type="number" min="0" step="any" placeholder="0.00"
                      className="border-amber-200 focus-visible:ring-amber-300"
                      {...form.register('kg_reject', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-red-700">Busuk (kg)</Label>
                    <Input
                      type="number" min="0" step="any" placeholder="0.00"
                      className="border-red-200 focus-visible:ring-red-300"
                      {...form.register('kg_busuk', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                {/* Validasi total */}
                {breakdown.total > 0 && breakdown.bruto !== null && (
                  <div className={cn(
                    'mt-2 flex items-center gap-1.5 text-xs rounded-md px-3 py-2',
                    breakdown.overBruto
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : breakdown.underBruto
                        ? 'bg-amber-50 border border-amber-200 text-amber-700'
                        : 'bg-green-50 border border-green-200 text-green-700',
                  )}>
                    {breakdown.overBruto
                      ? <><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Total sortir ({formatKg(breakdown.total)}) melebihi berat bruto ({formatKg(breakdown.bruto)})</>
                      : breakdown.underBruto
                        ? <><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Total sortir ({formatKg(breakdown.total)}) kurang dari berat bruto ({formatKg(breakdown.bruto)}) — susut {formatKg(breakdown.bruto - breakdown.total)}</>
                        : <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Total sortir sesuai berat bruto ({formatKg(breakdown.total)})</>
                    }
                  </div>
                )}
              </div>

              {/* Harga Reject */}
              <div className="space-y-1.5">
                <Label>Harga Jual Reject per kg (Rp) <span className="text-muted-foreground text-xs">(opsional)</span></Label>
                <Input
                  type="number" min="0" step="100" placeholder="0"
                  className="max-w-xs"
                  {...form.register('harga_jual_reject_per_kg', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">Harga jual buah kelas reject dari batch ini</p>
              </div>

              <div className="space-y-1.5">
                <Label>Catatan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
                <Input placeholder="Catatan tambahan..." {...form.register('catatan')} />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving || !watchedValues.pembelian_id}>
                  {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Simpan Hasil Sortir
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ── PREVIEW KANAN ── */}
      <div>
        <Card className={cn(
          'border-2 md:sticky md:top-6',
          breakdown.total === 0 ? 'border-dashed' : breakdown.overBruto ? 'border-red-300' : 'border-green-300'
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Live Breakdown Sortir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {breakdown.total === 0 ? (
              <div className="py-8 text-center">
                <SlidersHorizontal className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">
                  Isi data sortir untuk melihat breakdown
                </p>
              </div>
            ) : (
              <>
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex h-5 w-full overflow-hidden rounded-full bg-muted">
                    {breakdown.pctBaik > 0 && (
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${breakdown.pctBaik}%` }}
                        title={`Baik: ${breakdown.pctBaik.toFixed(1)}%`}
                      />
                    )}
                    {breakdown.pctReject > 0 && (
                      <div
                        className="bg-amber-400 transition-all"
                        style={{ width: `${breakdown.pctReject}%` }}
                        title={`Reject: ${breakdown.pctReject.toFixed(1)}%`}
                      />
                    )}
                    {breakdown.pctBusuk > 0 && (
                      <div
                        className="bg-red-400 transition-all"
                        style={{ width: `${breakdown.pctBusuk}%` }}
                        title={`Busuk: ${breakdown.pctBusuk.toFixed(1)}%`}
                      />
                    )}
                  </div>
                  <div className="flex gap-3 text-xs flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />
                      Baik {breakdown.pctBaik.toFixed(1)}%
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" />
                      Reject {breakdown.pctReject.toFixed(1)}%
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400" />
                      Busuk {breakdown.pctBusuk.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700 font-medium">Baik</span>
                    <span className="font-semibold text-green-700">{formatKg(breakdown.baik)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-amber-700 font-medium">Reject</span>
                    <span className="font-semibold text-amber-700">{formatKg(breakdown.reject)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-700 font-medium">Busuk</span>
                    <span className="font-semibold text-red-700">{formatKg(breakdown.busuk)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-dashed border-muted pt-2">
                    <span className="font-semibold text-muted-foreground">Total Sortir</span>
                    <span className="font-bold">{formatKg(breakdown.total)}</span>
                  </div>
                  {breakdown.bruto !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Berat Bruto</span>
                      <span>{formatKg(breakdown.bruto)}</span>
                    </div>
                  )}
                </div>

                {/* Reject revenue hint */}
                {breakdown.reject > 0 && watchedValues.harga_jual_reject_per_kg > 0 && (
                  <>
                    <Separator />
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs space-y-1">
                      <p className="font-semibold text-amber-800">Estimasi Pendapatan Reject</p>
                      <div className="flex justify-between">
                        <span className="text-amber-700">Reject × Harga</span>
                        <span className="font-semibold text-amber-800">
                          {formatRupiahFull(breakdown.reject * watchedValues.harga_jual_reject_per_kg)}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Status badge */}
                <div className={cn(
                  'rounded-lg p-3 text-center text-xs font-medium flex items-center justify-center gap-1.5',
                  breakdown.overBruto
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-green-50 border border-green-200 text-green-700'
                )}>
                  {breakdown.overBruto
                    ? <><AlertTriangle className="h-3.5 w-3.5" /> Melebihi berat bruto</>
                    : <><CheckCircle2 className="h-3.5 w-3.5" /> Data sortir valid</>
                  }
                </div>

                {/* Kualitas info */}
                {breakdown.baik > 0 && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Stok Layak Jual (Baik)</p>
                    <p className="text-2xl font-bold text-primary">{formatKg(breakdown.baik)}</p>
                    <Badge variant="outline" className="mt-1 text-green-700 border-green-300">
                      {breakdown.pctBaik.toFixed(1)}% yield
                    </Badge>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
