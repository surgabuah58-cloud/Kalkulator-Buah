'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatRupiahFull, formatKg } from '@/lib/calculations/hpp'
import type { PembelianRow, ReturPemasokRow } from '@/types/database.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table'
import { Undo2, Loader2, Trash2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// TYPES
// ============================================================
type PembelianOption = Pick<PembelianRow,
  'id' | 'no_transaksi' | 'tanggal' | 'berat_bruto_total' | 'hpp_per_kg'
> & {
  buah: { nama: string } | null
  pemasok: { nama: string } | null
}

type ReturRow = ReturPemasokRow & {
  pembelian: { no_transaksi: string | null; buah: { nama: string } | null } | null
}

// ============================================================
// SCHEMA
// ============================================================
const returSchema = z.object({
  pembelian_id:        z.string().min(1, 'Pilih batch pembelian'),
  tanggal:             z.string().min(1, 'Tanggal wajib diisi'),
  kg_diretur:          z.number().min(0.01, 'Harus > 0'),
  harga_kredit_per_kg: z.number().min(0, 'Tidak boleh negatif'),
  alasan:              z.string().optional(),
  catatan:             z.string().optional(),
})
type ReturFormValues = z.infer<typeof returSchema>

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function ReturPemasokPage() {
  const supabase = createClient()

  const [pembelianList, setPembelianList] = useState<PembelianOption[]>([])
  const [returList, setReturList]         = useState<ReturRow[]>([])
  const [isSaving, setIsSaving]           = useState(false)
  const [isLoadingPembelian, setIsLoadingPembelian] = useState(true)
  const [isLoadingRetur, setIsLoadingRetur]         = useState(true)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<ReturRow | null>(null)
  const [isDeleting, setIsDeleting]     = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const form = useForm<ReturFormValues>({
    resolver: zodResolver(returSchema),
    defaultValues: {
      pembelian_id:        '',
      tanggal:             today,
      kg_diretur:          0,
      harga_kredit_per_kg: 0,
      alasan:              '',
      catatan:             '',
    },
  })

  const watchedValues = form.watch()

  // ============================================================
  // FETCH PEMBELIAN LIST
  // ============================================================
  useEffect(() => {
    async function fetchPembelian() {
      setIsLoadingPembelian(true)
      const { data, error } = await supabase
        .from('pembelian')
        .select('id, no_transaksi, tanggal, berat_bruto_total, hpp_per_kg, buah:buah_id(nama), pemasok:pemasok_id(nama)')
        .order('tanggal', { ascending: false })
        .limit(100)
      if (error) {
        toast.error('Gagal memuat data pembelian: ' + error.message)
      } else {
        setPembelianList((data ?? []) as unknown as PembelianOption[])
      }
      setIsLoadingPembelian(false)
    }
    fetchPembelian()
  }, [])

  // ============================================================
  // FETCH RETUR LIST
  // ============================================================
  const fetchRetur = useCallback(async () => {
    setIsLoadingRetur(true)
    const { data, error } = await supabase
      .from('retur_pemasok')
      .select('*, pembelian:pembelian_id(no_transaksi, buah:buah_id(nama))')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) {
      toast.error('Gagal memuat riwayat retur: ' + error.message)
    } else {
      setReturList((data ?? []) as unknown as ReturRow[])
    }
    setIsLoadingRetur(false)
  }, [])

  useEffect(() => { fetchRetur() }, [])

  // ============================================================
  // SELECTED PEMBELIAN
  // ============================================================
  const selectedPembelian = useMemo(
    () => pembelianList.find(p => p.id === watchedValues.pembelian_id) ?? null,
    [pembelianList, watchedValues.pembelian_id],
  )

  // ============================================================
  // LIVE PREVIEW
  // ============================================================
  const totalKredit = useMemo(
    () => (watchedValues.kg_diretur || 0) * (watchedValues.harga_kredit_per_kg || 0),
    [watchedValues.kg_diretur, watchedValues.harga_kredit_per_kg],
  )

  // ============================================================
  // SUBMIT
  // ============================================================
  async function onSubmit(values: ReturFormValues) {
    setIsSaving(true)
    const { error } = await supabase.from('retur_pemasok').insert({
      pembelian_id:        values.pembelian_id,
      tanggal:             values.tanggal,
      kg_diretur:          values.kg_diretur,
      harga_kredit_per_kg: values.harga_kredit_per_kg,
      alasan:              values.alasan || null,
      catatan:             values.catatan || null,
    })

    if (error) {
      toast.error('Gagal menyimpan retur: ' + error.message)
    } else {
      toast.success('Retur pemasok berhasil disimpan')
      form.reset({
        pembelian_id:        '',
        tanggal:             today,
        kg_diretur:          0,
        harga_kredit_per_kg: 0,
        alasan:              '',
        catatan:             '',
      })
      fetchRetur()
    }
    setIsSaving(false)
  }

  // ============================================================
  // DELETE
  // ============================================================
  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    const { error } = await supabase
      .from('retur_pemasok')
      .delete()
      .eq('id', deleteTarget.id)
    if (error) {
      toast.error('Gagal menghapus: ' + error.message)
    } else {
      toast.success(`Retur ${deleteTarget.no_retur ?? deleteTarget.id.slice(0, 8)} berhasil dihapus`)
      setReturList(prev => prev.filter(r => r.id !== deleteTarget.id))
      setDeleteTarget(null)
    }
    setIsDeleting(false)
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Undo2 className="h-5 w-5" />
          Retur Pemasok
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Catat pengembalian buah rusak ke pemasok dan kredit yang diterima
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── FORM KIRI ── */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Undo2 className="h-4 w-4" />
                Form Retur Baru
              </CardTitle>
              <CardDescription className="text-xs">
                Catat buah yang dikembalikan ke pemasok
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                {/* Pembelian + Tanggal */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Batch Pembelian <span className="text-red-500">*</span></Label>
                    {isLoadingPembelian ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground h-9">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat...
                      </div>
                    ) : (
                      <Select
                        onValueChange={(v) => form.setValue('pembelian_id', v ?? '', { shouldValidate: true })}
                        value={form.watch('pembelian_id')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih batch pembelian...">
                            {selectedPembelian
                              ? `${selectedPembelian.buah?.nama ?? '—'} · ${selectedPembelian.no_transaksi ?? selectedPembelian.id.slice(0, 8)}`
                              : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          {pembelianList.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="font-medium">{p.buah?.nama ?? '—'}</span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                {p.no_transaksi ?? p.id.slice(0, 8)} · {new Date(p.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {form.formState.errors.pembelian_id && (
                      <p className="text-xs text-red-500">{form.formState.errors.pembelian_id.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tanggal Retur <span className="text-red-500">*</span></Label>
                    <Input type="date" {...form.register('tanggal')} />
                    {form.formState.errors.tanggal && (
                      <p className="text-xs text-red-500">{form.formState.errors.tanggal.message}</p>
                    )}
                  </div>
                </div>

                {/* Info batch */}
                {selectedPembelian && (
                  <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
                    <p className="font-semibold text-muted-foreground uppercase tracking-wide">Info Batch</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Buah</span>
                        <span className="font-medium">{selectedPembelian.buah?.nama ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pemasok</span>
                        <span className="font-medium">{selectedPembelian.pemasok?.nama ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Berat Bruto</span>
                        <span className="font-medium">{formatKg(selectedPembelian.berat_bruto_total)}</span>
                      </div>
                      {selectedPembelian.hpp_per_kg != null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">HPP/kg</span>
                          <span className="font-medium">{formatRupiahFull(selectedPembelian.hpp_per_kg)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Detail Retur */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Detail Retur
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Jumlah Diretur (kg) <span className="text-red-500">*</span></Label>
                      <Input
                        type="number" min="0.01" step="any" placeholder="0.00"
                        {...form.register('kg_diretur', { valueAsNumber: true })}
                      />
                      {form.formState.errors.kg_diretur && (
                        <p className="text-xs text-red-500">{form.formState.errors.kg_diretur.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Harga Kredit per kg (Rp)</Label>
                      <Input
                        type="number" min="0" step="100" placeholder="0"
                        {...form.register('harga_kredit_per_kg', { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground">Harga kredit yang disepakati dengan pemasok</p>
                    </div>
                  </div>

                  {/* Total kredit preview */}
                  {totalKredit > 0 && (
                    <div className="mt-3 rounded-lg bg-primary/5 border border-primary/20 p-3 flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Kredit</span>
                      <span className="text-lg font-bold text-primary">{formatRupiahFull(totalKredit)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Alasan Retur <span className="text-muted-foreground text-xs">(opsional)</span></Label>
                  <Input placeholder="Contoh: Buah terlalu matang, kualitas tidak sesuai..." {...form.register('alasan')} />
                </div>

                <div className="space-y-1.5">
                  <Label>Catatan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
                  <Input placeholder="Catatan tambahan..." {...form.register('catatan')} />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving || !watchedValues.pembelian_id}>
                    {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Simpan Retur
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ── INFO KANAN ── */}
        <div>
          <Card className="md:sticky md:top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Tentang Retur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <p>Retur pemasok dicatat saat buah yang diterima tidak memenuhi standar dan dikembalikan ke pemasok.</p>
              <Separator />
              <div className="space-y-2">
                <p className="font-semibold text-foreground">Kredit dari Pemasok</p>
                <p>Harga kredit yang disepakati biasanya lebih rendah dari harga beli awal. Total kredit dihitung otomatis dari jumlah kg × harga kredit/kg.</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="font-semibold text-foreground">Dampak HPP</p>
                <p>Retur tercatat sebagai kredit terpisah. HPP di jurnal pembelian tidak otomatis berubah — sesuaikan secara manual jika diperlukan.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── RIWAYAT RETUR ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Riwayat Retur</h2>
          <Button onClick={fetchRetur} variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoadingRetur ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : returList.length === 0 ? (
              <div className="py-12 text-center">
                <Undo2 className="h-8 w-8 mx-auto text-muted-foreground opacity-30 mb-3" />
                <p className="text-sm text-muted-foreground">Belum ada data retur</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>No. Retur</TableHead>
                    <TableHead>Buah / Batch</TableHead>
                    <TableHead className="text-right">Kg Diretur</TableHead>
                    <TableHead className="text-right">Harga Kredit/kg</TableHead>
                    <TableHead className="text-right">Total Kredit</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returList.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(row.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{row.no_retur ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-sm">
                            {(row.pembelian as any)?.buah?.nama ?? '—'}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {(row.pembelian as any)?.no_transaksi ?? '—'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatKg(row.kg_diretur)}</TableCell>
                      <TableCell className="text-right text-sm">{formatRupiahFull(row.harga_kredit_per_kg)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-primary">
                        {formatRupiahFull(row.total_kredit)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-32 truncate">
                        {row.alasan ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(row)}
                          title="Hapus retur"
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
      </div>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Hapus Data Retur
            </DialogTitle>
            <DialogDescription>
              Anda akan menghapus data retur berikut secara permanen:
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">No. Retur</span>
                <span className="font-mono font-medium">{deleteTarget.no_retur ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tanggal</span>
                <span>{new Date(deleteTarget.tanggal).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jumlah</span>
                <span>{formatKg(deleteTarget.kg_diretur)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Kredit</span>
                <span className="font-semibold">{formatRupiahFull(deleteTarget.total_kredit)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
