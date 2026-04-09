'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useSeason } from '@/context/season-context'
import { calculateHpp, formatRupiahFull, formatKg, formatPersen } from '@/lib/calculations/hpp'
import type { BuahRow, PemasokRow } from '@/types/database.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AlertTriangle, Calculator, CheckCircle2, Loader2, Sun, CloudRain } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// SCHEMA VALIDASI
// ============================================================
const pembelianSchema = z.object({
  buah_id:                    z.string().min(1, 'Pilih buah'),
  pemasok_id:                 z.string().min(1, 'Pilih pemasok'),
  tanggal:                    z.string().min(1, 'Tanggal wajib diisi'),
  jumlah_peti:                z.number().min(1, 'Min. 1 kemasan'),
  harga_beli_per_peti:        z.number().min(0),
  berat_bruto_per_kemasan:    z.number().min(0.01, 'Berat per kemasan harus > 0'),
  biaya_transport_borongan:   z.number().min(0),
  total_biaya_regu_sortir:    z.number().min(0),
  nilai_recovery_afkir:       z.number().min(0),
  catatan:                    z.string().optional(),
})
type PembelianFormValues = z.infer<typeof pembelianSchema>

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function InputPembelianPage() {
  const supabase = createClient()
  const { musim, isKemarau } = useSeason()

  const [buahList, setBuahList]         = useState<BuahRow[]>([])
  const [pemasokList, setPemasokList]   = useState<PemasokRow[]>([])
  const [selectedBuah, setSelectedBuah] = useState<BuahRow | null>(null)
  const [isSaving, setIsSaving]         = useState(false)

  // Satuan label dinamis dari master buah
  const satuanLabel = selectedBuah?.satuan
    ? selectedBuah.satuan.charAt(0).toUpperCase() + selectedBuah.satuan.slice(1)
    : 'Peti'

  const today = new Date().toISOString().split('T')[0]

  const form = useForm<PembelianFormValues>({ 
    resolver: zodResolver(pembelianSchema),
    defaultValues: {
      buah_id: '', pemasok_id: '', tanggal: today,
      jumlah_peti: 1, harga_beli_per_peti: 0, berat_bruto_per_kemasan: 0,
      biaya_transport_borongan: 0, total_biaya_regu_sortir: 0,
      nilai_recovery_afkir: 0, catatan: '',
    },
  })

  // Watch semua field untuk live kalkulasi
  const watchedValues = useWatch({ control: form.control })

  // ============================================================
  // FETCH DATA MASTER
  // ============================================================
  useEffect(() => {
    async function fetchMasterData() {
      const [{ data: buahData }, { data: pemasokData }] = await Promise.all([
        supabase.from('buah').select('*').eq('is_active', true).order('nama'),
        supabase.from('pemasok').select('*').eq('is_active', true).order('nama'),
      ])
      setBuahList(buahData ?? [])
      setPemasokList(pemasokData ?? [])
    }
    fetchMasterData()
  }, [])

  // Update selectedBuah saat buah_id berubah
  useEffect(() => {
    if (watchedValues.buah_id) {
      const found = buahList.find(b => b.id === watchedValues.buah_id)
      setSelectedBuah(found ?? null)
    } else {
      setSelectedBuah(null)
    }
  }, [watchedValues.buah_id, buahList])

  // ============================================================
  // LIVE KALKULASI HPP (useMemo — tidak re-render berlebihan)
  // ============================================================
  const hppResult = useMemo(() => {
    if (!selectedBuah) return null

    const beratPetiMusim = isKemarau
      ? selectedBuah.berat_peti_kemarau
      : selectedBuah.berat_peti_hujan
    const pctAfkirMusim = isKemarau
      ? selectedBuah.pct_afkir_kemarau
      : selectedBuah.pct_afkir_hujan

    const params = {
      jumlahPeti:             Number(watchedValues.jumlah_peti)                  || 0,
      hargaBeliPerPeti:       Number(watchedValues.harga_beli_per_peti)          || 0,
      // Auto-hitung berat bruto total dari per kemasan × jumlah
      beratBrutoTotal:        (Number(watchedValues.berat_bruto_per_kemasan) || 0)
                              * (Number(watchedValues.jumlah_peti) || 0),
      // Auto-bagi transport borongan dengan jumlah kemasan
      biayaTransportPerPeti:  Number(watchedValues.jumlah_peti) > 0
                                ? (Number(watchedValues.biaya_transport_borongan) || 0) / Number(watchedValues.jumlah_peti)
                                : 0,
      totalBiayaReguSortir:   Number(watchedValues.total_biaya_regu_sortir)      || 0,
      nilaiRecoveryAfkir:     Number(watchedValues.nilai_recovery_afkir)         || 0,
      beratPetiMusim,
      pctAfkirMusim,
    }

    return calculateHpp(params)
  }, [watchedValues, selectedBuah, isKemarau])

  // ============================================================
  // SUBMIT HANDLER
  // ============================================================
  async function onSubmit(values: PembelianFormValues) {
    if (!hppResult || !hppResult.isValid) {
      toast.error('Perbaiki error kalkulasi sebelum menyimpan')
      return
    }
    if (hppResult.netYield <= 0) {
      toast.error('Net Yield ≤ 0. Periksa data berat bruto dan parameter musim.')
      return
    }

    setIsSaving(true)
    const jumlah = values.jumlah_peti
    const beratBrutoTotal      = values.berat_bruto_per_kemasan * jumlah
    const biayaTransportPerPeti = jumlah > 0 ? values.biaya_transport_borongan / jumlah : 0

    const { error } = await supabase.from('pembelian').insert({
      tanggal:                  values.tanggal,
      buah_id:                  values.buah_id,
      pemasok_id:               values.pemasok_id,
      musim,
      jumlah_peti:              jumlah,
      harga_beli_per_peti:      values.harga_beli_per_peti,
      berat_bruto_total:        beratBrutoTotal,
      biaya_transport_per_peti: biayaTransportPerPeti,
      total_biaya_regu_sortir:  values.total_biaya_regu_sortir,
      nilai_recovery_afkir:     values.nilai_recovery_afkir,
      // Simpan snapshot kalkulasi untuk audit
      snap_berat_peti_used:     isKemarau ? selectedBuah!.berat_peti_kemarau : selectedBuah!.berat_peti_hujan,
      snap_pct_afkir_used:      isKemarau ? selectedBuah!.pct_afkir_kemarau : selectedBuah!.pct_afkir_hujan,
      landed_cost:              hppResult.totalLandedCost,
      berat_afkir:              hppResult.beratAfkir,
      net_yield:                hppResult.netYield,
      biaya_kuli_sortir_per_kg: hppResult.biayaKuliSortirPerKg,
      hpp_per_kg:               hppResult.hppPerKg,
      catatan:                  values.catatan || null,
    })

    if (error) {
      toast.error('Gagal menyimpan: ' + error.message)
    } else {
      toast.success('Transaksi pembelian berhasil disimpan')
      form.reset({
        ...form.getValues(),
        buah_id: '', pemasok_id: '',
        jumlah_peti: 1, harga_beli_per_peti: 0, berat_bruto_per_kemasan: 0,
        biaya_transport_borongan: 0, total_biaya_regu_sortir: 0,
        nilai_recovery_afkir: 0, catatan: '',
      })
    }
    setIsSaving(false)
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* === FORM KIRI === */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Form Pembelian Baru</CardTitle>
            <CardDescription>
              Musim aktif:{' '}
              <Badge
                variant="outline"
                className={cn(
                  isKemarau
                    ? 'border-amber-300 text-amber-700 bg-amber-50'
                    : 'border-blue-300 text-blue-700 bg-blue-50'
                )}
              >
                {isKemarau ? <Sun className="mr-1 h-3 w-3 inline" /> : <CloudRain className="mr-1 h-3 w-3 inline" />}
                {isKemarau ? 'Kemarau' : 'Hujan'}
              </Badge>
              {' '}— Parameter buah akan menyesuaikan musim ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Baris 1: Tanggal, Buah, Pemasok */}
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
                    <SelectContent>
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
                  <Label>Pemasok <span className="text-red-500">*</span></Label>
                  <Select
                    onValueChange={(v) => form.setValue('pemasok_id', v ?? '', { shouldValidate: true })}
                    value={form.watch('pemasok_id')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pemasok...">
                        {pemasokList.find(p => p.id === form.watch('pemasok_id'))?.nama ?? null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {pemasokList.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.pemasok_id && (
                    <p className="text-xs text-red-500">{form.formState.errors.pemasok_id.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Baris 2: Data Fisik Peti */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Data Fisik
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Jumlah {satuanLabel}</Label>
                    <Input type="number" min="1" step="1" {...form.register('jumlah_peti', { valueAsNumber: true })} />
                    {form.formState.errors.jumlah_peti && (
                      <p className="text-xs text-red-500">{form.formState.errors.jumlah_peti.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Berat Bruto per {satuanLabel} (kg)</Label>
                    <Input type="number" min="0" step="0.1" placeholder="contoh: 6.5" {...form.register('berat_bruto_per_kemasan', { valueAsNumber: true })} />
                    {form.formState.errors.berat_bruto_per_kemasan && (
                      <p className="text-xs text-red-500">{form.formState.errors.berat_bruto_per_kemasan.message}</p>
                    )}
                    {/* Auto-total preview */}
                    {(form.watch('berat_bruto_per_kemasan') || 0) > 0 && (form.watch('jumlah_peti') || 0) > 0 && (
                      <p className="text-xs text-primary font-medium">
                        Total: {((form.watch('berat_bruto_per_kemasan') || 0) * (form.watch('jumlah_peti') || 0)).toFixed(2)} kg
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-muted-foreground text-xs block">
                      Parameter Musim Aktif{' '}
                      {selectedBuah && (
                        <span className="font-medium text-foreground">
                          ({isKemarau ? selectedBuah.berat_peti_kemarau : selectedBuah.berat_peti_hujan} kg/{satuanLabel.toLowerCase()},{' '}
                          {isKemarau ? selectedBuah.pct_afkir_kemarau : selectedBuah.pct_afkir_hujan}% afkir)
                        </span>
                      )}
                    </Label>
                    <div className={cn(
                      'flex h-9 items-center rounded-md border px-3 text-sm text-muted-foreground',
                      isKemarau ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'
                    )}>
                      {selectedBuah ? 'Otomatis dari master buah' : 'Pilih buah dulu'}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Baris 3: Data Biaya */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Data Biaya (Rp)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Harga Beli per {satuanLabel} (Rp)</Label>
                    <Input type="number" min="0" step="1000" {...form.register('harga_beli_per_peti', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Biaya Angkut / Transport Borongan (Rp)</Label>
                    <Input type="number" min="0" step="1000" {...form.register('biaya_transport_borongan', { valueAsNumber: true })} />
                    <p className="text-xs text-muted-foreground">Total 1 trip: BBM + sopir + retribusi</p>
                    {(form.watch('biaya_transport_borongan') || 0) > 0 && (form.watch('jumlah_peti') || 0) > 0 && (
                      <p className="text-xs text-primary font-medium">
                        = {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
                            (form.watch('biaya_transport_borongan') || 0) / (form.watch('jumlah_peti') || 1)
                          )} / {satuanLabel.toLowerCase()}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Total Biaya Regu Sortir (Rp)</Label>
                    <Input type="number" min="0" step="1000" {...form.register('total_biaya_regu_sortir', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nilai Recovery Buah Afkir (Rp)</Label>
                    <Input type="number" min="0" step="1000" {...form.register('nilai_recovery_afkir', { valueAsNumber: true })} />
                    <p className="text-xs text-muted-foreground">Pendapatan dari jual buah afkir/rusak</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Catatan</Label>
                <Input placeholder="Catatan tambahan..." {...form.register('catatan')} />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving || !hppResult?.isValid} className="min-w-32">
                  {isSaving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Simpan Transaksi
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* === PREVIEW CARD KANAN === */}
      <div className="space-y-4">
        <Card className={cn(
          'sticky top-6 border-2',
          !hppResult ? 'border-dashed' :
          hppResult.isValid ? 'border-green-300' : 'border-red-300'
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calculator className="h-4 w-4" />
              Live Preview HPP
            </CardTitle>
            <CardDescription className="text-xs">
              Kalkulasi otomatis berdasarkan input Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedBuah ? (
              <p className="text-sm text-center text-muted-foreground py-4">
                Pilih buah untuk melihat kalkulasi HPP
              </p>
            ) : !hppResult ? null : (
              <>
                {/* Error state */}
                {!hppResult.isValid && hppResult.validationErrors.length > 0 && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-3 space-y-1">
                    {hppResult.validationErrors.map((err, i) => (
                      <p key={i} className="text-xs text-red-600 flex items-start gap-1">
                        <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {err}
                      </p>
                    ))}
                  </div>
                )}

                {/* Breakdown Kalkulasi */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Landed Cost/{satuanLabel}</span>
                    <span className="font-medium">{formatRupiahFull(hppResult.landedCostPerPeti)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Landed Cost</span>
                    <span className="font-medium">{formatRupiahFull(hppResult.totalLandedCost)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Berat Tara {satuanLabel} Total</span>
                    <span>{formatKg(hppResult.beratPetiTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Berat Afkir</span>
                    <span className="text-amber-600">- {formatKg(hppResult.beratAfkir)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Net Yield (Jual)</span>
                    <span className={cn(
                      hppResult.netYield > 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {formatKg(hppResult.netYield)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Biaya Kuli/Kg</span>
                    <span>{formatRupiahFull(hppResult.biayaKuliSortirPerKg)}</span>
                  </div>
                </div>

                <Separator />

                {/* RESULT UTAMA */}
                <div className={cn(
                  'rounded-lg p-3 text-center',
                  hppResult.isValid && hppResult.netYield > 0
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                )}>
                  <p className="text-xs text-muted-foreground mb-1">True HPP per Kg</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    hppResult.isValid && hppResult.netYield > 0 ? 'text-green-700' : 'text-red-600'
                  )}>
                    {formatRupiahFull(hppResult.hppPerKg)}
                  </p>
                  {hppResult.isValid && !hppResult.validationErrors.length && (
                    <p className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Siap disimpan
                    </p>
                  )}
                </div>

                {/* Info musim */}
                <div className={cn(
                  'rounded-md p-2 text-xs flex items-center gap-2',
                  isKemarau ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                )}>
                  {isKemarau ? <Sun className="h-3 w-3" /> : <CloudRain className="h-3 w-3" />}
                  <span>
                    Menggunakan parameter {isKemarau ? 'Kemarau' : 'Hujan'}:{' '}
                    {formatKg(isKemarau ? selectedBuah.berat_peti_kemarau : selectedBuah.berat_peti_hujan)}/{satuanLabel.toLowerCase()},{' '}
                    {formatPersen(isKemarau ? selectedBuah.pct_afkir_kemarau : selectedBuah.pct_afkir_hujan)} afkir
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
