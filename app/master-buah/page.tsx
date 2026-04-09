'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { BuahRow } from '@/types/database.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Pencil, Loader2, Sun, CloudRain } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ============================================================
// SCHEMA VALIDASI
// ============================================================
const SATUAN_OPTIONS = [
  { value: 'peti',    label: 'Peti' },
  { value: 'krat',   label: 'Krat' },
  { value: 'dus',    label: 'Dus' },
  { value: 'karung', label: 'Karung' },
  { value: 'pcs',    label: 'Pcs / Buah' },
  { value: 'lainnya', label: 'Lainnya' },
]

function getSatuanLabel(satuan: string) {
  return SATUAN_OPTIONS.find(s => s.value === satuan)?.label ?? satuan
}

const buahSchema = z.object({
  kode: z.string().max(20).optional(),
  nama: z.string().min(1, 'Nama buah wajib diisi').max(100),
  kategori: z.string().optional(),
  satuan: z.string().min(1, 'Satuan wajib dipilih'),
  berat_peti_kemarau: z.number().min(0, 'Harus ≥ 0'),
  pct_afkir_kemarau: z.number().min(0).max(100, 'Harus antara 0-100'),
  berat_peti_hujan: z.number().min(0, 'Harus ≥ 0'),
  pct_afkir_hujan: z.number().min(0).max(100, 'Harus antara 0-100'),
  berat_per_pcs_gram: z.number().min(0.01).nullable().optional(),
  deskripsi: z.string().optional(),
})
type BuahFormValues = z.infer<typeof buahSchema>

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function MasterBuahPage() {
  const supabase = createClient()

  const [buahList, setBuahList] = useState<BuahRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBuah, setEditingBuah] = useState<BuahRow | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<BuahFormValues>({
    resolver: zodResolver(buahSchema),
    defaultValues: {
      kode: '',
      nama: '',
      kategori: '',
      satuan: 'peti',
      berat_peti_kemarau: 0,
      pct_afkir_kemarau: 0,
      berat_peti_hujan: 0,
      pct_afkir_hujan: 0,
      berat_per_pcs_gram: null,
      deskripsi: '',
    },
  })

  // ============================================================
  // DATA FETCHING
  // ============================================================
  async function fetchBuah() {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('buah')
      .select('*')
      .order('nama', { ascending: true })

    if (error) {
      toast.error('Gagal memuat data buah: ' + error.message)
    } else {
      setBuahList(data ?? [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchBuah()
  }, [])

  // ============================================================
  // HANDLERS
  // ============================================================
  function openAddDialog() {
    setEditingBuah(null)
    form.reset({
      kode: '',
      nama: '',
      kategori: '',
      satuan: 'peti',
      berat_peti_kemarau: 0,
      pct_afkir_kemarau: 0,
      berat_peti_hujan: 0,
      pct_afkir_hujan: 0,
      berat_per_pcs_gram: null,
      deskripsi: '',
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(buah: BuahRow) {
    setEditingBuah(buah)
    form.reset({
      kode: buah.kode ?? '',
      nama: buah.nama,
      kategori: buah.kategori ?? '',
      satuan: buah.satuan ?? 'peti',
      berat_peti_kemarau: buah.berat_peti_kemarau,
      pct_afkir_kemarau: buah.pct_afkir_kemarau,
      berat_peti_hujan: buah.berat_peti_hujan,
      pct_afkir_hujan: buah.pct_afkir_hujan,
      berat_per_pcs_gram: buah.berat_per_pcs_gram ?? null,
      deskripsi: buah.deskripsi ?? '',
    })
    setIsDialogOpen(true)
  }

  async function onSubmit(values: BuahFormValues) {
    setIsSaving(true)
    const payload = {
      kode: values.kode || null,
      nama: values.nama,
      kategori: values.kategori || null,
      satuan: values.satuan,
      berat_peti_kemarau: values.berat_peti_kemarau,
      pct_afkir_kemarau: values.pct_afkir_kemarau,
      berat_peti_hujan: values.berat_peti_hujan,
      pct_afkir_hujan: values.pct_afkir_hujan,
      berat_per_pcs_gram: values.berat_per_pcs_gram ?? null,
      deskripsi: values.deskripsi || null,
    }

    if (editingBuah) {
      const { error } = await supabase.from('buah').update(payload).eq('id', editingBuah.id)
      if (error) {
        toast.error('Gagal update: ' + error.message)
      } else {
        toast.success(`Buah "${values.nama}" berhasil diperbarui`)
        setIsDialogOpen(false)
        fetchBuah()
      }
    } else {
      const { error } = await supabase.from('buah').insert(payload)
      if (error) {
        toast.error('Gagal menyimpan: ' + error.message)
      } else {
        toast.success(`Buah "${values.nama}" berhasil ditambahkan`)
        setIsDialogOpen(false)
        fetchBuah()
      }
    }
    setIsSaving(false)
  }

  async function toggleActive(buah: BuahRow) {
    const { error } = await supabase
      .from('buah')
      .update({ is_active: !buah.is_active })
      .eq('id', buah.id)

    if (error) {
      toast.error('Gagal mengubah status: ' + error.message)
    } else {
      toast.success(`Status "${buah.nama}" diubah`)
      fetchBuah()
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Total {buahList.filter(b => b.is_active).length} buah aktif
          </p>
        </div>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Tambah Buah
        </Button>
      </div>

      {/* Tabel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daftar Buah</CardTitle>
          <CardDescription>
            Parameter musiman menentukan kalkulasi HPP. Pastikan nilai sesuai dengan kondisi lapangan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Kode</TableHead>
                <TableHead>Nama Buah</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Satuan</TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center justify-center gap-1">
                    <Sun className="h-3 w-3 text-amber-500" /> Berat Tara Kemarau
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center justify-center gap-1">
                    <Sun className="h-3 w-3 text-amber-500" /> % Afkir (Kemarau)
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center justify-center gap-1">
                    <CloudRain className="h-3 w-3 text-blue-500" /> Berat Tara Hujan
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center justify-center gap-1">
                    <CloudRain className="h-3 w-3 text-blue-500" /> % Afkir (Hujan)
                  </span>
                </TableHead>
                <TableHead className="text-center">Berat/pcs</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Memuat data...</p>
                  </TableCell>
                </TableRow>
              ) : buahList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                    Belum ada data buah. Klik &quot;Tambah Buah&quot; untuk memulai.
                  </TableCell>
                </TableRow>
              ) : (
                buahList.map((buah) => (
                  <TableRow key={buah.id} className={!buah.is_active ? 'opacity-50' : ''}>
                    <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                      {buah.kode ?? '—'}
                    </TableCell>
                    <TableCell className="font-medium">{buah.nama}</TableCell>
                    <TableCell>
                      {buah.kategori ? (
                        <Badge variant="outline" className="text-xs">{buah.kategori}</Badge>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{getSatuanLabel(buah.satuan ?? 'peti')}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{buah.berat_peti_kemarau} kg</TableCell>
                    <TableCell className="text-center">{buah.pct_afkir_kemarau}%</TableCell>
                    <TableCell className="text-center">{buah.berat_peti_hujan} kg</TableCell>
                    <TableCell className="text-center">{buah.pct_afkir_hujan}%</TableCell>
                    <TableCell className="text-center">
                      {buah.berat_per_pcs_gram
                        ? <span className="text-xs">{buah.berat_per_pcs_gram} g</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={buah.is_active ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleActive(buah)}
                      >
                        {buah.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(buah)}
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
              {editingBuah ? `Edit: ${editingBuah.nama}` : 'Tambah Buah Baru'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Baris 1: Kode + Nama */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="kode">Kode Buah <span className="text-muted-foreground">(opsional)</span></Label>
                <Input id="kode" placeholder="APL-01" {...form.register('kode')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nama">Nama Buah <span className="text-red-500">*</span></Label>
                <Input id="nama" placeholder="Apel Fuji Import" {...form.register('nama')} />
                {form.formState.errors.nama && (
                  <p className="text-xs text-red-500">{form.formState.errors.nama.message}</p>
                )}
              </div>
            </div>

            {/* Baris 2: Kategori + Satuan */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="kategori">Kategori</Label>
                <Select
                  onValueChange={(v) => form.setValue('kategori', v ?? '')}
                  value={form.watch('kategori') || ''}
                >
                  <SelectTrigger id="kategori">
                    <SelectValue placeholder="Pilih kategori..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tropis">Tropis</SelectItem>
                    <SelectItem value="Import">Import</SelectItem>
                    <SelectItem value="Lokal">Lokal</SelectItem>
                    <SelectItem value="Citrus">Citrus</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="satuan">Satuan Kemasan <span className="text-red-500">*</span></Label>
                <Select
                  onValueChange={(v) => form.setValue('satuan', v ?? 'peti')}
                  value={form.watch('satuan') || 'peti'}
                >
                  <SelectTrigger id="satuan">
                    <SelectValue placeholder="Pilih satuan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SATUAN_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Parameter Kemarau */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-3">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                <Sun className="h-3.5 w-3.5" /> Parameter Musim Kemarau
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="berat_peti_kemarau">
                    Berat Tara {getSatuanLabel(form.watch('satuan') || 'peti')} Kosong (kg)
                  </Label>
                  <Input
                    id="berat_peti_kemarau"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="contoh: 0.5"
                    {...form.register('berat_peti_kemarau', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">Berat kemasan kosong saja</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pct_afkir_kemarau">% Penyusutan / Afkir</Label>
                  <Input
                    id="pct_afkir_kemarau"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    {...form.register('pct_afkir_kemarau', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            {/* Parameter Hujan */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-3">
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                <CloudRain className="h-3.5 w-3.5" /> Parameter Musim Hujan
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="berat_peti_hujan">
                    Berat Tara {getSatuanLabel(form.watch('satuan') || 'peti')} Kosong (kg)
                  </Label>
                  <Input
                    id="berat_peti_hujan"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="contoh: 0.5"
                    {...form.register('berat_peti_hujan', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">Berat kemasan kosong saja</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pct_afkir_hujan">% Penyusutan / Afkir</Label>
                  <Input
                    id="pct_afkir_hujan"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    {...form.register('pct_afkir_hujan', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            {/* Konversi PCS */}
            <div className="space-y-1.5">
              <Label htmlFor="berat_per_pcs_gram">
                Berat per Butir/Pcs (gram) <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Input
                id="berat_per_pcs_gram"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="contoh: 10 (anggur), 200 (apel)"
                {...form.register('berat_per_pcs_gram', {
                  setValueAs: (v) => v === '' || v === null ? null : parseFloat(v),
                })}
              />
              <p className="text-xs text-muted-foreground">
                Digunakan untuk konversi biji/pcs di kalkulator HPP
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deskripsi">Deskripsi <span className="text-muted-foreground">(opsional)</span></Label>
              <Input id="deskripsi" placeholder="Catatan tambahan..." {...form.register('deskripsi')} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {editingBuah ? 'Simpan Perubahan' : 'Tambah Buah'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
