'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { PelangganRow, TipePelanggan } from '@/types/database.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, Loader2, Phone, MapPin, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIPE_OPTIONS: { value: TipePelanggan; label: string; color: string }[] = [
  { value: 'sub_supplier', label: 'Sub Supplier',  color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'dapur_mbg',    label: 'Dapur MBG',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'retail',       label: 'Retail',         color: 'bg-green-100 text-green-700 border-green-200' },
]

function tipeLabel(tipe: TipePelanggan) {
  return TIPE_OPTIONS.find(t => t.value === tipe)?.label ?? tipe
}
function tipeBadge(tipe: TipePelanggan) {
  const opt = TIPE_OPTIONS.find(t => t.value === tipe)
  return opt?.color ?? ''
}

// ============================================================
// SCHEMA VALIDASI
// ============================================================
const pelangganSchema = z.object({
  kode:           z.string().max(20).optional(),
  nama:           z.string().min(1, 'Nama pelanggan wajib diisi').max(100),
  tipe:           z.enum(['sub_supplier', 'dapur_mbg', 'retail'] as const, { error: 'Pilih tipe pelanggan' }),
  kontak_nama:    z.string().max(100).optional(),
  kontak_telepon: z.string().max(20).optional(),
  alamat:         z.string().optional(),
  kota:           z.string().max(100).optional(),
  catatan:        z.string().optional(),
})
type PelangganFormValues = z.infer<typeof pelangganSchema>

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function MasterPelangganPage() {
  const supabase = createClient()

  const [list, setList]               = useState<PelangganRow[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing]         = useState<PelangganRow | null>(null)
  const [isSaving, setIsSaving]       = useState(false)

  const form = useForm<PelangganFormValues>({
    resolver: zodResolver(pelangganSchema),
    defaultValues: { kode: '', nama: '', tipe: undefined, kontak_nama: '', kontak_telepon: '', alamat: '', kota: '', catatan: '' },
  })

  async function fetchList() {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('pelanggan')
      .select('*')
      .order('nama', { ascending: true })
    if (error) toast.error('Gagal memuat: ' + error.message)
    else setList(data ?? [])
    setIsLoading(false)
  }

  useEffect(() => { fetchList() }, [])

  function openAdd() {
    setEditing(null)
    form.reset({ kode: '', nama: '', tipe: undefined, kontak_nama: '', kontak_telepon: '', alamat: '', kota: '', catatan: '' })
    setIsDialogOpen(true)
  }

  function openEdit(row: PelangganRow) {
    setEditing(row)
    form.reset({
      kode: row.kode ?? '',
      nama: row.nama,
      tipe: row.tipe,
      kontak_nama: row.kontak_nama ?? '',
      kontak_telepon: row.kontak_telepon ?? '',
      alamat: row.alamat ?? '',
      kota: row.kota ?? '',
      catatan: row.catatan ?? '',
    })
    setIsDialogOpen(true)
  }

  async function onSubmit(values: PelangganFormValues) {
    setIsSaving(true)
    const payload = {
      kode:           values.kode || null,
      nama:           values.nama,
      tipe:           values.tipe,
      kontak_nama:    values.kontak_nama || null,
      kontak_telepon: values.kontak_telepon || null,
      alamat:         values.alamat || null,
      kota:           values.kota || null,
      catatan:        values.catatan || null,
    }

    if (editing) {
      const { error } = await supabase.from('pelanggan').update(payload).eq('id', editing.id)
      if (error) toast.error('Gagal update: ' + error.message)
      else { toast.success('Data pelanggan diperbarui'); setIsDialogOpen(false); fetchList() }
    } else {
      const { error } = await supabase.from('pelanggan').insert(payload)
      if (error) toast.error('Gagal simpan: ' + error.message)
      else { toast.success('Pelanggan baru ditambahkan'); setIsDialogOpen(false); fetchList() }
    }
    setIsSaving(false)
  }

  async function toggleAktif(row: PelangganRow) {
    const { error } = await supabase.from('pelanggan').update({ is_active: !row.is_active }).eq('id', row.id)
    if (error) toast.error('Gagal update: ' + error.message)
    else { toast.success(row.is_active ? 'Pelanggan dinonaktifkan' : 'Pelanggan diaktifkan'); fetchList() }
  }

  const countByTipe = (tipe: TipePelanggan) => list.filter(r => r.tipe === tipe && r.is_active).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Master Pelanggan</h1>
          <p className="text-sm text-muted-foreground">Kelola data pelanggan: sub supplier, dapur MBG, dan retail</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Tambah Pelanggan
        </Button>
      </div>

      {/* Ringkasan per tipe */}
      <div className="grid grid-cols-3 gap-3">
        {TIPE_OPTIONS.map(opt => (
          <Card key={opt.value}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{opt.label}</p>
              <p className="text-2xl font-bold">{countByTipe(opt.value)}</p>
              <p className="text-xs text-muted-foreground">aktif</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Daftar Pelanggan</CardTitle>
          <CardDescription className="text-xs">{list.length} total pelanggan terdaftar</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center">
              <Store className="h-8 w-8 mx-auto text-muted-foreground opacity-40 mb-3" />
              <p className="text-sm text-muted-foreground">Belum ada pelanggan. Tambahkan yang pertama.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="hidden sm:table-cell">Kontak</TableHead>
                  <TableHead className="hidden md:table-cell">Kota</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(row => (
                  <TableRow key={row.id} className={cn(!row.is_active && 'opacity-50')}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.kode ?? '—'}</TableCell>
                    <TableCell className="font-medium">{row.nama}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', tipeBadge(row.tipe))}>
                        {tipeLabel(row.tipe)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {row.kontak_nama && <div>{row.kontak_nama}</div>}
                      {row.kontak_telepon && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {row.kontak_telepon}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {row.kota && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {row.kota}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => toggleAktif(row)}
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full border font-medium transition-colors',
                          row.is_active
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        )}
                      >
                        {row.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Tambah/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kode <span className="text-muted-foreground">(opsional)</span></Label>
                <Input placeholder="PLG-01" {...form.register('kode')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipe Pelanggan <span className="text-red-500">*</span></Label>
                <Select
                  onValueChange={(v) => form.setValue('tipe', v as TipePelanggan, { shouldValidate: true })}
                  value={form.watch('tipe')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe..." />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {TIPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.tipe && (
                  <p className="text-xs text-red-500">{form.formState.errors.tipe.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nama <span className="text-red-500">*</span></Label>
              <Input placeholder="Nama pelanggan / toko / instansi" {...form.register('nama')} />
              {form.formState.errors.nama && (
                <p className="text-xs text-red-500">{form.formState.errors.nama.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Kontak</Label>
                <Input placeholder="Pak / Bu..." {...form.register('kontak_nama')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telepon</Label>
                <Input placeholder="08xx-xxxx-xxxx" {...form.register('kontak_telepon')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kota</Label>
                <Input placeholder="Jakarta" {...form.register('kota')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Catatan</Label>
                <Input placeholder="Opsional" {...form.register('catatan')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {editing ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
