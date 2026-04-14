'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatRupiahFull, formatKg } from '@/lib/calculations/hpp'
import type { TipePelanggan } from '@/types/database.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table'
import { TrendingUp, TrendingDown, Trash2, Search, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// TYPES
// ============================================================
type PenjualanRow = {
  id: string
  no_transaksi: string | null
  tanggal: string
  jumlah_kg: number
  harga_jual_per_kg: number
  total_nilai: number
  hpp_snapshot: number | null
  margin_per_kg: number | null
  spare_pct: number | null
  tipe_jual: string | null
  catatan: string | null
  created_at: string
  buah:     { nama: string } | null
  pelanggan: { nama: string; tipe: TipePelanggan } | null
}

const TIPE_LABEL: Record<TipePelanggan, string> = {
  sub_supplier: 'Sub Supplier',
  dapur_mbg:    'Dapur MBG',
  retail:       'Retail',
}

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function JurnalPenjualanPage() {
  const supabase = createClient()

  const [rows, setRows]             = useState<PenjualanRow[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo]     = useState('')
  const [filterBuah, setFilterBuah] = useState('')

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<PenjualanRow | null>(null)
  const [isDeleting, setIsDeleting]     = useState(false)

  // ============================================================
  // FETCH
  // ============================================================
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    let query = supabase
      .from('penjualan')
      .select('id, no_transaksi, tanggal, jumlah_kg, harga_jual_per_kg, total_nilai, hpp_snapshot, margin_per_kg, spare_pct, tipe_jual, catatan, created_at, buah:buah_id(nama), pelanggan:pelanggan_id(nama, tipe)')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })

    if (filterFrom) query = query.gte('tanggal', filterFrom)
    if (filterTo)   query = query.lte('tanggal', filterTo)

    const { data, error } = await query
    if (error) {
      toast.error('Gagal memuat data: ' + error.message)
    } else {
      let result = (data ?? []) as unknown as PenjualanRow[]
      if (filterBuah.trim()) {
        const q = filterBuah.toLowerCase()
        result = result.filter(r => r.buah?.nama?.toLowerCase().includes(q))
      }
      setRows(result)
    }
    setIsLoading(false)
  }, [filterFrom, filterTo, filterBuah])

  useEffect(() => { fetchData() }, [])

  // ============================================================
  // DELETE
  // ============================================================
  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    const { error } = await supabase
      .from('penjualan')
      .delete()
      .eq('id', deleteTarget.id)
    if (error) {
      toast.error('Gagal menghapus: ' + error.message)
    } else {
      toast.success(`Transaksi ${deleteTarget.no_transaksi ?? deleteTarget.id.slice(0, 8)} berhasil dihapus`)
      setRows(prev => prev.filter(r => r.id !== deleteTarget.id))
      setDeleteTarget(null)
    }
    setIsDeleting(false)
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  const totalNilai  = rows.reduce((s, r) => s + (r.total_nilai ?? 0), 0)
  const totalMargin = rows.reduce((s, r) => s + (r.margin_per_kg != null ? r.margin_per_kg * r.jumlah_kg : 0), 0)
  const totalKg     = rows.reduce((s, r) => s + r.jumlah_kg, 0)

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Jurnal Penjualan
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Riwayat semua transaksi penjualan buah ke pelanggan
        </p>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Dari Tanggal</p>
              <Input type="date" className="w-40" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Sampai Tanggal</p>
              <Input type="date" className="w-40" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Cari Buah</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-7 w-44" placeholder="Nama buah..." value={filterBuah} onChange={e => setFilterBuah(e.target.value)} />
              </div>
            </div>
            <Button onClick={fetchData} variant="outline" size="sm" className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Tampilkan
            </Button>
            {(filterFrom || filterTo || filterBuah) && (
              <Button
                onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterBuah('') }}
                variant="ghost" size="sm"
              >
                Reset Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary pills */}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="rounded-lg border bg-card px-3 py-2">
            <span className="text-muted-foreground">Total transaksi: </span>
            <span className="font-semibold">{rows.length}</span>
          </div>
          <div className="rounded-lg border bg-card px-3 py-2">
            <span className="text-muted-foreground">Total kg terjual: </span>
            <span className="font-semibold">{formatKg(totalKg)}</span>
          </div>
          <div className="rounded-lg border bg-card px-3 py-2">
            <span className="text-muted-foreground">Total nilai jual: </span>
            <span className="font-semibold">{formatRupiahFull(totalNilai)}</span>
          </div>
          <div className={cn('rounded-lg border px-3 py-2', totalMargin >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
            <span className="text-muted-foreground">Total margin: </span>
            <span className={cn('font-semibold', totalMargin >= 0 ? 'text-green-700' : 'text-red-700')}>
              {formatRupiahFull(totalMargin)}
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center">
              <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground opacity-30 mb-3" />
              <p className="text-sm text-muted-foreground">Belum ada data penjualan</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>No. Transaksi</TableHead>
                  <TableHead>Buah</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead className="text-right">Jml (kg)</TableHead>
                  <TableHead className="text-right">Harga Jual/kg</TableHead>
                  <TableHead className="text-right">Total Nilai</TableHead>
                  <TableHead className="text-right">Margin/kg</TableHead>
                  <TableHead className="text-center">Tipe</TableHead>
                  <TableHead className="text-center">Buffer%</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(row.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{row.no_transaksi ?? '—'}</span>
                    </TableCell>
                    <TableCell className="font-medium">{row.buah?.nama ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm">{row.pelanggan?.nama ?? '—'}</span>
                        {row.pelanggan?.tipe && (
                          <span className="text-xs text-muted-foreground">{TIPE_LABEL[row.pelanggan.tipe]}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatKg(row.jumlah_kg)}</TableCell>
                    <TableCell className="text-right text-sm">{formatRupiahFull(row.harga_jual_per_kg)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatRupiahFull(row.total_nilai)}</TableCell>
                    <TableCell className="text-right">
                      {row.margin_per_kg != null ? (
                        <span className={cn('text-sm font-semibold flex items-center justify-end gap-1', row.margin_per_kg >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {row.margin_per_kg >= 0
                            ? <TrendingUp className="h-3 w-3" />
                            : <TrendingDown className="h-3 w-3" />}
                          {formatRupiahFull(row.margin_per_kg)}
                        </span>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.tipe_jual === 'reject'
                        ? <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Reject</Badge>
                        : <Badge variant="outline" className="text-xs text-green-700 border-green-300">Normal</Badge>}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.spare_pct != null && row.spare_pct > 0
                        ? <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">{row.spare_pct.toFixed(1)}%</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(row)}
                        title="Hapus transaksi"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Hapus Transaksi Penjualan
            </DialogTitle>
            <DialogDescription>
              Anda akan menghapus transaksi berikut secara permanen:
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">No. Transaksi</span>
                <span className="font-mono font-medium">{deleteTarget.no_transaksi ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tanggal</span>
                <span>{new Date(deleteTarget.tanggal).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Buah</span>
                <span className="font-medium">{deleteTarget.buah?.nama ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pelanggan</span>
                <span>{deleteTarget.pelanggan?.nama ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Nilai</span>
                <span className="font-semibold">{formatRupiahFull(deleteTarget.total_nilai)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
