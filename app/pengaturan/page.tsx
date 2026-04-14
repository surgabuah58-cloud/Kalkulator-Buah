'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Settings, Trash2, ShoppingCart, TrendingUp, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'

// ============================================================
// TYPES
// ============================================================
type Counts = {
  pembelian: number
  penjualan: number
}

type DeleteScope = 'pembelian' | 'penjualan' | null

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function PengaturanPage() {
  const supabase = createClient()

  const [counts, setCounts]               = useState<Counts>({ pembelian: 0, penjualan: 0 })
  const [isLoadingCounts, setIsLoadingCounts] = useState(true)

  // Delete-all dialog
  const [deleteScope, setDeleteScope]     = useState<DeleteScope>(null)
  const [confirmText, setConfirmText]     = useState('')
  const [isDeleting, setIsDeleting]       = useState(false)

  // Date-range delete
  const [rangeScope, setRangeScope]       = useState<DeleteScope>(null)
  const [rangeFrom, setRangeFrom]         = useState('')
  const [rangeTo, setRangeTo]             = useState('')
  const [rangeCount, setRangeCount]       = useState<number | null>(null)
  const [isCountingRange, setIsCountingRange] = useState(false)
  const [confirmRangeText, setConfirmRangeText] = useState('')
  const [isDeletingRange, setIsDeletingRange]   = useState(false)

  // ============================================================
  // FETCH COUNTS
  // ============================================================
  async function fetchCounts() {
    setIsLoadingCounts(true)
    const [pemRes, penRes] = await Promise.all([
      supabase.from('pembelian').select('id', { count: 'exact', head: true }),
      supabase.from('penjualan').select('id', { count: 'exact', head: true }),
    ])
    setCounts({
      pembelian: pemRes.count ?? 0,
      penjualan: penRes.count ?? 0,
    })
    setIsLoadingCounts(false)
  }

  useEffect(() => { fetchCounts() }, [])

  // ============================================================
  // DELETE ALL
  // ============================================================
  async function handleDeleteAll() {
    if (!deleteScope) return
    setIsDeleting(true)
    const { error } = await supabase.from(deleteScope).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) {
      toast.error('Gagal menghapus: ' + error.message)
    } else {
      const label = deleteScope === 'pembelian' ? 'Pembelian' : 'Penjualan'
      toast.success(`Semua data ${label} berhasil dihapus`)
      setCounts(prev => ({ ...prev, [deleteScope]: 0 }))
      setDeleteScope(null)
      setConfirmText('')
    }
    setIsDeleting(false)
  }

  // ============================================================
  // COUNT RANGE
  // ============================================================
  async function handleCountRange() {
    if (!rangeScope || !rangeFrom || !rangeTo) return
    setIsCountingRange(true)
    let query = supabase.from(rangeScope).select('id', { count: 'exact', head: true })
    query = query.gte('tanggal', rangeFrom).lte('tanggal', rangeTo)
    const { count, error } = await query
    if (error) {
      toast.error('Gagal menghitung: ' + error.message)
    } else {
      setRangeCount(count ?? 0)
    }
    setIsCountingRange(false)
  }

  // ============================================================
  // DELETE RANGE
  // ============================================================
  async function handleDeleteRange() {
    if (!rangeScope || !rangeFrom || !rangeTo) return
    setIsDeletingRange(true)
    let query = supabase.from(rangeScope).delete()
    query = query.gte('tanggal', rangeFrom).lte('tanggal', rangeTo)
    const { error } = await (query as ReturnType<typeof query.gte>)
    if (error) {
      toast.error('Gagal menghapus: ' + error.message)
    } else {
      const label = rangeScope === 'pembelian' ? 'Pembelian' : 'Penjualan'
      toast.success(`Data ${label} dalam rentang tanggal berhasil dihapus`)
      setRangeScope(null)
      setRangeFrom('')
      setRangeTo('')
      setRangeCount(null)
      setConfirmRangeText('')
      fetchCounts()
    }
    setIsDeletingRange(false)
  }

  const CONFIRM_KEYWORD = 'HAPUS'
  const canDeleteAll    = confirmText === CONFIRM_KEYWORD
  const canDeleteRange  = confirmRangeText === CONFIRM_KEYWORD && rangeCount != null && rangeCount > 0

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Pengaturan
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manajemen data dan konfigurasi platform
        </p>
      </div>

      {/* Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Ringkasan Data</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingCounts ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat...
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{counts.pembelian}</p>
                  <p className="text-xs text-muted-foreground">Transaksi Pembelian</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{counts.penjualan}</p>
                  <p className="text-xs text-muted-foreground">Transaksi Penjualan</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchCounts} className="self-center gap-1.5 text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hapus per Rentang Tanggal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-amber-500" />
            Hapus Data per Rentang Tanggal
          </CardTitle>
          <CardDescription className="text-xs">
            Hapus transaksi dalam rentang tanggal tertentu. Gunakan untuk membersihkan data uji coba atau koreksi entri massal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(['pembelian', 'penjualan'] as const).map((scope) => (
            <div key={scope} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                {scope === 'pembelian'
                  ? <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  : <TrendingUp className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm font-medium">
                  {scope === 'pembelian' ? 'Data Pembelian' : 'Data Penjualan'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Dari</p>
                  <Input
                    type="date" className="w-36"
                    value={rangeScope === scope ? rangeFrom : ''}
                    onChange={e => { setRangeScope(scope); setRangeFrom(e.target.value); setRangeCount(null) }}
                    onClick={() => { if (rangeScope !== scope) { setRangeScope(scope); setRangeFrom(''); setRangeTo(''); setRangeCount(null); setConfirmRangeText('') } }}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Sampai</p>
                  <Input
                    type="date" className="w-36"
                    value={rangeScope === scope ? rangeTo : ''}
                    onChange={e => { setRangeScope(scope); setRangeTo(e.target.value); setRangeCount(null) }}
                    onClick={() => { if (rangeScope !== scope) { setRangeScope(scope); setRangeFrom(''); setRangeTo(''); setRangeCount(null); setConfirmRangeText('') } }}
                  />
                </div>
                <Button
                  variant="outline" size="sm"
                  disabled={rangeScope !== scope || !rangeFrom || !rangeTo || isCountingRange}
                  onClick={handleCountRange}
                  className="gap-1.5"
                >
                  {isCountingRange && rangeScope === scope && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Cek Jumlah
                </Button>
              </div>
              {rangeScope === scope && rangeCount != null && (
                <div className="space-y-2">
                  <p className={`text-sm font-medium ${rangeCount === 0 ? 'text-muted-foreground' : 'text-amber-600'}`}>
                    {rangeCount === 0
                      ? 'Tidak ada transaksi dalam rentang ini.'
                      : `Ditemukan ${rangeCount} transaksi dalam rentang ini.`}
                  </p>
                  {rangeCount > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Ketik <code className="rounded bg-muted px-1 py-0.5 font-mono">{CONFIRM_KEYWORD}</code> untuk mengkonfirmasi penghapusan:
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          className="w-32 font-mono uppercase"
                          placeholder={CONFIRM_KEYWORD}
                          value={confirmRangeText}
                          onChange={e => setConfirmRangeText(e.target.value.toUpperCase())}
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!canDeleteRange || isDeletingRange}
                          onClick={() => setRangeScope(scope)}
                          className="gap-1.5"
                        >
                          {isDeletingRange ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          Hapus {rangeCount} Data
                        </Button>
                        {canDeleteRange && (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isDeletingRange}
                            onClick={handleDeleteRange}
                          >
                            {isDeletingRange && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Konfirmasi Hapus
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Zona Bahaya
          </CardTitle>
          <CardDescription className="text-xs">
            Tindakan berikut bersifat permanen dan tidak dapat dibatalkan. Gunakan dengan hati-hati.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {([
            { scope: 'pembelian' as const, label: 'Hapus Semua Data Pembelian', count: counts.pembelian, icon: ShoppingCart },
            { scope: 'penjualan' as const, label: 'Hapus Semua Data Penjualan', count: counts.penjualan, icon: TrendingUp },
          ]).map(({ scope, label, count, icon: Icon }) => (
            <div key={scope} className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {count > 0 ? `${count} transaksi akan dihapus` : 'Tidak ada data'}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                disabled={count === 0}
                onClick={() => { setDeleteScope(scope); setConfirmText('') }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus Semua
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Delete-All Confirmation Dialog */}
      <Dialog open={!!deleteScope} onOpenChange={(open) => { if (!open) { setDeleteScope(null); setConfirmText('') } }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Hapus Semua Data {deleteScope === 'pembelian' ? 'Pembelian' : 'Penjualan'}
            </DialogTitle>
            <DialogDescription>
              Tindakan ini akan menghapus <strong>semua {deleteScope === 'pembelian' ? counts.pembelian : counts.penjualan} transaksi</strong> secara permanen dan tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm">
              Ketik <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-destructive">{CONFIRM_KEYWORD}</code> untuk mengkonfirmasi:
            </p>
            <Input
              className="font-mono uppercase"
              placeholder={CONFIRM_KEYWORD}
              value={confirmText}
              onChange={e => setConfirmText(e.target.value.toUpperCase())}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteScope(null); setConfirmText('') }} disabled={isDeleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteAll} disabled={!canDeleteAll || isDeleting}>
              {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Hapus Semua Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
