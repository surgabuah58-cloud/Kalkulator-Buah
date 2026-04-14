'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Apple, Users, ShoppingCart, TrendingUp, AlertTriangle, ArrowRight,
  Store, TrendingDown, Minus, Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { formatRupiahFull } from '@/lib/calculations/hpp'

function formatRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1)} Jt`
  return formatRupiahFull(n)
}

interface DashboardStats {
  totalBuah: number
  totalPemasok: number
  totalPelanggan: number
  beliHariIni: number
  jualHariIni: number
  beliMingguIni: number
  jualMingguIni: number
  beliMingguLalu: number
  jualMingguLalu: number
  hargaPerluReview: number
  topPemasok: { nama: string; total: number }[]
  topPelanggan: { nama: string; total: number }[]
  transaksiTerakhir: { tipe: 'beli' | 'jual'; nama: string; nilai: number; tanggal: string }[]
}

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const today       = new Date().toISOString().split('T')[0]
      const weekAgo     = new Date(Date.now() - 7 * 86400_000).toISOString().split('T')[0]
      const twoWeeksAgo = new Date(Date.now() - 14 * 86400_000).toISOString().split('T')[0]

      const [
        buahRes, pemasokRes, pelangganRes,
        beliHariIniRes, jualHariIniRes,
        beliMingguRes, jualMingguRes,
        beliMingguLaluRes, jualMingguLaluRes,
        reviewRes,
        topPemasokRes, topPelangganRes,
        lastBeliRes, lastJualRes,
      ] = await Promise.all([
        supabase.from('buah').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('pemasok').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('pelanggan').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('pembelian').select('harga_beli_per_peti, jumlah_peti').eq('tanggal', today),
        supabase.from('penjualan').select('total_nilai').eq('tanggal', today),
        supabase.from('pembelian').select('harga_beli_per_peti, jumlah_peti').gte('tanggal', weekAgo),
        supabase.from('penjualan').select('total_nilai').gte('tanggal', weekAgo),
        supabase.from('pembelian').select('harga_beli_per_peti, jumlah_peti').gte('tanggal', twoWeeksAgo).lt('tanggal', weekAgo),
        supabase.from('penjualan').select('total_nilai').gte('tanggal', twoWeeksAgo).lt('tanggal', weekAgo),
        supabase.from('v_pricing_matrix').select('buah_id').neq('status_harga', 'normal'),
        supabase.from('pembelian').select('pemasok_id, harga_beli_per_peti, jumlah_peti, pemasok:pemasok_id(nama)').gte('tanggal', weekAgo),
        supabase.from('penjualan').select('pelanggan_id, total_nilai, pelanggan:pelanggan_id(nama)').gte('tanggal', weekAgo),
        supabase.from('pembelian').select('harga_beli_per_peti, jumlah_peti, tanggal, buah:buah_id(nama)').order('created_at', { ascending: false }).limit(5),
        supabase.from('penjualan').select('total_nilai, tanggal, buah:buah_id(nama)').order('created_at', { ascending: false }).limit(5),
      ])

      const sumBeli = (rows: { harga_beli_per_peti: number; jumlah_peti: number }[]) =>
        (rows ?? []).reduce((s, r) => s + r.harga_beli_per_peti * r.jumlah_peti, 0)
      const sumJual = (rows: { total_nilai: number }[]) =>
        (rows ?? []).reduce((s, r) => s + (r.total_nilai ?? 0), 0)

      const pemasokMap: Record<string, { nama: string; total: number }> = {}
      for (const r of topPemasokRes.data ?? []) {
        const nama = (r.pemasok as any)?.nama ?? r.pemasok_id
        if (!pemasokMap[r.pemasok_id]) pemasokMap[r.pemasok_id] = { nama, total: 0 }
        pemasokMap[r.pemasok_id].total += r.harga_beli_per_peti * r.jumlah_peti
      }
      const topPemasok = Object.values(pemasokMap).sort((a, b) => b.total - a.total).slice(0, 5)

      const pelangganMap: Record<string, { nama: string; total: number }> = {}
      for (const r of topPelangganRes.data ?? []) {
        const nama = (r.pelanggan as any)?.nama ?? r.pelanggan_id
        if (!pelangganMap[r.pelanggan_id]) pelangganMap[r.pelanggan_id] = { nama, total: 0 }
        pelangganMap[r.pelanggan_id].total += r.total_nilai ?? 0
      }
      const topPelanggan = Object.values(pelangganMap).sort((a, b) => b.total - a.total).slice(0, 5)

      const recentBeli = (lastBeliRes.data ?? []).map(r => ({
        tipe: 'beli' as const,
        nama: (r.buah as any)?.nama ?? '—',
        nilai: r.harga_beli_per_peti * r.jumlah_peti,
        tanggal: r.tanggal,
      }))
      const recentJual = (lastJualRes.data ?? []).map(r => ({
        tipe: 'jual' as const,
        nama: (r.buah as any)?.nama ?? '—',
        nilai: r.total_nilai ?? 0,
        tanggal: r.tanggal,
      }))
      const transaksiTerakhir = [...recentBeli, ...recentJual]
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
        .slice(0, 8)

      setStats({
        totalBuah:      buahRes.count ?? 0,
        totalPemasok:   pemasokRes.count ?? 0,
        totalPelanggan: pelangganRes.count ?? 0,
        beliHariIni:    sumBeli(beliHariIniRes.data ?? []),
        jualHariIni:    sumJual(jualHariIniRes.data ?? []),
        beliMingguIni:  sumBeli(beliMingguRes.data ?? []),
        jualMingguIni:  sumJual(jualMingguRes.data ?? []),
        beliMingguLalu: sumBeli(beliMingguLaluRes.data ?? []),
        jualMingguLalu: sumJual(jualMingguLaluRes.data ?? []),
        hargaPerluReview: reviewRes.data?.length ?? 0,
        topPemasok,
        topPelanggan,
        transaksiTerakhir,
      })
      setIsLoading(false)
    }
    fetchStats()
  }, [])

  function trendIcon(now: number, prev: number) {
    if (prev === 0) return <Minus className="h-3 w-3 text-muted-foreground" />
    const diff = ((now - prev) / prev) * 100
    if (diff > 0) return <TrendingUp className="h-3 w-3 text-green-600" />
    return <TrendingDown className="h-3 w-3 text-red-500" />
  }
  function trendText(now: number, prev: number) {
    if (prev === 0) return '—'
    const diff = ((now - prev) / prev) * 100
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}% vs minggu lalu`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const s = stats!

  return (
    <div className="space-y-6">
      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Buah Aktif</CardTitle>
            <Apple className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{s.totalBuah}</p>
            <Link href="/master-buah" className="text-xs text-primary hover:underline">Kelola →</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Pemasok</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{s.totalPemasok}</p>
            <Link href="/master-pemasok" className="text-xs text-primary hover:underline">Kelola →</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Pelanggan</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{s.totalPelanggan}</p>
            <Link href="/master-pelanggan" className="text-xs text-primary hover:underline">Kelola →</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Harga Perlu Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={cn('text-2xl font-bold', s.hargaPerluReview > 0 && 'text-amber-600')}>{s.hargaPerluReview}</p>
            <Link href="/pricing" className="text-xs text-primary hover:underline">Buka Pricing →</Link>
          </CardContent>
        </Card>
      </div>

      {/* Trend minggu ini */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" /> Pembelian Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            <p className="text-xl font-bold">{s.beliHariIni > 0 ? formatRp(s.beliHariIni) : '—'}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {trendIcon(s.beliMingguIni, s.beliMingguLalu)}
              <span>{trendText(s.beliMingguIni, s.beliMingguLalu)}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Penjualan Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            <p className="text-xl font-bold">{s.jualHariIni > 0 ? formatRp(s.jualHariIni) : '—'}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {trendIcon(s.jualMingguIni, s.jualMingguLalu)}
              <span>{trendText(s.jualMingguIni, s.jualMingguLalu)}</span>
            </p>
          </CardContent>
        </Card>
        <Card className={cn(s.jualMingguIni > 0 && s.beliMingguIni > 0 && 'border-green-200')}>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Gross Margin Minggu Ini</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            {s.jualMingguIni > 0 && s.beliMingguIni > 0 ? (
              <>
                <p className={cn('text-xl font-bold', s.jualMingguIni - s.beliMingguIni >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatRp(Math.abs(s.jualMingguIni - s.beliMingguIni))}
                </p>
                <p className="text-xs text-muted-foreground">
                  Jual {formatRp(s.jualMingguIni)} — Beli {formatRp(s.beliMingguIni)}
                </p>
              </>
            ) : (
              <p className="text-xl font-bold text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Pemasok & Pelanggan */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" /> Top Pemasok (7 hari)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {s.topPemasok.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Belum ada pembelian</p>
            ) : (
              <div className="space-y-2">
                {s.topPemasok.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                      <span className="truncate">{p.nama}</span>
                    </div>
                    <span className="font-semibold text-xs flex-shrink-0 ml-2">{formatRp(p.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" /> Top Pelanggan (7 hari)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {s.topPelanggan.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Belum ada penjualan</p>
            ) : (
              <div className="space-y-2">
                {s.topPelanggan.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                      <span className="truncate">{p.nama}</span>
                    </div>
                    <span className="font-semibold text-xs flex-shrink-0 ml-2">{formatRp(p.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaksi Terakhir + Aksi Cepat */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Transaksi Terakhir</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {s.transaksiTerakhir.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Belum ada transaksi</p>
            ) : (
              <div className="space-y-2">
                {s.transaksiTerakhir.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn(
                        'text-xs px-1.5 py-0',
                        t.tipe === 'beli' ? 'border-red-200 text-red-700 bg-red-50' : 'border-green-200 text-green-700 bg-green-50'
                      )}>
                        {t.tipe === 'beli' ? 'BELI' : 'JUAL'}
                      </Badge>
                      <span>{t.nama}</span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="font-semibold">{formatRp(t.nilai)}</div>
                      <div className="text-muted-foreground">{t.tanggal}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Aksi Cepat</h2>
          {[
            { href: '/input-pembelian', icon: ShoppingCart, color: 'bg-primary/10',  iconColor: 'text-primary',     label: 'Input Pembelian Baru', sub: 'Catat pembelian dari pemasok' },
            { href: '/input-penjualan', icon: TrendingUp,   color: 'bg-green-100',   iconColor: 'text-green-600',   label: 'Input Penjualan Baru', sub: 'Catat penjualan ke pelanggan' },
            { href: '/pricing',         icon: AlertTriangle, color: 'bg-amber-100',  iconColor: 'text-amber-600',   label: 'Update Pricing Matrix', sub: 'Review & atur harga jual' },
          ].map(item => (
            <Link key={item.href} href={item.href}>
              <Card className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all">
                <CardContent className="flex items-center justify-between pt-4 pb-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', item.color)}>
                      <item.icon className={cn('h-4 w-4', item.iconColor)} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
