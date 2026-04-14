'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatRupiahFull, formatKg } from '@/lib/calculations/hpp'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table'
import { ShoppingCart, Trash2, Search, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// TYPES
// ============================================================
type PembelianRow = {
  id: string
  no_transaksi: string | null
  tanggal: string
  musim: string
  jumlah_peti: number
  harga_beli_per_peti: number
  net_yield: number | null
  hpp_per_kg: number | null
  catatan: string | null
  created_at: string
  buah:    { nama: string } | null
  pemasok: { nama: string } | null
}

const MUSIM_LABEL: Record<string, string> = {
  kemarau: 'Kemarau',
  hujan:   'Hujan',
}

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function JurnalPembelianPage() {
  const supabase = createClient()

  const [rows, setRows]             = useState<PembelianRow[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo]     = useState('')
  const [filterBuah, setFilterBuah] = useState('')

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<PembelianRow | null>(null)
  const [isDeleting, setIsDeleting]     = useState(false)

  // ============================================================
  // FETCH
  // ============================================================
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    let query = supabase
      .from('pembelian')
      .select('id, no_transaksi, tanggal, musim, jumlah_peti, harga_beli_per_peti, net_yield, hpp_per_kg, catatan, created_at, buah:buah_id(nama), pemasok:pemasok_id(nama)')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })

    if (filterFrom) query = query.gte('tanggal', filterFrom)
    if (filterTo)   query = query.lte('tanggal', filterTo)

    const { data, error } = await query
    if (error) {
      toast.error('Gagal memuat data: ' + error.message)
    } else {
      let result = (data ?? []) as unknown as PembelianRow[]
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
      .from('pembelian')
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
  const totalNilai = rows.reduce((s, r) => s + r.jumlah_peti * r.harga_beli_per_peti, 0)
  const totalNetYield = rows.reduce((s, r) => s + (r.net_yield ?? 0), 0)

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Jurnal Pembelian
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Riwayat semua transaksi pembelian buah dari pemasok
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
            <span className="text-muted-foreground">Total nilai beli: </span>
            <span className="font-semibold">{formatRupiahFull(totalNilai)}</span>
          </div>
          {totalNetYield > 0 && (
            <div className="rounded-lg border bg-card px-3 py-2">
              <span className="text-muted-foreground">Total net yield: </span>
              <span className="font-semibold">{formatKg(totalNetYield)}</span>
            </div>
          )}
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
              <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground opacity-30 mb-3" />
              <p className="text-sm text-muted-foreground">Belum ada data pembelian</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>No. Transaksi</TableHead>
                  <TableHead>Buah</TableHead>
                  <TableHead>Pemasok</TableHead>
                  <TableHead className="text-center">Musim</TableHead>
                  <TableHead className="text-right">Jml Kemasan</TableHead>
                  <TableHead className="text-right">Net Yield (kg)</TableHead>
                  <TableHead className="text-right">HPP/kg</TableHead>
                  <TableHead className="text-right">Total Beli</TableHead>
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
                    <TableCell className="text-sm text-muted-foreground">{row.pemasok?.nama ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn('text-xs', row.musim === 'kemarau' ? 'text-amber-600 border-amber-300' : 'text-blue-600 border-blue-300')}>
                        {MUSIM_LABEL[row.musim] ?? row.musim}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{row.jumlah_peti}</TableCell>
                    <TableCell className="text-right text-sm">
                      {row.net_yield != null ? formatKg(row.net_yield) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {row.hpp_per_kg != null ? formatRupiahFull(row.hpp_per_kg) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatRupiahFull(row.jumlah_peti * row.harga_beli_per_peti)}
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
              Hapus Transaksi Pembelian
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
                <span className="text-muted-foreground">Pemasok</span>
                <span>{deleteTarget.pemasok?.nama ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Beli</span>
                <span className="font-semibold">{formatRupiahFull(deleteTarget.jumlah_peti * deleteTarget.harga_beli_per_peti)}</span>
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
