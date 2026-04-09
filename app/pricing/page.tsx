'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { calculatePricingValidation, formatRupiahFull } from '@/lib/calculations/hpp'
import type { PricingMatrixRow } from '@/types/database.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Save, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// TIPE LOKAL
// ============================================================
interface PricingEditState {
  [buahId: string]: {
    harga_mentok_pasar: string
    harga_jual_dapur: string
    harga_jual_supplier: string
    isDirty: boolean
    isSaving: boolean
  }
}

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function PricingPage() {
  const supabase = createClient()

  const [matrixData, setMatrixData]   = useState<PricingMatrixRow[]>([])
  const [editState, setEditState]     = useState<PricingEditState>({})
  const [isLoading, setIsLoading]     = useState(true)
  const [isSavingAll, setIsSavingAll] = useState(false)

  // ============================================================
  // FETCH DATA
  // ============================================================
  async function fetchPricingMatrix() {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('v_pricing_matrix')
      .select('*')
      .order('nama_buah')

    if (error) {
      toast.error('Gagal memuat data pricing: ' + error.message)
    } else {
      const rows = data ?? []
      setMatrixData(rows)

      // Init edit state dari DB values
      const initState: PricingEditState = {}
      rows.forEach(row => {
        initState[row.buah_id] = {
          harga_mentok_pasar:  row.harga_mentok_pasar?.toString()  ?? '',
          harga_jual_dapur:    row.harga_jual_dapur?.toString()    ?? '',
          harga_jual_supplier: row.harga_jual_supplier?.toString() ?? '',
          isDirty:  false,
          isSaving: false,
        }
      })
      setEditState(initState)
    }
    setIsLoading(false)
  }

  useEffect(() => { fetchPricingMatrix() }, [])

  // ============================================================
  // HANDLERS
  // ============================================================
  function handleInputChange(
    buahId: string,
    field: 'harga_mentok_pasar' | 'harga_jual_dapur' | 'harga_jual_supplier',
    value: string
  ) {
    setEditState(prev => ({
      ...prev,
      [buahId]: { ...prev[buahId], [field]: value, isDirty: true },
    }))
  }

  async function saveSingleRow(row: PricingMatrixRow) {
    const state = editState[row.buah_id]
    if (!state) return

    setEditState(prev => ({
      ...prev,
      [row.buah_id]: { ...prev[row.buah_id], isSaving: true },
    }))

    const payload = {
      buah_id:             row.buah_id,
      harga_mentok_pasar:  state.harga_mentok_pasar  ? Number(state.harga_mentok_pasar)  : null,
      harga_jual_dapur:    state.harga_jual_dapur    ? Number(state.harga_jual_dapur)    : null,
      harga_jual_supplier: state.harga_jual_supplier ? Number(state.harga_jual_supplier) : null,
    }

    // Upsert: insert atau update jika sudah ada
    const { error } = await supabase
      .from('pricing')
      .upsert(payload, { onConflict: 'buah_id' })

    if (error) {
      toast.error(`Gagal simpan harga "${row.nama_buah}": ${error.message}`)
    } else {
      toast.success(`Harga "${row.nama_buah}" berhasil disimpan`)
      setEditState(prev => ({
        ...prev,
        [row.buah_id]: { ...prev[row.buah_id], isDirty: false },
      }))
    }

    setEditState(prev => ({
      ...prev,
      [row.buah_id]: { ...prev[row.buah_id], isSaving: false },
    }))
  }

  async function saveAllDirty() {
    const dirtyRows = matrixData.filter(row => editState[row.buah_id]?.isDirty)
    if (dirtyRows.length === 0) {
      toast.info('Tidak ada perubahan yang perlu disimpan')
      return
    }

    setIsSavingAll(true)
    await Promise.all(dirtyRows.map(row => saveSingleRow(row)))
    await fetchPricingMatrix()
    setIsSavingAll(false)
    toast.success(`${dirtyRows.length} data harga berhasil disimpan`)
  }

  // ============================================================
  // COMPUTED: Hitung validasi real-time dari editState
  // ============================================================
  const rowValidations = useMemo(() => {
    return matrixData.map(row => {
      const state = editState[row.buah_id]
      if (!state) return { buahId: row.buah_id, validation: null }

      const hargaDapur    = state.harga_jual_dapur    ? Number(state.harga_jual_dapur)    : null
      const hargaSupplier = state.harga_jual_supplier ? Number(state.harga_jual_supplier) : null
      const hargaMentok   = state.harga_mentok_pasar  ? Number(state.harga_mentok_pasar)  : null

      const validation = calculatePricingValidation(
        row.hpp_asli_per_kg,
        hargaDapur,
        hargaSupplier,
        hargaMentok,
      )

      return { buahId: row.buah_id, validation }
    })
  }, [matrixData, editState])

  const validationMap = useMemo(() => {
    return Object.fromEntries(rowValidations.map(r => [r.buahId, r.validation]))
  }, [rowValidations])

  // Summary counters
  const summary = useMemo(() => {
    const merah   = rowValidations.filter(r => r.validation?.statusSupplier === 'merah').length
    const kuning  = rowValidations.filter(r => r.validation?.statusSupplier === 'kuning').length
    const dirty   = Object.values(editState).filter(s => s.isDirty).length
    return { merah, kuning, dirty }
  }, [rowValidations, editState])

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {summary.merah > 0 && (
            <Badge variant="destructive" className="gap-1">
              <TrendingDown className="h-3 w-3" />
              {summary.merah} di bawah HPP
            </Badge>
          )}
          {summary.kuning > 0 && (
            <Badge className="gap-1 bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-100">
              <AlertTriangle className="h-3 w-3" />
              {summary.kuning} tidak logis
            </Badge>
          )}
          {summary.merah === 0 && summary.kuning === 0 && !isLoading && (
            <Badge variant="outline" className="gap-1 border-green-300 text-green-700">
              <CheckCircle2 className="h-3 w-3" />
              Semua harga valid
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPricingMatrix}
            disabled={isLoading}
          >
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={saveAllDirty}
            disabled={isSavingAll || summary.dirty === 0}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Simpan Semua {summary.dirty > 0 && `(${summary.dirty})`}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-red-100 border border-red-300 inline-block" />
          Harga suplier &lt; HPP (rugi)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-yellow-100 border border-yellow-300 inline-block" />
          Harga suplier &gt; harga dapur (tidak logis)
        </span>
      </div>

      {/* Tabel Pricing Matrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pricing Matrix</CardTitle>
          <CardDescription>
            Edit harga langsung di tabel. Klik &quot;Simpan&quot; per baris atau &quot;Simpan Semua&quot; untuk semua perubahan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6 min-w-40">Nama Buah</TableHead>
                <TableHead className="text-right min-w-36">HPP Asli / Kg</TableHead>
                <TableHead className="min-w-36">Harga Mentok Pasar</TableHead>
                <TableHead className="min-w-36">Harga Jual Dapur</TableHead>
                <TableHead className="text-right min-w-28">Margin Dapur</TableHead>
                <TableHead className="min-w-36">Harga Jual Suplier</TableHead>
                <TableHead className="text-right min-w-28">Margin Suplier</TableHead>
                <TableHead className="text-center min-w-20">Status</TableHead>
                <TableHead className="text-right pr-6 min-w-20">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : matrixData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground text-sm">
                    Belum ada data buah aktif. Tambahkan di halaman Master Buah terlebih dahulu.
                  </TableCell>
                </TableRow>
              ) : (
                matrixData.map((row) => {
                  const state      = editState[row.buah_id]
                  const validation = validationMap[row.buah_id]
                  const isDirty    = state?.isDirty
                  const isSavingRow = state?.isSaving

                  // Hitung margin real-time dari editState bukan dari DB
                  const hargaDapur    = state?.harga_jual_dapur    ? Number(state.harga_jual_dapur)    : null
                  const hargaSupplier = state?.harga_jual_supplier ? Number(state.harga_jual_supplier) : null
                  const marginDapur    = validation?.marginDapur    ?? null
                  const marginSupplier = validation?.marginSupplier ?? null

                  // Warna baris berdasarkan status validasi supplier
                  const rowBg =
                    validation?.statusSupplier === 'merah'  ? 'bg-red-50 hover:bg-red-100' :
                    validation?.statusSupplier === 'kuning' ? 'bg-yellow-50 hover:bg-yellow-100' :
                    ''

                  return (
                    <TableRow
                      key={row.buah_id}
                      className={cn(rowBg, isDirty && 'ring-1 ring-inset ring-primary/30')}
                    >
                      {/* Nama Buah */}
                      <TableCell className="pl-6">
                        <div className="font-medium text-sm">{row.nama_buah}</div>
                        {row.kode_buah && (
                          <div className="text-xs font-mono text-muted-foreground">{row.kode_buah}</div>
                        )}
                        {isDirty && (
                          <Badge variant="outline" className="mt-0.5 text-xs border-primary/40 text-primary">
                            Belum tersimpan
                          </Badge>
                        )}
                      </TableCell>

                      {/* HPP Asli — Read only */}
                      <TableCell className="text-right">
                        {row.hpp_asli_per_kg ? (
                          <div>
                            <div className="font-semibold text-sm">{formatRupiahFull(row.hpp_asli_per_kg)}</div>
                            <div className="text-xs text-muted-foreground">{row.musim_hpp === 'kemarau' ? '☀️ Kemarau' : '🌧️ Hujan'}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Belum ada data</span>
                        )}
                      </TableCell>

                      {/* Input: Harga Mentok Pasar */}
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="500"
                          className="h-8 text-sm w-full"
                          value={state?.harga_mentok_pasar ?? ''}
                          placeholder="0"
                          onChange={(e) => handleInputChange(row.buah_id, 'harga_mentok_pasar', e.target.value)}
                        />
                      </TableCell>

                      {/* Input: Harga Jual Dapur */}
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="500"
                          className={cn(
                            'h-8 text-sm w-full',
                            validation?.statusDapur === 'error' && 'border-red-400 focus-visible:ring-red-400'
                          )}
                          value={state?.harga_jual_dapur ?? ''}
                          placeholder="0"
                          onChange={(e) => handleInputChange(row.buah_id, 'harga_jual_dapur', e.target.value)}
                        />
                        {validation?.pesanDapur && (
                          <p className="text-xs text-red-500 mt-0.5">{validation.pesanDapur}</p>
                        )}
                      </TableCell>

                      {/* Margin Dapur — Auto calc */}
                      <TableCell className="text-right">
                        {marginDapur !== null ? (
                          <span className={cn(
                            'text-sm font-medium',
                            marginDapur >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {marginDapur >= 0 ? '+' : ''}{formatRupiahFull(marginDapur)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Input: Harga Jual Supplier */}
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="500"
                          className={cn(
                            'h-8 text-sm w-full',
                            validation?.statusSupplier === 'merah'  && 'border-red-400 focus-visible:ring-red-400',
                            validation?.statusSupplier === 'kuning' && 'border-yellow-400 focus-visible:ring-yellow-400'
                          )}
                          value={state?.harga_jual_supplier ?? ''}
                          placeholder="0"
                          onChange={(e) => handleInputChange(row.buah_id, 'harga_jual_supplier', e.target.value)}
                        />
                        {validation?.pesanSupplier && (
                          <p className="text-xs text-red-500 mt-0.5">{validation.pesanSupplier}</p>
                        )}
                      </TableCell>

                      {/* Margin Supplier — Auto calc */}
                      <TableCell className="text-right">
                        {marginSupplier !== null ? (
                          <span className={cn(
                            'text-sm font-medium',
                            marginSupplier >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {marginSupplier >= 0 ? '+' : ''}{formatRupiahFull(marginSupplier)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell className="text-center">
                        {validation?.statusSupplier === 'merah' ? (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <TrendingDown className="h-3 w-3" /> Rugi
                          </Badge>
                        ) : validation?.statusSupplier === 'kuning' ? (
                          <Badge className="text-xs gap-1 bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-100">
                            <AlertTriangle className="h-3 w-3" /> Tidak Logis
                          </Badge>
                        ) : hargaSupplier || hargaDapur ? (
                          <Badge variant="outline" className="text-xs gap-1 border-green-300 text-green-700">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Tombol Simpan */}
                      <TableCell className="text-right pr-6">
                        <Button
                          variant={isDirty ? 'default' : 'ghost'}
                          size="sm"
                          className="h-7 text-xs"
                          disabled={!isDirty || isSavingRow}
                          onClick={() => saveSingleRow(row)}
                        >
                          {isSavingRow ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info HPP */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground">
            <strong>HPP Asli</strong> diambil dari transaksi pembelian terakhir per buah.
            Untuk memperbarui HPP, lakukan input pembelian terbaru di halaman Input Pembelian.
            Validasi merah (🔴) = harga suplier di bawah HPP.
            Validasi kuning (🟡) = harga suplier lebih tinggi dari harga dapur.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
