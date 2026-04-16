'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatRupiahFull } from '@/lib/calculations/hpp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RupiahInput } from '@/components/ui/rupiah-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Wallet, Loader2, Trash2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KasMasukRow } from '@/types/database.types'

const KATEGORI_LABEL: Record<string, { label: string; color: string }> = {
  modal_awal:    { label: 'Modal Awal',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
  injeksi_modal: { label: 'Injeksi Modal', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  pinjaman:      { label: 'Pinjaman',      color: 'bg-amber-100 text-amber-700 border-amber-200' },
  lainnya:       { label: 'Lainnya',       color: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const kasSchema = z.object({
  tanggal:   z.string().min(1, 'Tanggal wajib diisi'),
  kategori:  z.string().min(1, 'Pilih kategori'),
  jumlah:    z.number({ error: 'Masukkan angka' }).min(1, 'Jumlah harus > 0'),
  deskripsi: z.string().min(1, 'Deskripsi wajib diisi').max(200),
  catatan:   z.string().optional(),
})
type KasFormValues = z.infer<typeof kasSchema>

export default function KasMasukPage() {
  const supabase = createClient()
  const [rows, setRows]                 = useState<KasMasukRow[]>([])
  const [isLoading, setIsLoading]       = useState(true)
  const [isSaving, setIsSaving]         = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<KasMasukRow | null>(null)
  const [isDeleting, setIsDeleting]     = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const form = useForm<KasFormValues>({
    resolver: zodResolver(kasSchema),
    defaultValues: { tanggal: today, kategori: '', jumlah: 0, deskripsi: '', catatan: '' },
  })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('kas_masuk')
      .select('*')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) toast.error('Gagal memuat data: ' + error.message)
    else setRows((data ?? []) as KasMasukRow[])
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // State lokal untuk field Rupiah (agar bisa format ribuan)
  const [jumlahVal, setJumlahVal] = useState(0)

  async function onSubmit(values: KasFormValues) {
    setIsSaving(true)
    const payload = {
      tanggal:   values.tanggal,
      kategori:  values.kategori as KasMasukRow['kategori'],
      jumlah:    values.jumlah,
      deskripsi: values.deskripsi,
      catatan:   values.catatan || null,
    }
    console.log('[KasMasuk] onSubmit payload:', payload)
    const { data, error } = await supabase.from('kas_masuk').insert(payload).select()
    if (error) {
      console.error('[KasMasuk] INSERT error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      toast.error('Gagal menyimpan: ' + error.message)
    } else {
      console.log('[KasMasuk] INSERT berhasil:', data)
      toast.success('Kas masuk berhasil dicatat')
      form.reset({ tanggal: today, kategori: '', jumlah: 0, deskripsi: '', catatan: '' })
      setJumlahVal(0)
      fetchData()
    }
    setIsSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    const { error } = await supabase.from('kas_masuk').delete().eq('id', deleteTarget.id)
    if (error) {
      toast.error('Gagal menghapus: ' + error.message)
    } else {
      toast.success('Data berhasil dihapus')
      setRows(prev => prev.filter(r => r.id !== deleteTarget.id))
      setDeleteTarget(null)
    }
    setIsDeleting(false)
  }

  const totalByKategori = (Object.keys(KATEGORI_LABEL) as KasMasukRow['kategori'][]).reduce(
    (acc, k) => { acc[k] = rows.filter(r => r.kategori === k).reduce((s, r) => s + r.jumlah, 0); return acc },
    {} as Record<string, number>
  )
  const grandTotal = rows.reduce((s, r) => s + r.jumlah, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Kas Masuk
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Catat modal awal, injeksi dana, pinjaman, dan pemasukan non-penjualan buah
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tambah Kas Masuk</CardTitle>
              <CardDescription className="text-xs">
                Input setiap pemasukan modal atau dana yang bukan berasal dari penjualan buah
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.error('[KasMasuk] ❌ Validasi GAGAL:', JSON.stringify(errors, null, 2))
                console.log('[KasMasuk] Nilai form saat ini:', form.getValues())
              })} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Tanggal <span className="text-red-500">*</span></Label>
                    <Input type="date" {...form.register('tanggal')} />
                    {form.formState.errors.tanggal && (
                      <p className="text-xs text-red-500">{form.formState.errors.tanggal.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Kategori <span className="text-red-500">*</span></Label>
                    <Select
                      value={form.watch('kategori')}
                      onValueChange={(v) => form.setValue('kategori', v ?? '', { shouldValidate: true })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori...">
                          {form.watch('kategori') ? KATEGORI_LABEL[form.watch('kategori')]?.label : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {Object.entries(KATEGORI_LABEL).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.kategori && (
                      <p className="text-xs text-red-500">{form.formState.errors.kategori.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Jumlah (Rp) <span className="text-red-500">*</span></Label>
                    <RupiahInput
                      value={jumlahVal}
                      onChange={(v) => { setJumlahVal(v); form.setValue('jumlah', v, { shouldValidate: true }) }}
                      placeholder="Contoh: 5.000.000"
                    />
                    {form.formState.errors.jumlah && (
                      <p className="text-xs text-red-500">{form.formState.errors.jumlah.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Deskripsi <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="Contoh: Modal awal operasional April..."
                      {...form.register('deskripsi')}
                    />
                    {form.formState.errors.deskripsi && (
                      <p className="text-xs text-red-500">{form.formState.errors.deskripsi.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Catatan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
                  <Input placeholder="Catatan tambahan..." {...form.register('catatan')} />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    onClick={() => console.log('[KasMasuk] 🖱️ Tombol Simpan diklik, form values:', form.getValues())}
                  >
                    {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Simpan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Ringkasan Total</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {grandTotal > 0 ? (
                <>
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Total Kas Masuk</p>
                    <p className="text-xl font-bold text-primary">{formatRupiahFull(grandTotal)}</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {(Object.entries(KATEGORI_LABEL) as [KasMasukRow['kategori'], typeof KATEGORI_LABEL[string]][]).map(([k, v]) =>
                      totalByKategori[k] > 0 ? (
                        <div key={k} className="flex items-center justify-between text-xs">
                          <Badge variant="outline" className={cn('text-xs', v.color)}>{v.label}</Badge>
                          <span className="font-semibold">{formatRupiahFull(totalByKategori[k])}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">Belum ada data</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Riwayat */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Riwayat Kas Masuk</h2>
          <Button onClick={fetchData} variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center">
                <Wallet className="h-8 w-8 mx-auto text-muted-foreground opacity-30 mb-3" />
                <p className="text-sm text-muted-foreground">Belum ada data kas masuk</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(row.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', KATEGORI_LABEL[row.kategori]?.color)}>
                          {KATEGORI_LABEL[row.kategori]?.label ?? row.kategori}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{row.deskripsi}</TableCell>
                      <TableCell className="text-right font-semibold text-primary text-sm">
                        {formatRupiahFull(row.jumlah)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(row)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Hapus Data Kas Masuk
            </DialogTitle>
            <DialogDescription>Data akan dihapus permanen dan tidak dapat dikembalikan.</DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tanggal</span>
                <span>{new Date(deleteTarget.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kategori</span>
                <span>{KATEGORI_LABEL[deleteTarget.kategori]?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deskripsi</span>
                <span className="font-medium">{deleteTarget.deskripsi}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jumlah</span>
                <span className="font-semibold text-primary">{formatRupiahFull(deleteTarget.jumlah)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
