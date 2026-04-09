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
import { AlertTriangle, Calculator, CheckCircle2, Sun, CloudRain, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
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
  // Biaya — mode harga beli
  mode_harga_beli: 'per_kemasan',  // 'per_kemasan' | 'per_kg_netto'
  harga_beli_per_peti: '',
  harga_beli_per_kg_netto: '',     // alternatif: harga beli berdasar berat netto (kg)
  biaya_transport_borongan: '',    // total biaya angkut 1 trip (BBM + sopir + retribusi)
  total_biaya_regu_sortir: '',
  nilai_recovery_afkir: '',
}

const SATUAN_OPTIONS = [
  { value: 'peti',    label: 'Peti' },
  { value: 'krat',   label: 'Krat' },
  { value: 'dus',    label: 'Dus' },
  { value: 'karung', label: 'Karung' },
  { value: 'pcs',    label: 'Pcs / Buah' },
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

    // Hitung hargaBeliPerPeti berdasarkan mode
    let hargaBeliPerPeti: number
    if (values.mode_harga_beli === 'per_kg_netto') {
      const hargaPerKgNetto  = r(values.harga_beli_per_kg_netto) || 0
      const beratTaraTotal   = (r(values.berat_tara_kemasan) || 0) * jumlahPeti
      const beratNettoTotal  = Math.max(0, beratBrutoTotal - beratTaraTotal)
      const totalBiayaBuah   = hargaPerKgNetto * beratNettoTotal
      hargaBeliPerPeti       = jumlahPeti > 0 ? totalBiayaBuah / jumlahPeti : 0
    } else {
      hargaBeliPerPeti       = r(values.harga_beli_per_peti) || 0
    }

    const params = {
      jumlahPeti,
      hargaBeliPerPeti,
      beratBrutoTotal,
      biayaTransportPerPeti:  jumlahPeti > 0 ? (r(values.biaya_transport_borongan) || 0) / jumlahPeti : 0,
      totalBiayaReguSortir:   r(values.total_biaya_regu_sortir) || 0,
      nilaiRecoveryAfkir:     r(values.nilai_recovery_afkir)    || 0,
      beratPetiMusim:         r(values.berat_tara_kemasan)      || 0,
      pctAfkirMusim:          r(values.pct_afkir)               || 0,
      beratPerPcsGram:        r(values.berat_per_pcs_gram)      || undefined,
    }

    const hasInput = hargaBeliPerPeti > 0 || beratBrutoTotal > 0
    if (!hasInput) return null

    return calculateHpp(params)
  }, [values])

  // Derived display value
  const beratBrutoTotalDisplay = useMemo(() => {
    const j = parseFloat(values.jumlah_peti) || 0
    const b = parseFloat(values.berat_bruto_per_kemasan) || 0
    return j > 0 && b > 0 ? (j * b).toFixed(2) : null
  }, [values.jumlah_peti, values.berat_bruto_per_kemasan])

  const hasAnyInput = Object.entries(values).some(([k, v]) => k !== 'jumlah_peti' && k !== 'satuan' && k !== 'mode_harga_beli' && v !== '' && v !== '0')

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="max-w-4xl space-y-3">
      {/* Info Banner */}
      <div className={cn(
        'rounded-lg border px-3 py-2.5 text-xs flex items-start gap-2',
        isKemarau
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-blue-200 bg-blue-50 text-blue-800'
      )}>
        {isKemarau ? <Sun className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> : <CloudRain className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />}
        <span>
          Kalkulator berjalan <strong>tanpa menyimpan data</strong>.
          Musim aktif: <strong>{isKemarau ? 'Kemarau' : 'Hujan'}</strong> (ubah dari toggle di header).
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
              <div className="space-y-4">
              {/* ── Toggle mode harga beli ── */}
              <div className="space-y-2">
                <Label className="text-xs">Mode Harga Beli</Label>
                <div className="flex rounded-md border overflow-hidden text-xs w-fit">
                  <button
                    type="button"
                    className={cn(
                      'px-3 py-1.5 transition-colors',
                      values.mode_harga_beli === 'per_kemasan'
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    )}
                    onClick={() => handleChange('mode_harga_beli', 'per_kemasan')}
                  >
                    Per {satuanLabel}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'px-3 py-1.5 transition-colors',
                      values.mode_harga_beli === 'per_kg_netto'
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    )}
                    onClick={() => handleChange('mode_harga_beli', 'per_kg_netto')}
                  >
                    Per Kg Netto
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {values.mode_harga_beli === 'per_kemasan'
                    ? `Harga ditentukan per ${satuanLabel} (paling umum)`
                    : 'Harga ditentukan per kg bersih — pemasok timbang netto (jeruk, buah naga, dll)'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* ── Input harga beli (conditional) ── */}
                <div className="space-y-1.5">
                  {values.mode_harga_beli === 'per_kemasan' ? (
                    <>
                      <Label className="text-xs">Harga Beli per {satuanLabel} (Rp)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="0"
                        value={values.harga_beli_per_peti}
                        onChange={(e) => handleChange('harga_beli_per_peti', e.target.value)}
                      />
                    </>
                  ) : (
                    <>
                      <Label className="text-xs">Harga Beli per Kg Netto (Rp)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="100"
                        placeholder="contoh: 8000"
                        value={values.harga_beli_per_kg_netto}
                        onChange={(e) => handleChange('harga_beli_per_kg_netto', e.target.value)}
                      />
                      {/* Preview ekuivalen per-kemasan */}
                      {(() => {
                        const jumlah   = parseFloat(values.jumlah_peti) || 0
                        const brutoTotal = (parseFloat(values.berat_bruto_per_kemasan) || 0) * jumlah
                        const taraTotal  = (parseFloat(values.berat_tara_kemasan) || 0) * jumlah
                        const netto      = Math.max(0, brutoTotal - taraTotal)
                        const hargaPerKg = parseFloat(values.harga_beli_per_kg_netto) || 0
                        const totalBiaya = hargaPerKg * netto
                        const perPeti    = jumlah > 0 ? totalBiaya / jumlah : 0
                        if (!hargaPerKg || !netto) return null
                        return (
                          <div className="rounded-md bg-primary/5 border border-primary/20 px-2.5 py-2 space-y-0.5">
                            <p className="text-xs text-muted-foreground">
                              Netto total: <span className="font-medium text-foreground">{netto.toFixed(2)} kg</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Total biaya buah: <span className="font-medium text-foreground">{formatRupiahFull(totalBiaya)}</span>
                            </p>
                            <p className="text-xs text-primary font-semibold">
                              ≈ {formatRupiahFull(perPeti)} per {satuanLabel}
                            </p>
                          </div>
                        )
                      })()}
                    </>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Biaya Angkut / Transport Borongan (Rp)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={values.biaya_transport_borongan}
                    onChange={(e) => handleChange('biaya_transport_borongan', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Total 1 trip: BBM + sopir + retribusi jalan</p>
                  {parseFloat(values.biaya_transport_borongan) > 0 && parseFloat(values.jumlah_peti) > 0 && (
                    <p className="text-xs text-primary font-medium">
                      = {formatRupiahFull((parseFloat(values.biaya_transport_borongan) || 0) / (parseFloat(values.jumlah_peti) || 1))} / {satuanLabel}
                    </p>
                  )}
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
            'border-2 md:sticky md:top-6',
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
                    <SimulasiHarga hppPerKg={result.hppPerKg} jumlahPcsPerKg={result.jumlahPcsPerKg} />
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
// KOMPONEN SIMULASI HARGA JUAL + ANALISA PASAR
// ============================================================
function SimulasiHarga({
  hppPerKg,
  jumlahPcsPerKg,
}: {
  hppPerKg: number
  jumlahPcsPerKg: number | null
}) {
  // Mode input per kolom: 'margin' = isi margin → tampil harga jual; 'harga' = isi harga jual → tampil margin
  const [modeDapur,    setModeDapur]    = useState<'margin' | 'harga'>('margin')
  const [modeSupplier, setModeSupplier] = useState<'margin' | 'harga'>('margin')

  const [marginDapur,       setMarginDapur]       = useState('2000')
  const [hargaJualDapur,    setHargaJualDapur]    = useState('')
  const [marginSupplier,    setMarginSupplier]    = useState('1500')
  const [hargaJualSupplier, setHargaJualSupplier] = useState('')

  const [hargaT1, setHargaT1] = useState('')
  const [hargaT2, setHargaT2] = useState('')
  const [hargaT3, setHargaT3] = useState('')
  const [hargaRetail, setHargaRetail] = useState('')
  const [showMarket, setShowMarket] = useState(false)

  // Nilai final — selalu konsisten antara dua mode
  const hargaDapur: number = modeDapur === 'margin'
    ? hppPerKg + (parseFloat(marginDapur) || 0)
    : (parseFloat(hargaJualDapur) || hppPerKg)
  const marginDapurComputed = hargaDapur - hppPerKg

  const hargaSupplier: number = modeSupplier === 'margin'
    ? hppPerKg + (parseFloat(marginSupplier) || 0)
    : (parseFloat(hargaJualSupplier) || hppPerKg)
  const marginSupplierComputed = hargaSupplier - hppPerKg

  // Saat ganti mode, salin nilai yang sudah dihitung ke field baru
  function switchModeDapur(next: 'margin' | 'harga') {
    if (next === modeDapur) return
    if (next === 'harga') setHargaJualDapur(String(Math.round(hargaDapur)))
    else                  setMarginDapur(String(Math.round(marginDapurComputed)))
    setModeDapur(next)
  }
  function switchModeSupplier(next: 'margin' | 'harga') {
    if (next === modeSupplier) return
    if (next === 'harga') setHargaJualSupplier(String(Math.round(hargaSupplier)))
    else                  setMarginSupplier(String(Math.round(marginSupplierComputed)))
    setModeSupplier(next)
  }

  // Per-pcs equivalents
  const dapurPerPcs    = jumlahPcsPerKg ? hargaDapur    / jumlahPcsPerKg : null
  const supplierPerPcs = jumlahPcsPerKg ? hargaSupplier / jumlahPcsPerKg : null

  const tierRows = [
    { id: 'T1', label: 'T1 / Petani–Suplier', price: parseFloat(hargaT1)     || null },
    { id: 'T2', label: 'T2 / Agen Tengah',    price: parseFloat(hargaT2)     || null },
    { id: 'T3', label: 'T3 / Pengecer',       price: parseFloat(hargaT3)     || null },
    { id: 'RT', label: 'Retail Pasar',         price: parseFloat(hargaRetail) || null },
  ]
  const hasMarketData = tierRows.some(t => t.price !== null)

  return (
    <div className="space-y-2">
      {/* ─── Simulasi Harga Jual Kita ─── */}
      <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Simulasi Harga Jual (per kg)
        </p>
        <div className="grid grid-cols-2 gap-3">

          {/* ── Kolom Dapur ── */}
          <div className="space-y-1.5">
            {/* Toggle mode */}
            <div className="flex rounded-md border overflow-hidden text-[10px]">
              <button type="button"
                className={cn('flex-1 py-0.5 transition-colors', modeDapur === 'margin'
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-background text-muted-foreground hover:bg-muted')}
                onClick={() => switchModeDapur('margin')}>Margin</button>
              <button type="button"
                className={cn('flex-1 py-0.5 transition-colors', modeDapur === 'harga'
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-background text-muted-foreground hover:bg-muted')}
                onClick={() => switchModeDapur('harga')}>Harga Jual</button>
            </div>
            <Label className="text-xs">
              {modeDapur === 'margin' ? 'Margin Dapur (Rp/kg)' : 'Harga Jual Dapur (Rp/kg)'}
            </Label>
            {modeDapur === 'margin'
              ? <Input type="number" className="h-7 text-xs" value={marginDapur} onChange={e => setMarginDapur(e.target.value)} />
              : <Input type="number" className="h-7 text-xs" value={hargaJualDapur} placeholder={String(Math.round(hargaDapur))} onChange={e => setHargaJualDapur(e.target.value)} />
            }
            {/* Nilai terkomputasi */}
            {modeDapur === 'margin'
              ? <p className="text-xs font-semibold text-center">{formatRupiahFull(hargaDapur)}/kg</p>
              : <p className={cn('text-xs font-semibold text-center', marginDapurComputed < 0 ? 'text-red-600' : 'text-green-700')}>
                  Margin: {marginDapurComputed >= 0 ? '+' : ''}{formatRupiahFull(marginDapurComputed)}/kg
                </p>
            }
            {dapurPerPcs !== null && (
              <p className="text-xs text-center text-muted-foreground">≈ {formatRupiahFull(dapurPerPcs)}/pcs</p>
            )}
          </div>

          {/* ── Kolom Suplier ── */}
          <div className="space-y-1.5">
            <div className="flex rounded-md border overflow-hidden text-[10px]">
              <button type="button"
                className={cn('flex-1 py-0.5 transition-colors', modeSupplier === 'margin'
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-background text-muted-foreground hover:bg-muted')}
                onClick={() => switchModeSupplier('margin')}>Margin</button>
              <button type="button"
                className={cn('flex-1 py-0.5 transition-colors', modeSupplier === 'harga'
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-background text-muted-foreground hover:bg-muted')}
                onClick={() => switchModeSupplier('harga')}>Harga Jual</button>
            </div>
            <Label className="text-xs">
              {modeSupplier === 'margin' ? 'Margin Suplier (Rp/kg)' : 'Harga Jual Suplier (Rp/kg)'}
            </Label>
            {modeSupplier === 'margin'
              ? <Input type="number" className="h-7 text-xs" value={marginSupplier} onChange={e => setMarginSupplier(e.target.value)} />
              : <Input type="number" className="h-7 text-xs" value={hargaJualSupplier} placeholder={String(Math.round(hargaSupplier))} onChange={e => setHargaJualSupplier(e.target.value)} />
            }
            {modeSupplier === 'margin'
              ? <p className="text-xs font-semibold text-center">{formatRupiahFull(hargaSupplier)}/kg</p>
              : <p className={cn('text-xs font-semibold text-center', marginSupplierComputed < 0 ? 'text-red-600' : 'text-green-700')}>
                  Margin: {marginSupplierComputed >= 0 ? '+' : ''}{formatRupiahFull(marginSupplierComputed)}/kg
                </p>
            }
            {supplierPerPcs !== null && (
              <p className="text-xs text-center text-muted-foreground">≈ {formatRupiahFull(supplierPerPcs)}/pcs</p>
            )}
          </div>
        </div>
        {hargaSupplier > hargaDapur && (
          <p className="text-xs text-yellow-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Harga suplier melebihi harga dapur
          </p>
        )}
      </div>

      {/* ─── Analisa Posisi Harga Pasar ─── */}
      <div className="rounded-lg border bg-sky-50/60 p-3 space-y-3">
        <button
          type="button"
          className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-sky-700 hover:text-sky-800"
          onClick={() => setShowMarket(v => !v)}
        >
          <span>Analisa Posisi Harga Pasar</span>
          {showMarket
            ? <ChevronUp className="h-3.5 w-3.5" />
            : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showMarket && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Masukkan referensi harga jual tiap tier rantai pasok. Dibandingkan dengan HPP kita
              untuk melihat ruang margin dan posisi ideal penetapan harga.
            </p>

            {/* Input harga tiap tier */}
            <div className="grid grid-cols-2 gap-2">
              {([
                { label: 'Harga T1 / Petani–Suplier', val: hargaT1,     set: setHargaT1 },
                { label: 'Harga T2 / Agen Tengah',    val: hargaT2,     set: setHargaT2 },
                { label: 'Harga T3 / Pengecer',       val: hargaT3,     set: setHargaT3 },
                { label: 'Harga Retail Pasar',         val: hargaRetail, set: setHargaRetail },
              ] as const).map(({ label, val, set }) => (
                <div key={label} className="space-y-1">
                  <Label className="text-xs leading-tight">{label} (Rp/kg)</Label>
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    placeholder="0"
                    min="0"
                    step="500"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* Tabel perbandingan — tampil setelah ada data */}
            {hasMarketData && (
              <>
                <Separator />
                <div className="space-y-1 text-xs">
                  {/* Header */}
                  <div className="grid grid-cols-3 gap-1 text-muted-foreground font-medium border-b pb-1">
                    <span>Tier</span>
                    <span className="text-right">Harga/kg</span>
                    <span className="text-right">vs HPP Kita</span>
                  </div>

                  {/* HPP baseline */}
                  <div className="grid grid-cols-3 gap-1 py-0.5">
                    <span className="font-semibold text-orange-600">HPP Kita</span>
                    <span className="text-right font-semibold">{formatRupiahFull(hppPerKg)}</span>
                    <span className="text-right text-muted-foreground italic">baseline</span>
                  </div>

                  {/* Tier rows */}
                  {tierRows.map(({ id, label, price }) => {
                    if (price === null) return null
                    const gap = price - hppPerKg
                    const pct = hppPerKg > 0 ? (gap / hppPerKg) * 100 : 0
                    const color = gap < 0
                      ? 'text-red-600'
                      : pct < 5
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    return (
                      <div key={id} className="grid grid-cols-3 gap-1 py-0.5">
                        <span className="text-muted-foreground truncate">{label}</span>
                        <span className="text-right">{formatRupiahFull(price)}</span>
                        <span className={cn('text-right font-medium', color)}>
                          {gap >= 0 ? '+' : ''}{formatRupiahFull(gap)}{' '}
                          <span className="opacity-75">({pct >= 0 ? '+' : ''}{pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                    )
                  })}

                  {/* Harga jual kita sebagai pembanding */}
                  <Separator />
                  {[
                    { label: 'Jual Dapur (kita)',   price: hargaDapur },
                    { label: 'Jual Suplier (kita)', price: hargaSupplier },
                  ].map(({ label, price }) => {
                    const gap = price - hppPerKg
                    const pct = hppPerKg > 0 ? (gap / hppPerKg) * 100 : 0
                    return (
                      <div key={label} className="grid grid-cols-3 gap-1 rounded bg-sky-100/80 px-1 py-0.5">
                        <span className="font-medium text-sky-700 truncate">{label}</span>
                        <span className="text-right font-semibold text-sky-800">{formatRupiahFull(price)}</span>
                        <span className="text-right font-medium text-sky-700">
                          +{formatRupiahFull(gap)}{' '}
                          <span className="opacity-75">(+{pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Catatan warna */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground border-t pt-2">
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500" />Margin ≥ 5% — aman</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />Margin &lt; 5% — tipis</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-500" />Di bawah HPP — rugi</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
