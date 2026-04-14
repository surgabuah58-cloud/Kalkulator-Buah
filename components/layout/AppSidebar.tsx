'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Apple,
  Users,
  ShoppingCart,
  BarChart3,
  ChevronRight,
  Calculator,
  X,
  Store,
  TrendingUp,
} from 'lucide-react'

const navItems = [
  { href: '/',                  label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/master-buah',       label: 'Master Buah',       icon: Apple },
  { href: '/master-pemasok',    label: 'Master Pemasok',    icon: Users },
  { href: '/master-pelanggan',  label: 'Master Pelanggan',  icon: Store },
  { href: '/input-pembelian',   label: 'Input Pembelian',   icon: ShoppingCart },
  { href: '/input-penjualan',   label: 'Input Penjualan',   icon: TrendingUp },
  { href: '/kalkulator',        label: 'Kalkulator HPP',    icon: Calculator },
  { href: '/pricing',           label: 'Pricing Matrix',    icon: BarChart3 },
]

interface AppSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className={cn(
      // Base: fixed, full height, z-40 so it sits above backdrop (z-30)
      'fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-border bg-card',
      // Mobile: slide in/out with transition
      'transition-transform duration-300 ease-in-out',
      // On mobile: hidden by default, visible when open
      isOpen ? 'translate-x-0' : '-translate-x-full',
      // On md+: always visible regardless of isOpen
      'md:translate-x-0',
    )}>
      {/* Logo + mobile close button */}
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            SB
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Surga Buah</p>
            <p className="text-xs text-muted-foreground">Supply Chain Dashboard</p>
          </div>
        </div>
        {/* Close button — only shown on mobile */}
        <button
          type="button"
          className="md:hidden rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          onClick={onClose}
          aria-label="Tutup menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}  // close drawer on mobile after navigating
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-3 w-3" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground">v1.0.0 — Internal Platform</p>
      </div>
    </aside>
  )
}
