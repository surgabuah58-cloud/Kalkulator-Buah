'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useSeason } from '@/context/season-context'
import { calculateHpp, formatRupiahFull, formatKg, formatPersen } from '@/lib/calculations/hpp'
import type { BuahRow, PemasokRow } from '@/types/database.types'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RupiahInput } from '@/components/ui/rupiah-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AlertTriangle, Calculator, Loader2, Sun, CloudRain, Plus, Trash2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// KONSTANTA
// ============================================================
const SATUAN_OPTIONS = [
  { value: 'peti',   label: 'Peti'   },
  { value: 'dus',    label: 'Dus'    },
  { value: 'karung', label: 'Karung' },
  { value: 'kg',     label: 'Kg'     },
  { value: 'pcs',    label: 'Pcs'    },
  { value: 'ikat',   label: 'Ikat'   },
  { value: 'koli',   label: 'Koli'   },
  { value: 'pak',    label: 'Pak'    },
  { value: 'ton',    label: 'Ton'    },
]

// ============================================================
// TIPE DATA ITEM
// ============================================================
interface ItemState {
  key: string
  buahId: string
  satuanOverride: string | undefined
  jumlah: string
  beratBruto: string   // tidak dipakai saat satuan=kg (auto=1)
  pcsPerKg: string     // opsional, hanya tampilan estimasi
  hargaBeli: number
  transport: number
  sortir: number
  recovery: number
  catatan: string
  errors: Record<string, string>
}

