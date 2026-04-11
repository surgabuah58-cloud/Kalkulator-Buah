'use client'

import { useMemo, useState } from 'react'
import { useSeason } from '@/context/season-context'
import { calculateHpp, formatRupiahFull } from '@/lib/calculations/hpp'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Sun, CloudRain, Plus, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createItem, DEFAULT_BIAYA_BERSAMA, type ItemBuah, type BiayaBersama } from './types'
import { KalkulatorItem } from './KalkulatorItem'
import { HasilKalkulasiPanel } from './HasilKalkulasiPanel'

let _counter = 1
function newId() { return String(_counter++) }

export default function KalkulatorPage() {
  const { isKemarau } = useSeason()
  const [items, setItems] = useState<ItemBuah[]>([createItem(newId())])
  const [biayaBersama, setBiayaBersama] = useState<BiayaBersama>(DEFAULT_BIAYA_BERSAMA)

  // ── Handlers ──
  function handleItemChange(id: string, field: keyof ItemBuah, value: string | boolean) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it))
  }

  function handleAddItem() {
    setItems(prev => [...prev, createItem(newId())])
  }

  function handleRemoveItem(id: string) {
    setItems(prev => prev.filter(it => it.id !== id))
  }

  function handleReset() {
    _counter = 1
    setItems([createItem(newId())])
    setBiayaBersama(DEFAULT_BIAYA_BERSAMA)
  }

  // ── Kalkulasi ──
  const transportBorongan = parseFloat(biayaBersama.biaya_transport_borongan) || 0
  // Transport dibagi rata ke semua kemasan dari semua item
  const totalSemuaKemasan = items.reduce((s, it) => s + (parseFloat(it.jumlah_kemasan) || 0), 0)
  const transportPerKemasan = totalSemuaKemasan > 0 ? transportBorongan / totalSemuaKemasan : 0

  const hasilList = useMemo(() => {
    return items.map(item => {
      const jumlah      = parseFloat(item.jumlah_kemasan) || 0
      const brutoPerKem = parseFloat(item.berat_bruto_per_kemasan) || 0
      const brutoTotal  = jumlah * brutoPerKem
      const tara        = parseFloat(item.berat_tara_kemasan) || 0
      const nettoTotal  = Math.max(0, brutoTotal - tara * jumlah)

      // Harga beli per kemasan
      let hargaBeliPerKemasan: number
      if (item.mode_harga_beli === 'per_kg_netto') {
        const hargaKg = parseFloat(item.harga_beli_per_kg_netto) || 0
        hargaBeliPerKemasan = jumlah > 0 ? (hargaKg * nettoTotal) / jumlah : 0
      } else {
        hargaBeliPerKemasan = parseFloat(item.harga_beli_per_kemasan) || 0
      }

      const result = calculateHpp({
        jumlahPeti:             jumlah,
        hargaBeliPerPeti:       hargaBeliPerKemasan,
        beratBrutoTotal:        brutoTotal,
        biayaTransportPerPeti:  transportPerKemasan,
        totalBiayaReguSortir:   parseFloat(item.biaya_sortir) || 0,
        nilaiRecoveryAfkir:     parseFloat(item.nilai_recovery_afkir) || 0,
        beratPetiMusim:         tara,
        pctAfkirMusim:          parseFloat(item.pct_afkir) || 0,
      })

      // Distribusi ukuran L/M/S
      const pL = parseFloat(item.dist_l_pct) || 0
      const pM = parseFloat(item.dist_m_pct) || 0
      const pS = parseFloat(item.dist_s_pct) || 0
      const gL = parseFloat(item.dist_l_gram) || 0
      const gM = parseFloat(item.dist_m_gram) || 0
      const gS = parseFloat(item.dist_s_gram) || 0
      const totalPct = pL + pM + pS
      const aktif = item.aktif_distribusi && Math.abs(totalPct - 100) < 0.5

      const beratRataGram = aktif && totalPct > 0
        ? (gL * pL + gM * pM + gS * pS) / totalPct
        : 0

      const nettoPerKem = jumlah > 0 ? nettoTotal / jumlah : 0
      const estimasiPcsPerKemasan = aktif && beratRataGram > 0
        ? Math.round((nettoPerKem * 1000) / beratRataGram)
        : 0
      const estimasiTotalPcs = estimasiPcsPerKemasan * jumlah

      const pcsL = Math.round(estimasiTotalPcs * pL / 100)
      const pcsM = Math.round(estimasiTotalPcs * pM / 100)
      const pcsS = estimasiTotalPcs - pcsL - pcsM

      const hpp = result.hppPerKg
      const hppPerPcsL = aktif && gL > 0 ? (hpp * gL) / 1000 : null
      const hppPerPcsM = aktif && gM > 0 ? (hpp * gM) / 1000 : null
      const hppPerPcsS = aktif && gS > 0 ? (hpp * gS) / 1000 : null

      const hasInput = hargaBeliPerKemasan > 0 || brutoTotal > 0

      return {
        item,
        result,
        hargaBeliPerKemasan,
        transportPerKemasan,
        beratRataGram,
        estimasiPcsPerKemasan,
        estimasiTotalPcs,
        pcsL, pcsM, pcsS,
        hppPerPcsL, hppPerPcsM, hppPerPcsS,
        hasInput,
      }
    }).filter(h => h.hasInput)
  }, [items, transportPerKemasan])

  const hasAnyInput = items.some(it =>
    it.berat_bruto_per_kemasan !== '' ||
    it.harga_beli_per_kemasan !== '' ||
    it.harga_beli_per_kg_netto !== ''
  )

  return (
    <div className="max-w-5xl space-y-4">
      {/* Info Banner */}
      <div className={cn(
        'rounded-lg border px-3 py-2.5 text-xs flex items-start gap-2',
        isKemarau
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-blue-200 bg-blue-50 text-blue-800'
      )}>
        {isKemarau ? <Sun className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> : <CloudRain className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />}
        <span>
          Kalkulator cepat — <strong>tanpa simpan ke database</strong>.
          Musim aktif: <strong>{isKemarau ? 'Kemarau' : 'Hujan'}</strong>.
          Bisa input <strong>beberapa jenis buah sekaligus</strong> dalam 1 muat.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ── KOLOM KIRI: Form input ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Transport borongan bersama */}
          <Card>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm">Biaya Transport Borongan (1 Trip)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Total Biaya Angkut (Rp) — BBM + sopir + retribusi</Label>
                <Input
                  type="number" min="0" step="1000" placeholder="0"
                  value={biayaBersama.biaya_transport_borongan}
                  onChange={e => setBiayaBersama({ biaya_transport_borongan: e.target.value })}
                />
              </div>
              {transportBorongan > 0 && totalSemuaKemasan > 0 && (
                <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Dialokasikan rata: </span>
                  <span className="font-semibold text-primary">{formatRupiahFull(transportPerKemasan)} / kemasan</span>
                  <span className="text-muted-foreground"> ({totalSemuaKemasan} kemasan total)</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* List item buah */}
          {items.map((item, i) => (
            <KalkulatorItem
              key={item.id}
              item={item}
              index={i}
              totalItems={items.length}
              transportBorongan={transportBorongan}
              isKemarau={isKemarau}
              onChange={handleItemChange}
              onRemove={handleRemoveItem}
            />
          ))}

          {/* Tambah item + reset */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline" size="sm"
              onClick={handleAddItem}
              disabled={items.length >= 8}
              className="flex-1"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Tambah Jenis Buah {items.length >= 8 && '(maks 8)'}
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={handleReset}
              disabled={!hasAnyInput && items.length === 1}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>

        {/* ── KOLOM KANAN: Hasil kalkulasi ── */}
        <div className="lg:col-span-2">
          <div className="md:sticky md:top-6 space-y-4 max-h-screen overflow-y-auto pb-4">
            <HasilKalkulasiPanel hasilList={hasilList} isKemarau={isKemarau} />
          </div>
        </div>
      </div>
    </div>
  )
}
