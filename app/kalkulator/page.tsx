'use client'

import { useMemo, useState } from 'react'
import { useSeason } from '@/context/season-context'
import { calculateHpp, formatRupiahFull, formatKg, formatPersen } from '@/lib/calculations/hpp'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Calculator, CheckCircle2, Sun, CloudRain, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// STATE LOKAL (tidak tersimpan ke DB)
// ============================================================
const DEFAULT_STATE = {
  // Parameter buah (manual input di kalkulator)
  satuan: 'peti',                  // satuan kemasan
  berat_tara_kemasan: '',          // berat kemasan kosong (kg)
  pct_afkir: '',
  berat_per_pcs_gram: '',          // opsional, untuk konversi pcs
  // Input pembelian fisik
  jumlah_peti: '1',
  berat_bruto_per_kemasan: '',     // berat bruto 1 kemasan (kg)
  // Biaya
  harga_beli_per_peti: '',
  biaya_transport_per_peti: '',
  total_biaya_regu_sortir: '',
  nilai_recovery_afkir: '',
}

const SATUAN_OPTIONS = [
  { value: 'peti',    label: 'Peti' },
  { value: 'krat',   label: 'Krat' },
  { value: 'dus',    label: 'Dus' },
  { value: 'karung', label: 'Karung' },
  { value: 'lainnya', label: 'Lainnya' },
]

