'use client'

import { usePathname } from 'next/navigation'
import { SeasonToggle } from './SeasonToggle'

const pageTitles: Record<string, { title: string; description: string }> = {
  '/': { title: 'Dashboard', description: 'Ringkasan aktivitas supply chain' },
  '/master-buah': { title: 'Master Buah', description: 'Kelola data buah dan parameter musiman' },
  '/master-pemasok': { title: 'Master Pemasok', description: 'Kelola data pemasok buah' },
  '/input-pembelian': { title: 'Input Pembelian', description: 'Catat pembelian harian dari pemasok' },
  '/kalkulator': { title: 'Kalkulator HPP', description: 'Hitung HPP cepat tanpa menyimpan ke database' },
  '/pricing': { title: 'Pricing Matrix', description: 'Penentuan harga jual Dapur & Sub-Suplier' },
}

export function AppHeader() {
  const pathname = usePathname()
  const page = pageTitles[pathname] ?? { title: 'Surga Buah', description: '' }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      {/* Page Title */}
      <div>
        <h1 className="text-base font-semibold leading-tight">{page.title}</h1>
        {page.description && (
          <p className="text-xs text-muted-foreground">{page.description}</p>
        )}
      </div>

      {/* Season Toggle — global control */}
      <SeasonToggle />
    </header>
  )
}