function emptyItem(): ItemState {
  return {
    key: Math.random().toString(36).slice(2),
    buahId: '',
    satuanOverride: undefined,
    jumlah: '1',
    beratBruto: '',
    pcsPerKg: '',
    hargaBeli: 0,
    transport: 0,
    sortir: 0,
    recovery: 0,
    catatan: '',
    errors: {},
  }
}

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function InputPembelianPage() {
  const supabase = createClient()
  const { musim, isKemarau } = useSeason()

  const [buahList, setBuahList]       = useState<BuahRow[]>([])
  const [pemasokList, setPemasokList] = useState<PemasokRow[]>([])
  const [isSaving, setIsSaving]       = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const [tanggal, setTanggal]           = useState(today)
  const [pemasokId, setPemasokId]       = useState('')
  const [pemasokError, setPemasokError] = useState('')

  const [items, setItems] = useState<ItemState[]>([emptyItem()])

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

  // ============================================================
  // HELPERS
  // ============================================================
  function updateItem(key: string, patch: Partial<ItemState>) {
    setItems(prev => prev.map(it => it.key === key ? { ...it, ...patch } : it))
  }

  function removeItem(key: string) {
    setItems(prev => prev.filter(it => it.key !== key))
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()])
  }

  function getItemBuah(item: ItemState): BuahRow | null {
    return buahList.find(b => b.id === item.buahId) ?? null
  }

  function getItemSatuan(item: ItemState): string {
    const buah = getItemBuah(item)
    return item.satuanOverride ?? buah?.satuan ?? 'peti'
  }

  // ============================================================
  // HPP KALKULASI PER ITEM
  // Kunci: satuan=kg -> beratPetiMusim=0 (tidak ada tara kemasan),
  //        beratBrutoPerKemasan=1 sehingga beratBrutoTotal = jumlahKg
  // ============================================================
  function computeItemHpp(item: ItemState) {
    const buah = getItemBuah(item)
    if (!buah) return null

    const satuan   = getItemSatuan(item)
    const isKgMode = satuan === 'kg'
    const jumlah   = parseFloat(item.jumlah) || 0
    const beratBrutoPerKemasan  = isKgMode ? 1 : (parseFloat(item.beratBruto) || 0)
    const beratBrutoTotal       = beratBrutoPerKemasan * jumlah
    const biayaTransportPerPeti = jumlah > 0 ? item.transport / jumlah : 0

    // Saat satuan=kg: tidak ada berat tara kemasan
    const beratPetiMusim = isKgMode ? 0 : (isKemarau ? buah.berat_peti_kemarau : buah.berat_peti_hujan)
    const pctAfkirMusim  = isKemarau ? buah.pct_afkir_kemarau : buah.pct_afkir_hujan

    // Estimasi pcs: bila diisi "X pcs per kg", beratPerPcsGram = 1000/X
    const pcsPerKgNum     = parseFloat(item.pcsPerKg) || 0
    const beratPerPcsGram = (isKgMode && pcsPerKgNum > 0) ? 1000 / pcsPerKgNum : undefined

    return calculateHpp({
      jumlahPeti:            jumlah,
      hargaBeliPerPeti:      item.hargaBeli,
      beratBrutoTotal,
      biayaTransportPerPeti,
      totalBiayaReguSortir:  item.sortir,
      nilaiRecoveryAfkir:    item.recovery,
      beratPetiMusim,
      pctAfkirMusim,
      beratPerPcsGram,
    })
  }

  // ============================================================
  // VALIDASI PER ITEM
  // ============================================================
  function validateItem(item: ItemState): Record<string, string> {
    const errors: Record<string, string> = {}
    const satuan   = getItemSatuan(item)
    const isKgMode = satuan === 'kg'

    if (!item.buahId) errors.buahId = 'Pilih buah'

    const jumlah = parseFloat(item.jumlah)
    if (!jumlah || jumlah <= 0) errors.jumlah = 'Jumlah harus > 0'

    if (!isKgMode) {
      const bb = parseFloat(item.beratBruto)
      if (!bb || bb <= 0) errors.beratBruto = 'Berat bruto per kemasan harus > 0'
    }

    if (item.hargaBeli <= 0) errors.hargaBeli = 'Harga beli harus diisi'

    const hpp = computeItemHpp(item)
    if (hpp && hpp.netYield <= 0) {
      errors.hpp = 'Net Yield <= 0: periksa data berat dan parameter musim'
    }

    return errors
  }

  // ============================================================
  // SIMPAN SEMUA ITEM
  // ============================================================
  async function handleSave() {
    if (!pemasokId) {
      setPemasokError('Pilih pemasok')
      return
    }
    setPemasokError('')

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
        const buah     = getItemBuah(item)!
        const satuan   = getItemSatuan(item)
        const isKgMode = satuan === 'kg'
        const jumlah   = parseFloat(item.jumlah) || 0
        const beratBrutoPerKemasan  = isKgMode ? 1 : (parseFloat(item.beratBruto) || 0)
        const beratBrutoTotal       = beratBrutoPerKemasan * jumlah
        const biayaTransportPerPeti = jumlah > 0 ? item.transport / jumlah : 0
        const hpp = computeItemHpp(item)!

        return supabase.from('pembelian').insert({
          tanggal,
          buah_id:                  item.buahId,
          pemasok_id:               pemasokId,
          musim,
          jumlah_peti:              jumlah,
          harga_beli_per_peti:      item.hargaBeli,
          berat_bruto_total:        beratBrutoTotal,
          biaya_transport_per_peti: biayaTransportPerPeti,
          total_biaya_regu_sortir:  item.sortir,
          nilai_recovery_afkir:     item.recovery,
          snap_berat_peti_used:     isKgMode ? 0 : (isKemarau ? buah.berat_peti_kemarau : buah.berat_peti_hujan),
          snap_pct_afkir_used:      isKemarau ? buah.pct_afkir_kemarau : buah.pct_afkir_hujan,
          landed_cost:              hpp.totalLandedCost,
          berat_afkir:              hpp.beratAfkir,
          net_yield:                hpp.netYield,
          biaya_kuli_sortir_per_kg: hpp.biayaKuliSortirPerKg,
          hpp_per_kg:               hpp.hppPerKg,
          catatan:                  item.catatan || null,
        })
      })

      const results  = await Promise.all(insertPromises)
      const failures = results.filter(r => r.error)

      if (failures.length > 0) {
        toast.error(`${failures.length} item gagal disimpan: ${failures[0].error?.message}`)
      } else {
        toast.success(
          items.length > 1
            ? `${items.length} transaksi pembelian berhasil disimpan`
            : 'Transaksi pembelian berhasil disimpan'
        )
        setItems([emptyItem()])
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan')
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4">

      {/* ===== HEADER: Tanggal + Pemasok (shared) ===== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Form Pembelian Baru</CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              Musim aktif:{' '}
              <Badge
                variant="outline"
                className={cn(
                  isKemarau
                    ? 'border-amber-300 text-amber-700 bg-amber-50'
                    : 'border-blue-300 text-blue-700 bg-blue-50'
                )}
              >
                {isKemarau
                  ? <Sun className="mr-1 h-3 w-3 inline" />
                  : <CloudRain className="mr-1 h-3 w-3 inline" />}
                {isKemarau ? 'Kemarau' : 'Hujan'}
              </Badge>
              {' '}&mdash; Parameter buah akan menyesuaikan musim ini
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Tanggal <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Pemasok <span className="text-red-500">*</span></Label>
              <Select
                value={pemasokId}
                onValueChange={v => { setPemasokId(v ?? ''); setPemasokError('') }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pemasok...">
                    {pemasokList.find(p => p.id === pemasokId)?.nama ?? null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {pemasokList.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pemasokError && <p className="text-xs text-red-500">{pemasokError}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== DAFTAR ITEM ===== */}
      {items.map((item, index) => {
        const buah        = getItemBuah(item)
        const satuan      = getItemSatuan(item)
        const isKgMode    = satuan === 'kg'
        const satuanLabel = satuan.charAt(0).toUpperCase() + satuan.slice(1)
        const hpp         = buah ? computeItemHpp(item) : null
        const jumlahNum   = parseFloat(item.jumlah) || 0
        const beratBrutoNum = parseFloat(item.beratBruto) || 0
        const hasErrors   = Object.values(item.errors).some(v => v)

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
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.key)}
                    className="h-7 gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                {/* ---- FORM FIELDS (2/3) ---- */}
                <div className="lg:col-span-2 space-y-5">

                  {/* Pilih Buah */}
                  <div className="space-y-1.5">
                    <Label>Buah <span className="text-red-500">*</span></Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={item.buahId}
                        onValueChange={v => {
                          const newErrors = { ...item.errors }
                          delete newErrors.buahId
                          updateItem(item.key, { buahId: v ?? '', satuanOverride: undefined, errors: newErrors })
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
                      <Link
                        href="/master-buah"
                        className="shrink-0 inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground shadow-xs hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" /> Buat Baru
                      </Link>
                    </div>
                    {item.errors.buahId && (
                      <p className="text-xs text-red-500">{item.errors.buahId}</p>
                    )}
                  </div>

                  <Separator />

                  {/* DATA FISIK */}
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Data Fisik
                    </p>
                    <div className="grid grid-cols-2 gap-4">

                      {/* Satuan Kemasan */}
                      <div className="space-y-1.5 col-span-2">
                        <Label>Satuan Kemasan</Label>
                        <div className="flex items-center gap-2">
                          <Select
                            value={satuan}
                            onValueChange={v => updateItem(item.key, { satuanOverride: v ?? undefined })}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false}>
                              {SATUAN_OPTIONS.map(o => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {buah && item.satuanOverride && item.satuanOverride !== buah.satuan && (
                            <span className="text-xs text-amber-600">
                              Default: <strong>{buah.satuan}</strong> &mdash; sedang di-override
                            </span>
                          )}
                          {(!item.satuanOverride || (buah && item.satuanOverride === buah.satuan)) && buah?.satuan && (
                            <span className="text-xs text-muted-foreground">Dari master buah</span>
                          )}
                        </div>
                      </div>

                      {/* Jumlah */}
                      <div className="space-y-1.5">
                        <Label>Jumlah {satuanLabel} <span className="text-red-500">*</span></Label>
                        <Input
                          type="number" min="0.1" step="0.1"
                          value={item.jumlah}
                          onChange={e => {
                            const newErrors = { ...item.errors }
                            delete newErrors.jumlah
                            updateItem(item.key, { jumlah: e.target.value, errors: newErrors })
                          }}
                        />
                        {item.errors.jumlah && (
                          <p className="text-xs text-red-500">{item.errors.jumlah}</p>
                        )}
                        {isKgMode && jumlahNum > 0 && (
                          <p className="text-xs text-primary font-medium">
                            Total berat bruto: {jumlahNum.toFixed(2)} kg
                          </p>
                        )}
                      </div>

                      {/* Berat Bruto per Kemasan - DISEMBUNYIKAN saat satuan=kg */}
                      {!isKgMode && (
                        <div className="space-y-1.5">
                          <Label>Berat Bruto per {satuanLabel} (kg) <span className="text-red-500">*</span></Label>
                          <Input
                            type="number" min="0" step="0.1" placeholder="contoh: 6.5"
                            value={item.beratBruto}
                            onChange={e => {
                              const newErrors = { ...item.errors }
                              delete newErrors.beratBruto
                              updateItem(item.key, { beratBruto: e.target.value, errors: newErrors })
                            }}
                          />
                          {item.errors.beratBruto && (
                            <p className="text-xs text-red-500">{item.errors.beratBruto}</p>
                          )}
                          {beratBrutoNum > 0 && jumlahNum > 0 && (
                            <p className="text-xs text-primary font-medium">
                              Total: {(beratBrutoNum * jumlahNum).toFixed(2)} kg
                            </p>
                          )}
                        </div>
                      )}

                      {/* Pcs per Kg - HANYA saat satuan=kg, opsional */}
                      {isKgMode && (
                        <div className="space-y-1.5">
                          <Label>
                            Pcs per Kg{' '}
                            <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
                          </Label>
                          <Input
                            type="number" min="0" step="0.1" placeholder="contoh: 8"
                            value={item.pcsPerKg}
                            onChange={e => updateItem(item.key, { pcsPerKg: e.target.value })}
                          />
                          {hpp && hpp.totalPcs !== null && (
                            <p className="text-xs text-primary font-medium">
                              approx {hpp.totalPcs.toLocaleString('id-ID')} pcs dari {formatKg(hpp.netYield)} net yield
                            </p>
                          )}
                        </div>
                      )}

                      {/* Info parameter musim */}
                      {buah && (
                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                          <Label className="text-xs text-muted-foreground">
                            Parameter Musim Aktif{' '}
                            <span className="font-medium text-foreground">
                              {isKgMode
                                ? `(${formatPersen(isKemarau ? buah.pct_afkir_kemarau : buah.pct_afkir_hujan)} afkir, tanpa tara kemasan)`
                                : `(${isKemarau ? buah.berat_peti_kemarau : buah.berat_peti_hujan} kg/${satuan}, ${formatPersen(isKemarau ? buah.pct_afkir_kemarau : buah.pct_afkir_hujan)} afkir)`
                              }
                            </span>
                          </Label>
                          <div className={cn(
                            'flex h-9 items-center rounded-md border px-3 text-sm text-muted-foreground',
                            isKemarau ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'
                          )}>
                            Otomatis dari master buah
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* DATA BIAYA */}
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Data Biaya (Rp)
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Harga Beli per {satuanLabel} (Rp) <span className="text-red-500">*</span></Label>
                        <RupiahInput
                          value={item.hargaBeli}
                          onChange={v => {
                            const newErrors = { ...item.errors }
                            delete newErrors.hargaBeli
                            updateItem(item.key, { hargaBeli: v, errors: newErrors })
                          }}
                          placeholder="Contoh: 150.000"
                        />
                        {item.errors.hargaBeli && (
                          <p className="text-xs text-red-500">{item.errors.hargaBeli}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Biaya Angkut / Transport Borongan (Rp)</Label>
                        <RupiahInput
                          value={item.transport}
                          onChange={v => updateItem(item.key, { transport: v })}
                          placeholder="Contoh: 300.000"
                        />
                        <p className="text-xs text-muted-foreground">Total 1 trip: BBM + sopir + retribusi</p>
                        {item.transport > 0 && jumlahNum > 0 && (
                          <p className="text-xs text-primary font-medium">
                            = {new Intl.NumberFormat('id-ID', {
                              style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
                            }).format(item.transport / jumlahNum)} / {satuan}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Total Biaya Regu Sortir (Rp)</Label>
                        <RupiahInput
                          value={item.sortir}
                          onChange={v => updateItem(item.key, { sortir: v })}
                          placeholder="Contoh: 50.000"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Nilai Recovery Buah Afkir (Rp)</Label>
                        <RupiahInput
                          value={item.recovery}
                          onChange={v => updateItem(item.key, { recovery: v })}
                          placeholder="Contoh: 20.000"
                        />
                        <p className="text-xs text-muted-foreground">Pendapatan dari jual buah afkir/rusak</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Catatan</Label>
                    <Input
                      placeholder="Catatan tambahan..."
                      value={item.catatan}
                      onChange={e => updateItem(item.key, { catatan: e.target.value })}
                    />
                  </div>

                  {item.errors.hpp && (
                    <div className="rounded-md bg-red-50 border border-red-200 p-2">
                      <p className="text-xs text-red-600 flex items-start gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        {item.errors.hpp}
                      </p>
                    </div>
                  )}
                </div>

                {/* ---- PREVIEW HPP (1/3) ---- */}
                <div>
                  <Card className={cn(
                    'sticky top-6 border',
                    !hpp           ? 'border-dashed' :
                    hpp.isValid && hpp.netYield > 0 ? 'border-green-300' : 'border-red-300'
                  )}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-1.5 text-xs">
                        <Calculator className="h-3.5 w-3.5" />
                        Live Preview HPP
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {!buah ? (
                        <p className="py-3 text-center text-xs text-muted-foreground">
                          Pilih buah untuk kalkulasi
                        </p>
                      ) : !hpp ? null : (
                        <>
                          {hpp.validationErrors.length > 0 && (
                            <div className="rounded-md bg-red-50 border border-red-200 p-2 space-y-1">
                              {hpp.validationErrors.map((err, i) => (
                                <p key={i} className="text-xs text-red-600 flex items-start gap-1">
                                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  {err}
                                </p>
                              ))}
                            </div>
                          )}

                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Landed Cost/{satuanLabel}</span>
                              <span className="font-medium">{formatRupiahFull(hpp.landedCostPerPeti)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Landed Cost</span>
                              <span className="font-medium">{formatRupiahFull(hpp.totalLandedCost)}</span>
                            </div>
                            <Separator />
                            {!isKgMode && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Berat Tara {satuanLabel} Total</span>
                                <span>{formatKg(hpp.beratPetiTotal)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Berat Afkir</span>
                              <span className="text-amber-600">- {formatKg(hpp.beratAfkir)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span>Net Yield (Jual)</span>
                              <span className={cn(
                                hpp.netYield > 0 ? 'text-green-600' : 'text-red-600'
                              )}>
                                {formatKg(hpp.netYield)}
                              </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Biaya Kuli/Kg</span>
                              <span>{formatRupiahFull(hpp.biayaKuliSortirPerKg)}</span>
                            </div>
                          </div>

                          <div className={cn(
                            'rounded-lg p-2.5 text-center',
                            hpp.isValid && hpp.netYield > 0
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-red-50 border border-red-200'
                          )}>
                            <p className="text-xs text-muted-foreground mb-0.5">True HPP per Kg</p>
                            <p className={cn(
                              'text-2xl font-bold',
                              hpp.isValid && hpp.netYield > 0 ? 'text-green-700' : 'text-red-600'
                            )}>
                              {formatRupiahFull(hpp.hppPerKg)}
                            </p>
                          </div>

                          {isKgMode && hpp.totalPcs !== null && (
                            <p className="text-center text-xs text-primary font-medium">
                              approx {hpp.totalPcs.toLocaleString('id-ID')} pcs total
                            </p>
                          )}

                          <div className={cn(
                            'rounded-md p-1.5 text-xs flex items-center gap-1.5',
                            isKemarau ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                          )}>
                            {isKemarau ? <Sun className="h-3 w-3 shrink-0" /> : <CloudRain className="h-3 w-3 shrink-0" />}
                            <span>
                              {isKemarau ? 'Kemarau' : 'Hujan'}
                              {isKgMode
                                ? ''
                                : `: ${formatKg(isKemarau ? buah.berat_peti_kemarau : buah.berat_peti_hujan)}/${satuan}`
                              },{' '}
                              {formatPersen(isKemarau ? buah.pct_afkir_kemarau : buah.pct_afkir_hujan)} afkir
                            </span>
                          </div>
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
          onClick={addItem}
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