export default function KalkulatorPage() {
  const { musim, isKemarau } = useSeason()
  const [values, setValues] = useState(DEFAULT_STATE)

  function handleChange(field: keyof typeof DEFAULT_STATE, value: string) {
    setValues(prev => ({ ...prev, [field]: value }))
  }

  function reset() {
    setValues(DEFAULT_STATE)
  }

  const satuanLabel = SATUAN_OPTIONS.find(s => s.value === values.satuan)?.label ?? 'Peti'

  // ============================================================
  // LIVE KALKULASI
  // ============================================================
  const result = useMemo(() => {
    const r = parseFloat
    const jumlahPeti         = r(values.jumlah_peti)              || 0
    const beratBrutoPer      = r(values.berat_bruto_per_kemasan)  || 0
    // Auto-hitung berat bruto total
    const beratBrutoTotal    = beratBrutoPer > 0 && jumlahPeti > 0
      ? beratBrutoPer * jumlahPeti
      : 0

    const params = {
      jumlahPeti,
      hargaBeliPerPeti:       r(values.harga_beli_per_peti)     || 0,
      beratBrutoTotal,
      biayaTransportPerPeti:  r(values.biaya_transport_per_peti)|| 0,
      totalBiayaReguSortir:   r(values.total_biaya_regu_sortir) || 0,
      nilaiRecoveryAfkir:     r(values.nilai_recovery_afkir)    || 0,
      beratPetiMusim:         r(values.berat_tara_kemasan)      || 0,
      pctAfkirMusim:          r(values.pct_afkir)               || 0,
      beratPerPcsGram:        r(values.berat_per_pcs_gram)      || undefined,
    }

    const hasInput = params.hargaBeliPerPeti > 0 || beratBrutoTotal > 0
    if (!hasInput) return null

    return calculateHpp(params)
  }, [values])

  // Derived display value
  const beratBrutoTotalDisplay = useMemo(() => {
    const j = parseFloat(values.jumlah_peti) || 0
    const b = parseFloat(values.berat_bruto_per_kemasan) || 0
    return j > 0 && b > 0 ? (j * b).toFixed(2) : null
  }, [values.jumlah_peti, values.berat_bruto_per_kemasan])

  const hasAnyInput = Object.entries(values).some(([k, v]) => k !== 'jumlah_peti' && k !== 'satuan' && v !== '' && v !== '0')

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="max-w-4xl space-y-4">
      {/* Info Banner */}
      <div className={cn(
        'rounded-lg border px-4 py-3 text-sm flex items-center gap-3',
        isKemarau
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-blue-200 bg-blue-50 text-blue-800'
      )}>
        {isKemarau ? <Sun className="h-4 w-4 flex-shrink-0" /> : <CloudRain className="h-4 w-4 flex-shrink-0" />}
        <span>
          Kalkulator ini berjalan <strong>tanpa menyimpan data</strong> ke database.
          Gunakan halaman <strong>Input Pembelian</strong> jika ingin menyimpan transaksi.
          Musim aktif saat ini: <strong>{isKemarau ? 'Kemarau' : 'Hujan'}</strong> (ubah dari toggle di header).
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* === FORM INPUT === */}
        <div className="lg:col-span-3 space-y-4">
          {/* Parameter Buah */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white',
                  isKemarau ? 'bg-amber-500' : 'bg-blue-500'
                )}>1</div>
                Parameter Buah (Musim {isKemarau ? 'Kemarau' : 'Hujan'})
              </CardTitle>
              <CardDescription className="text-xs">
                Masukkan parameter buah sesuai musim aktif. Ambil dari data Master Buah.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Satuan */}
              <div className="space-y-1.5">
                <Label className="text-xs">Satuan Kemasan</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={values.satuan}
                  onChange={(e) => handleChange('satuan', e.target.value)}
                >
                  {SATUAN_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Berat Tara {satuanLabel} Kosong (kg)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="contoh: 0.5"
                    value={values.berat_tara_kemasan}
                    onChange={(e) => handleChange('berat_tara_kemasan', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Berat kemasan kosong saja</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    % Penyusutan / Afkir {isKemarau ? 'Kemarau' : 'Hujan'}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="contoh: 5.0"
                    value={values.pct_afkir}
                    onChange={(e) => handleChange('pct_afkir', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Berat per Butir/Pcs (gram) <span className="text-muted-foreground">— opsional, untuk konversi biji</span>
                </Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="contoh: 10 (anggur), 200 (apel)"
                  value={values.berat_per_pcs_gram}
                  onChange={(e) => handleChange('berat_per_pcs_gram', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Fisik */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</div>
                Data Fisik Pembelian
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Jumlah {satuanLabel}</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={values.jumlah_peti}
                    onChange={(e) => handleChange('jumlah_peti', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Berat Bruto per {satuanLabel} (kg)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="contoh: 6.5"
                    value={values.berat_bruto_per_kemasan}
                    onChange={(e) => handleChange('berat_bruto_per_kemasan', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Berat kotor 1 {satuanLabel} termasuk isi</p>
                </div>
              </div>
              {/* Auto-calc total */}
              {beratBrutoTotalDisplay && (
                <div className="rounded-md bg-muted/50 border px-3 py-2 flex justify-between items-center text-sm">
                  <span className="text-muted-foreground text-xs">
                    Berat Bruto Total ({values.jumlah_peti} × {values.berat_bruto_per_kemasan} kg)
                  </span>
                  <span className="font-semibold">{beratBrutoTotalDisplay} kg</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Biaya */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</div>
                Data Biaya (Rp)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Harga Beli per {satuanLabel} (Rp)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={values.harga_beli_per_peti}
                    onChange={(e) => handleChange('harga_beli_per_peti', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Biaya Transport per {satuanLabel} (Rp)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="0"
                    value={values.biaya_transport_per_peti}
                    onChange={(e) => handleChange('biaya_transport_per_peti', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Total Biaya Regu Sortir (Rp)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={values.total_biaya_regu_sortir}
                    onChange={(e) => handleChange('total_biaya_regu_sortir', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nilai Recovery Afkir (Rp)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={values.nilai_recovery_afkir}
                    onChange={(e) => handleChange('nilai_recovery_afkir', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={reset} disabled={!hasAnyInput}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>

        {/* === HASIL KALKULASI === */}
        <div className="lg:col-span-2">
          <Card className={cn(
            'sticky top-6 border-2',
            !result ? 'border-dashed' :
            result.isValid && result.netYield > 0 ? 'border-green-300' : 'border-red-300'
          )}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calculator className="h-4 w-4" />
                Hasil Kalkulasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!result ? (
                <div className="py-8 text-center">
                  <Calculator className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-40" />
                  <p className="text-sm text-muted-foreground">
                    Isi data di sebelah kiri untuk melihat hasil kalkulasi HPP
                  </p>
                </div>
              ) : (
                <>
                  {/* Error state */}
                  {result.validationErrors.length > 0 && (
                    <div className="rounded-md bg-red-50 border border-red-200 p-3 space-y-1">
                      {result.validationErrors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600 flex items-start gap-1">
                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {err}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Breakdown */}
                  <div className="space-y-2 text-xs">
                    <p className="font-semibold text-muted-foreground uppercase tracking-wide">Breakdown</p>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Landed Cost/Peti</span>
                      <span className="font-medium">{formatRupiahFull(result.landedCostPerPeti)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Landed Cost</span>
                      <span className="font-medium">{formatRupiahFull(result.totalLandedCost)}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Berat Tara {satuanLabel} Total</span>
                      <span className="text-red-500">- {formatKg(result.beratPetiTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Penyusutan/Afkir ({formatPersen(parseFloat(values.pct_afkir) || 0)})
                      </span>
                      <span className="text-amber-600">- {formatKg(result.beratAfkir)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>Net Yield (Jual)</span>
                      <span className={result.netYield > 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatKg(result.netYield)}
                      </span>
                    </div>

                    <Separator />

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recovery Afkir</span>
                      <span className="text-green-600">+ {formatRupiahFull(parseFloat(values.nilai_recovery_afkir) || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Biaya Kuli/Kg</span>
                      <span>{formatRupiahFull(result.biayaKuliSortirPerKg)}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* HASIL UTAMA */}
                  <div className={cn(
                    'rounded-lg p-4 text-center',
                    result.isValid && result.netYield > 0
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  )}>
                    <p className="text-xs text-muted-foreground mb-1">True HPP per Kg</p>
                    <p className={cn(
                      'text-3xl font-bold',
                      result.isValid && result.netYield > 0 ? 'text-green-700' : 'text-red-600'
                    )}>
                      {formatRupiahFull(result.hppPerKg)}
                    </p>
                    {result.isValid && result.netYield > 0 && (
                      <p className="text-xs text-green-600 mt-2 flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Kalkulasi valid
                      </p>
                    )}
                  </div>

                  {/* Konversi PCS */}
                  {result.jumlahPcsPerKg !== null && result.totalPcs !== null && (
                    <>
                      <Separator />
                      <div className="space-y-2 text-xs">
                        <p className="font-semibold text-muted-foreground uppercase tracking-wide">Konversi Biji / Pcs</p>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Jumlah Pcs per Kg</span>
                          <span className="font-medium">~{result.jumlahPcsPerKg} pcs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Pcs (estimasi)</span>
                          <span className="font-semibold text-primary">~{result.totalPcs.toLocaleString('id-ID')} pcs</span>
                        </div>
                        {result.hppPerPcs !== null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">HPP per Pcs</span>
                            <span className="font-medium">{formatRupiahFull(result.hppPerPcs)}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Simulasi Harga Jual */}
                  {result.isValid && result.netYield > 0 && result.hppPerKg > 0 && (
                    <SimulasiHarga hppPerKg={result.hppPerKg} hppPerPcs={result.hppPerPcs} />
                  )}

                  {/* Badge musim */}
                  <Badge
                    variant="outline"
                    className={cn(
                      'w-full justify-center text-xs',
                      isKemarau ? 'border-amber-300 text-amber-700' : 'border-blue-300 text-blue-700'
                    )}
                  >
                    {isKemarau ? <Sun className="mr-1 h-3 w-3" /> : <CloudRain className="mr-1 h-3 w-3" />}
                    Parameter Musim {isKemarau ? 'Kemarau' : 'Hujan'}
                  </Badge>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// KOMPONEN SIMULASI HARGA JUAL
// ============================================================
function SimulasiHarga({ hppPerKg, hppPerPcs }: { hppPerKg: number; hppPerPcs: number | null }) {
  const [marginDapur, setMarginDapur] = useState('2000')
  const [marginSupplier, setMarginSupplier] = useState('1500')

  const hargaDapur    = hppPerKg + (parseFloat(marginDapur)    || 0)
  const hargaSupplier = hppPerKg + (parseFloat(marginSupplier) || 0)

  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Simulasi Harga Jual (per kg)
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Margin Dapur (Rp/kg)</Label>
          <Input
            type="number"
            className="h-7 text-xs"
            value={marginDapur}
            onChange={(e) => setMarginDapur(e.target.value)}
          />
          <p className="text-xs font-medium text-center">{formatRupiahFull(hargaDapur)}/kg</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Margin Suplier (Rp/kg)</Label>
          <Input
            type="number"
            className="h-7 text-xs"
            value={marginSupplier}
            onChange={(e) => setMarginSupplier(e.target.value)}
          />
          <p className="text-xs font-medium text-center">{formatRupiahFull(hargaSupplier)}/kg</p>
        </div>
      </div>
      {hppPerPcs !== null && (
        <div className="border-t pt-2 space-y-1 text-xs">
          <p className="text-muted-foreground font-medium">Ekuivalensi per Pcs:</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Harga Jual Dapur/pcs</span>
            <span>{formatRupiahFull(hppPerPcs + (parseFloat(marginDapur) || 0) / 1000 * (1000 / (hppPerKg > 0 ? hppPerKg : 1)) * hppPerPcs / hppPerPcs)}</span>
          </div>
        </div>
      )}
      {hargaSupplier > hargaDapur && (
        <p className="text-xs text-yellow-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Harga suplier melebihi harga dapur (tidak logis)
        </p>
      )}
    </div>
  )
}
