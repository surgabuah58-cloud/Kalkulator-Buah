'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatRupiahFull } from '@/lib/calculations/hpp'
import { cn } from '@/lib/utils'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { SATUAN_OPTIONS, type ItemBuah } from './types'

interface Props {
  item: ItemBuah
  index: number
  totalItems: number
  transportBorongan: number   // total biaya transport (dibagi rata ke semua item)
  isKemarau: boolean
  onChange: (id: string, field: keyof ItemBuah, value: string | boolean) => void
  onRemove: (id: string) => void
}

export function KalkulatorItem({ item, index, totalItems, transportBorongan, isKemarau, onChange, onRemove }: Props) {
  const satuanLabel = SATUAN_OPTIONS.find(s => s.value === item.satuan)?.label ?? 'Peti'
  const jumlah      = parseFloat(item.jumlah_kemasan) || 0
  const brutoPerKem = parseFloat(item.berat_bruto_per_kemasan) || 0
  const brutoTotal  = jumlah * brutoPerKem
  const tara        = parseFloat(item.berat_tara_kemasan) || 0
  const taraTotal   = tara * jumlah
  const nettoTotal  = Math.max(0, brutoTotal - taraTotal)

  // Preview ekuivalen per-kemasan untuk mode per_kg_netto
  const hargaPerKgNetto = parseFloat(item.harga_beli_per_kg_netto) || 0
  const totalBiayaBuah  = hargaPerKgNetto * nettoTotal
  const equivPerKemasan = jumlah > 0 ? totalBiayaBuah / jumlah : 0

  // Transport per kemasan (dibagi rata ke jumlah kemasan item ini)
  const transportPerKemasan = jumlah > 0 ? transportBorongan / jumlah : 0

  const set = (field: keyof ItemBuah, val: string | boolean) => onChange(item.id, field, val)

  return (
    <div className="rounded-lg border bg-card space-y-4 p-4">
      {/* Header item */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground flex-shrink-0">
          {index + 1}
        </div>
        <Input
          className="h-7 text-sm font-medium flex-1"
          placeholder={`Nama Buah #${index + 1} (mis. Jeruk Medan)`}
          value={item.nama}
          onChange={e => set('nama', e.target.value)}
        />
        {totalItems > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-red-500"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* ── 1. Parameter kemasan ── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Parameter Kemasan
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Satuan</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              value={item.satuan}
              onChange={e => set('satuan', e.target.value)}
            >
              {SATUAN_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Berat Tara {satuanLabel} (kg)</Label>
            <Input
              type="number" min="0" step="0.01" placeholder="0.5"
              value={item.berat_tara_kemasan}
              onChange={e => set('berat_tara_kemasan', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">% Afkir {isKemarau ? 'Kemarau' : 'Hujan'}</Label>
            <Input
              type="number" min="0" max="100" step="0.1" placeholder="5.0"
              value={item.pct_afkir}
              onChange={e => set('pct_afkir', e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* ── 2. Data Fisik ── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Data Fisik
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Jumlah {satuanLabel}</Label>
            <Input
              type="number" min="1" step="1"
              value={item.jumlah_kemasan}
              onChange={e => set('jumlah_kemasan', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Berat Bruto per {satuanLabel} (kg)</Label>
            <Input
              type="number" min="0" step="0.1" placeholder="6.5"
              value={item.berat_bruto_per_kemasan}
              onChange={e => set('berat_bruto_per_kemasan', e.target.value)}
            />
          </div>
        </div>
        {brutoTotal > 0 && (
          <div className="rounded-md bg-muted/50 border px-3 py-2 flex justify-between text-xs">
            <span className="text-muted-foreground">
              Bruto Total ({jumlah} × {brutoPerKem} kg)
            </span>
            <span className="font-semibold">{brutoTotal.toFixed(2)} kg</span>
          </div>
        )}
      </div>

      <Separator />

      {/* ── 3. Data Biaya ── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Data Biaya
        </p>

        {/* Toggle mode harga beli */}
        <div className="space-y-1.5">
          <Label className="text-xs">Mode Harga Beli</Label>
          <div className="flex rounded-md border overflow-hidden text-xs w-fit">
            {(['per_kemasan', 'per_kg_netto'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                className={cn(
                  'px-3 py-1.5 transition-colors',
                  item.mode_harga_beli === mode
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                )}
                onClick={() => set('mode_harga_beli', mode)}
              >
                {mode === 'per_kemasan' ? `Per ${satuanLabel}` : 'Per Kg Netto'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            {item.mode_harga_beli === 'per_kemasan' ? (
              <>
                <Label className="text-xs">Harga Beli per {satuanLabel} (Rp)</Label>
                <Input
                  type="number" min="0" step="1000" placeholder="0"
                  value={item.harga_beli_per_kemasan}
                  onChange={e => set('harga_beli_per_kemasan', e.target.value)}
                />
              </>
            ) : (
              <>
                <Label className="text-xs">Harga Beli per Kg Netto (Rp)</Label>
                <Input
                  type="number" min="0" step="100" placeholder="8000"
                  value={item.harga_beli_per_kg_netto}
                  onChange={e => set('harga_beli_per_kg_netto', e.target.value)}
                />
                {hargaPerKgNetto > 0 && nettoTotal > 0 && (
                  <div className="rounded bg-primary/5 border border-primary/20 px-2 py-1.5 space-y-0.5 text-xs">
                    <p className="text-muted-foreground">Netto: <span className="font-medium text-foreground">{nettoTotal.toFixed(2)} kg</span></p>
                    <p className="text-muted-foreground">Total: <span className="font-medium text-foreground">{formatRupiahFull(totalBiayaBuah)}</span></p>
                    <p className="text-primary font-semibold">≈ {formatRupiahFull(equivPerKemasan)} / {satuanLabel}</p>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Biaya Sortir (Rp)</Label>
            <Input
              type="number" min="0" step="1000" placeholder="0"
              value={item.biaya_sortir}
              onChange={e => set('biaya_sortir', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nilai Recovery Afkir (Rp)</Label>
            <Input
              type="number" min="0" step="1000" placeholder="0"
              value={item.nilai_recovery_afkir}
              onChange={e => set('nilai_recovery_afkir', e.target.value)}
            />
          </div>
          {transportPerKemasan > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Transport (alokasi)</Label>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs font-medium text-primary">
                {formatRupiahFull(transportPerKemasan)} / {satuanLabel}
              </div>
              <p className="text-xs text-muted-foreground">Dari transport borongan ÷ {jumlah} {satuanLabel}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Distribusi Ukuran L/M/S (toggle) ── */}
      <Separator />
      <div className="space-y-3">
        <button
          type="button"
          className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground"
          onClick={() => set('aktif_distribusi', !item.aktif_distribusi)}
        >
          <span>Distribusi Ukuran per Kemasan (L / M / S)</span>
          {item.aktif_distribusi
            ? <ChevronUp className="h-3.5 w-3.5" />
            : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {!item.aktif_distribusi && (
          <p className="text-xs text-muted-foreground">
            Aktifkan untuk analisa jumlah buah besar/sedang/kecil per {satuanLabel} dan estimasi HPP per butir.
          </p>
        )}
        {item.aktif_distribusi && (
          <DistribusiUkuran item={item} set={set} satuanLabel={satuanLabel} nettoTotal={nettoTotal} jumlah={jumlah} />
        )}
      </div>
    </div>
  )
}

// ── Sub-komponen Distribusi Ukuran L/M/S ──
function DistribusiUkuran({ item, set, satuanLabel, nettoTotal, jumlah }: {
  item: ItemBuah
  set: (field: keyof ItemBuah, val: string | boolean) => void
  satuanLabel: string
  nettoTotal: number
  jumlah: number
}) {
  const pL = parseFloat(item.dist_l_pct) || 0
  const pM = parseFloat(item.dist_m_pct) || 0
  const pS = parseFloat(item.dist_s_pct) || 0
  const totalPct = pL + pM + pS
  const pctOk = Math.abs(totalPct - 100) < 0.5

  const gL = parseFloat(item.dist_l_gram) || 0
  const gM = parseFloat(item.dist_m_gram) || 0
  const gS = parseFloat(item.dist_s_gram) || 0

  // Rata-rata tertimbang
  const beratRataGram = totalPct > 0
    ? (gL * pL + gM * pM + gS * pS) / totalPct
    : 0

  // Estimasi jumlah pcs per kemasan dari berat netto
  const nettoPerKemasan = jumlah > 0 ? nettoTotal / jumlah : 0
  const estimasiPcsPerKem = beratRataGram > 0 ? Math.round((nettoPerKemasan * 1000) / beratRataGram) : 0
  const estimasiTotalPcs  = estimasiPcsPerKem * jumlah

  // Estimasi pcs per ukuran
  const pcsL = Math.round(estimasiTotalPcs * pL / 100)
  const pcsM = Math.round(estimasiTotalPcs * pM / 100)
  const pcsS = estimasiTotalPcs - pcsL - pcsM

  const tiers = [
    { key: 'L', label: 'Besar (L)', gram: item.dist_l_gram, pct: item.dist_l_pct, gramField: 'dist_l_gram' as keyof ItemBuah, pctField: 'dist_l_pct' as keyof ItemBuah, pcs: pcsL, color: 'text-emerald-600' },
    { key: 'M', label: 'Sedang (M)', gram: item.dist_m_gram, pct: item.dist_m_pct, gramField: 'dist_m_gram' as keyof ItemBuah, pctField: 'dist_m_pct' as keyof ItemBuah, pcs: pcsM, color: 'text-blue-600' },
    { key: 'S', label: 'Kecil (S)', gram: item.dist_s_gram, pct: item.dist_s_pct, gramField: 'dist_s_gram' as keyof ItemBuah, pctField: 'dist_s_pct' as keyof ItemBuah, pcs: pcsS, color: 'text-orange-500' },
  ]

  return (
    <div className="space-y-3 rounded-lg bg-muted/30 border p-3">
      <p className="text-xs text-muted-foreground">
        Masukkan berat rata-rata dan proporsi tiap ukuran. Total proporsi harus = 100%.
      </p>

      {/* Header tabel */}
      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground font-medium pb-1 border-b">
        <span>Ukuran</span>
        <span>Berat rata-rata (gram)</span>
        <span>Proporsi (%)</span>
      </div>

      {tiers.map(t => (
        <div key={t.key} className="grid grid-cols-3 gap-2 items-center">
          <span className={cn('text-xs font-semibold', t.color)}>{t.label}</span>
          <Input
            type="number" min="1" step="1"
            placeholder={t.key === 'L' ? '300' : t.key === 'M' ? '200' : '120'}
            className="h-7 text-xs"
            value={t.gram}
            onChange={e => set(t.gramField, e.target.value)}
          />
          <Input
            type="number" min="0" max="100" step="1"
            className="h-7 text-xs"
            value={t.pct}
            onChange={e => set(t.pctField, e.target.value)}
          />
        </div>
      ))}

      {/* Validasi total % */}
      {!pctOk && (
        <p className="text-xs text-red-500 font-medium">
          Total proporsi = {totalPct.toFixed(0)}% (harus 100%)
        </p>
      )}

      {/* Hasil estimasi */}
      {pctOk && beratRataGram > 0 && estimasiTotalPcs > 0 && (
        <div className="rounded-md bg-white border space-y-2 p-2.5 text-xs">
          <p className="font-semibold text-muted-foreground uppercase tracking-wide">Estimasi Distribusi</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Berat rata-rata tertimbang</span>
            <span className="font-medium">{beratRataGram.toFixed(1)} gram / buah</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimasi per {satuanLabel}</span>
            <span className="font-medium">~{estimasiPcsPerKem} buah</span>
          </div>
          <div className="flex justify-between font-medium border-t pt-1.5">
            <span>Total estimasi semua {satuanLabel}</span>
            <span className="text-primary">~{estimasiTotalPcs.toLocaleString('id-ID')} buah</span>
          </div>
          <div className="grid grid-cols-3 gap-1 border-t pt-1.5">
            {tiers.map(t => (
              <div key={t.key} className="text-center">
                <p className={cn('font-bold', t.color)}>{t.pcs.toLocaleString('id-ID')}</p>
                <p className="text-muted-foreground text-[10px]">{t.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
