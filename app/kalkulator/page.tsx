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
  berat_peti: '',
  pct_afkir: '',
  // Input pembelian
  jumlah_peti: '1',
  harga_beli_per_peti: '',
  berat_bruto_total: '',
  biaya_transport_per_peti: '',
  total_biaya_regu_sortir: '',
  nilai_recovery_afkir: '',
}

export default function KalkulatorPage() {
  const { musim, isKemarau } = useSeason()
  const [values, setValues] = useState(DEFAULT_STATE)

  function handleChange(field: keyof typeof DEFAULT_STATE, value: string) {
    setValues(prev => ({ ...prev, [field]: value }))
  }

  function reset() {
    setValues(DEFAULT_STATE)
  }

  // ============================================================
  // LIVE KALKULASI
  // ============================================================
  const result = useMemo(() => {
    const r = parseFloat
    const params = {
      jumlahPeti:             r(values.jumlah_peti)             || 0,
      hargaBeliPerPeti:       r(values.harga_beli_per_peti)     || 0,
      beratBrutoTotal:        r(values.berat_bruto_total)       || 0,
      biayaTransportPerPeti:  r(values.biaya_transport_per_peti)|| 0,
      totalBiayaReguSortir:   r(values.total_biaya_regu_sortir) || 0,
      nilaiRecoveryAfkir:     r(values.nilai_recovery_afkir)    || 0,
      beratPetiMusim:         r(values.berat_peti)              || 0,
      pctAfkirMusim:          r(values.pct_afkir)               || 0,
    }

    // Jangan hitung kalau semua masih 0
    const hasInput = params.hargaBeliPerPeti > 0 || params.beratBrutoTotal > 0
    if (!hasInput) return null

    return calculateHpp(params)
  }, [values])

  const hasAnyInput = Object.values(values).some(v => v !== '' && v !== '1' && v !== '0')

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
                Masukkan parameter buah sesuai musim aktif. Nilai ini biasanya diambil dari Master Buah.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Berat Peti {isKemarau ? 'Kemarau' : 'Hujan'} (kg)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="contoh: 5.0"
                    value={values.berat_peti}
                    onChange={(e) => handleChange('berat_peti', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    % Afkir {isKemarau ? 'Kemarau' : 'Hujan'}
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
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Jumlah Peti</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={values.jumlah_peti}
                    onChange={(e) => handleChange('jumlah_peti', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Berat Bruto Total (kg)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Total berat termasuk peti"
                    value={values.berat_bruto_total}
                    onChange={(e) => handleChange('berat_bruto_total', e.target.value)}
                  />
                </div>
              </div>
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
                  <Label className="text-xs">Harga Beli per Peti (Rp)</Label>
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
                  <Label className="text-xs">Biaya Transport per Peti (Rp)</Label>
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
                      <span className="text-muted-foreground">Berat Peti Total</span>
                      <span className="text-red-500">- {formatKg(result.beratPetiTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Berat Afkir ({formatPersen(parseFloat(values.pct_afkir) || 0)})
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

                  {/* Simulasi Harga Jual */}
                  {result.isValid && result.netYield > 0 && result.hppPerKg > 0 && (
                    <SimulasiHarga hppPerKg={result.hppPerKg} />
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
function SimulasiHarga({ hppPerKg }: { hppPerKg: number }) {
  const [marginDapur, setMarginDapur] = useState('2000')
  const [marginSupplier, setMarginSupplier] = useState('1500')

  const hargaDapur    = hppPerKg + (parseFloat(marginDapur)    || 0)
  const hargaSupplier = hppPerKg + (parseFloat(marginSupplier) || 0)

  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Simulasi Harga Jual
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
          <p className="text-xs font-medium text-center">{formatRupiahFull(hargaDapur)}</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Margin Suplier (Rp/kg)</Label>
          <Input
            type="number"
            className="h-7 text-xs"
            value={marginSupplier}
            onChange={(e) => setMarginSupplier(e.target.value)}
          />
          <p className="text-xs font-medium text-center">{formatRupiahFull(hargaSupplier)}</p>
        </div>
      </div>
      {hargaSupplier > hargaDapur && (
        <p className="text-xs text-yellow-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Harga suplier melebihi harga dapur (tidak logis)
        </p>
      )}
    </div>
  )
}
