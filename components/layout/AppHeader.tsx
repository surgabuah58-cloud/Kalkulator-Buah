'use client'

import { usePathname } from 'next/navigation'
import { SeasonToggle } from './SeasonToggle'
import { Menu } from 'lucide-react'

const pageTitles: Record<string, { title: string; description: string }> = {
  '/': { title: 'Dashboard', description: 'Ringkasan aktivitas supply chain' },
  '/master-buah': { title: 'Master Buah', description: 'Kelola data buah dan parameter musiman' },
  '/master-pemasok': { title: 'Master Pemasok', description: 'Kelola data pemasok buah' },
  '/input-pembelian': { title: 'Input Pembelian', description: 'Catat pembelian harian dari pemasok' },
  '/kalkulator': { title: 'Kalkulator HPP', description: 'Hitung HPP cepat tanpa menyimpan ke database' },
  '/pricing': { title: 'Pricing Matrix', description: 'Penentuan harga jual Dapur & Sub-Suplier' },
}

interface AppHeaderProps {
  onMenuClick: () => void
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const pathname = usePathname()
  const page = pageTitles[pathname] ?? { title: 'Surga Buah', description: '' }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          className="flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden"
          onClick={onMenuClick}
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Page title */}
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold leading-tight md:text-base">{page.title}</h1>
          {page.description && (
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{page.description}</p>
          )}
        </div>
      </div>

      <SeasonToggle />
    </header>
  )
}
