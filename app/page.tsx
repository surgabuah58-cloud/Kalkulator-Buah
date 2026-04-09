import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Apple, Users, ShoppingCart, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Buah Aktif</CardTitle>
            <Apple className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground mt-1">
              <Link href="/master-buah" className="text-primary hover:underline">Kelola Master Buah →</Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pemasok Aktif</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground mt-1">
              <Link href="/master-pemasok" className="text-primary hover:underline">Kelola Pemasok →</Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pembelian Hari Ini</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground mt-1">
              <Link href="/input-pembelian" className="text-primary hover:underline">Input Pembelian →</Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Harga Perlu Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground mt-1">
              <Link href="/pricing" className="text-primary hover:underline">Buka Pricing Matrix →</Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Aksi Cepat</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/input-pembelian">
            <Card className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all">
              <CardContent className="flex items-center justify-between pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Input Pembelian Baru</p>
                    <p className="text-xs text-muted-foreground">Catat pembelian harian</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/pricing">
            <Card className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all">
              <CardContent className="flex items-center justify-between pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Update Pricing Matrix</p>
                    <p className="text-xs text-muted-foreground">Review & atur harga jual</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/master-buah">
            <Card className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all">
              <CardContent className="flex items-center justify-between pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100">
                    <Apple className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Master Buah</p>
                    <p className="text-xs text-muted-foreground">Tambah/edit data buah</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Onboarding info */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-sm font-semibold mb-1">Mulai Setup Platform</h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-4">
            Tambahkan data buah dan pemasok terlebih dahulu, lalu mulai input pembelian harian Anda.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/master-buah">Tambah Buah</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/master-pemasok">Tambah Pemasok</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

