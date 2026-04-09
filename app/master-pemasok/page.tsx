'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { PemasokRow } from '@/types/database.types'

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
import { Plus, Pencil, Loader2, Phone, MapPin } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ============================================================
// SCHEMA VALIDASI
// ============================================================
const pemasokSchema = z.object({
  kode:           z.string().max(20).optional(),
  nama:           z.string().min(1, 'Nama pemasok wajib diisi').max(100),
  kategori:       z.enum(['Tangan 1', 'Tangan 2', 'Tangan 3']).optional(),
  kontak_nama:    z.string().max(100).optional(),
  kontak_telepon: z.string().max(20).optional(),
  alamat:         z.string().optional(),
  kota:           z.string().max(100).optional(),
  catatan:        z.string().optional(),
})
type PemasokFormValues = z.infer<typeof pemasokSchema>

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function MasterPemasokPage() {
  const supabase = createClient()

  const [pemasokList, setPemasokList] = useState<PemasokRow[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPemasok, setEditingPemasok] = useState<PemasokRow | null>(null)
  const [isSaving, setIsSaving]       = useState(false)

  const form = useForm<PemasokFormValues>({
    resolver: zodResolver(pemasokSchema),
    defaultValues: {
      kode: '', nama: '', kategori: undefined, kontak_nama: '', kontak_telepon: '',
      alamat: '', kota: '', catatan: '',
    },
  })

  // ============================================================
  // DATA FETCHING
  // ============================================================
  async function fetchPemasok() {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('pemasok')
      .select('*')
      .order('nama', { ascending: true })

    if (error) {
      toast.error('Gagal memuat data pemasok: ' + error.message)
    } else {
      setPemasokList(data ?? [])
    }
    setIsLoading(false)
  }

  useEffect(() => { fetchPemasok() }, [])

  // ============================================================
  // HANDLERS
  // ============================================================
  function openAddDialog() {
    setEditingPemasok(null)
    form.reset({ kode: '', nama: '', kategori: undefined, kontak_nama: '', kontak_telepon: '', alamat: '', kota: '', catatan: '' })
    setIsDialogOpen(true)
  }

  function openEditDialog(pemasok: PemasokRow) {
    setEditingPemasok(pemasok)
    form.reset({
      kode: pemasok.kode ?? '',
      nama: pemasok.nama,
      kategori: (pemasok.kategori as 'Tangan 1' | 'Tangan 2' | 'Tangan 3') ?? undefined,
      kontak_nama: pemasok.kontak_nama ?? '',
      kontak_telepon: pemasok.kontak_telepon ?? '',
      alamat: pemasok.alamat ?? '',
      kota: pemasok.kota ?? '',
      catatan: pemasok.catatan ?? '',
    })
    setIsDialogOpen(true)
  }

  async function onSubmit(values: PemasokFormValues) {
    setIsSaving(true)
    const payload = {
      kode: values.kode || null,
      nama: values.nama,
      kategori: values.kategori || null,
      kontak_nama: values.kontak_nama || null,
      kontak_telepon: values.kontak_telepon || null,
      alamat: values.alamat || null,
      kota: values.kota || null,
      catatan: values.catatan || null,
    }

    if (editingPemasok) {
      const { error } = await supabase.from('pemasok').update(payload).eq('id', editingPemasok.id)
      if (error) {
        toast.error('Gagal update: ' + error.message)
      } else {
        toast.success(`Pemasok "${values.nama}" berhasil diperbarui`)
        setIsDialogOpen(false)
        fetchPemasok()
      }
    } else {
      const { error } = await supabase.from('pemasok').insert(payload)
      if (error) {
        toast.error('Gagal menyimpan: ' + error.message)
      } else {
        toast.success(`Pemasok "${values.nama}" berhasil ditambahkan`)
        setIsDialogOpen(false)
        fetchPemasok()
      }
    }
    setIsSaving(false)
  }

  async function toggleActive(pemasok: PemasokRow) {
    const { error } = await supabase
      .from('pemasok')
      .update({ is_active: !pemasok.is_active })
      .eq('id', pemasok.id)
    if (error) {
      toast.error('Gagal mengubah status: ' + error.message)
    } else {
      toast.success(`Status "${pemasok.nama}" diubah`)
      fetchPemasok()
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total {pemasokList.filter(p => p.is_active).length} pemasok aktif
        </p>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Tambah Pemasok
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daftar Pemasok</CardTitle>
          <CardDescription>
            Data pemasok digunakan saat mencatat transaksi pembelian harian.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Kode</TableHead>
                <TableHead>Nama Pemasok</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Kontak Person</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead>Kota</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Memuat data...</p>
                  </TableCell>
                </TableRow>
              ) : pemasokList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground text-sm">
                    Belum ada data pemasok. Klik &quot;Tambah Pemasok&quot; untuk memulai.
                  </TableCell>
                </TableRow>
              ) : (
                pemasokList.map((pemasok) => (
                  <TableRow key={pemasok.id} className={!pemasok.is_active ? 'opacity-50' : ''}>
                    <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                      {pemasok.kode ?? '—'}
                    </TableCell>
                    <TableCell className="font-medium">{pemasok.nama}</TableCell>
                    <TableCell>
                      {pemasok.kategori ? (
                        <Badge
                          variant="outline"
                          className={pemasok.kategori === 'Tangan 1' ? 'border-green-300 text-green-700' : pemasok.kategori === 'Tangan 2' ? 'border-blue-300 text-blue-700' : 'border-orange-300 text-orange-700'}
                        >
                          {pemasok.kategori}
                        </Badge>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {pemasok.kontak_nama ?? '—'}
                    </TableCell>
                    <TableCell>
                      {pemasok.kontak_telepon ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {pemasok.kontak_telepon}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {pemasok.kota ? (
                        <span className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {pemasok.kota}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={pemasok.is_active ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleActive(pemasok)}
                      >
                        {pemasok.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(pemasok)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPemasok ? `Edit: ${editingPemasok.nama}` : 'Tambah Pemasok Baru'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kode <span className="text-muted-foreground">(opsional)</span></Label>
                <Input placeholder="SUP-01" {...form.register('kode')} />
              </div>
              <div className="space-y-1.5">
                <Label>Nama Pemasok <span className="text-red-500">*</span></Label>
                <Input placeholder="CV. Buah Segar Nusantara" {...form.register('nama')} />
                {form.formState.errors.nama && (
                  <p className="text-xs text-red-500">{form.formState.errors.nama.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Kategori Pemasok</Label>
              <Select
                onValueChange={(v) => form.setValue('kategori', (v ?? '') as 'Tangan 1' | 'Tangan 2' | 'Tangan 3')}
                value={form.watch('kategori') || ''}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tangan 1">
                    <span className="font-medium text-green-700">Tangan 1</span>
                    <span className="text-xs text-muted-foreground ml-2">Langsung dari kebun/produsen</span>
                  </SelectItem>
                  <SelectItem value="Tangan 2">
                    <span className="font-medium text-blue-700">Tangan 2</span>
                    <span className="text-xs text-muted-foreground ml-2">Distributor regional</span>
                  </SelectItem>
                  <SelectItem value="Tangan 3">
                    <span className="font-medium text-orange-700">Tangan 3</span>
                    <span className="text-xs text-muted-foreground ml-2">Sub-distributor</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nama Kontak</Label>
                <Input placeholder="Pak Budi" {...form.register('kontak_nama')} />
              </div>
              <div className="space-y-1.5">
                <Label>No. Telepon</Label>
                <Input placeholder="0812-xxxx-xxxx" {...form.register('kontak_telepon')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kota</Label>
                <Input placeholder="Jakarta" {...form.register('kota')} />
              </div>
              <div className="space-y-1.5">
                <Label>Alamat</Label>
                <Input placeholder="Jl. ..." {...form.register('alamat')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Input placeholder="Catatan tambahan..." {...form.register('catatan')} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {editingPemasok ? 'Simpan Perubahan' : 'Tambah Pemasok'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
