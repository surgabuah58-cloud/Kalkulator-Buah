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
} from 'lucide-react'

const navItems = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/master-buah',
    label: 'Master Buah',
    icon: Apple,
  },
  {
    href: '/master-pemasok',
    label: 'Master Pemasok',
    icon: Users,
  },
  {
    href: '/input-pembelian',
    label: 'Input Pembelian',
    icon: ShoppingCart,
  },
  {
    href: '/kalkulator',
    label: 'Kalkulator HPP',
    icon: Calculator,
  },
  {
    href: '/pricing',
    label: 'Pricing Matrix',
    icon: BarChart3,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-full w-60 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          SB
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Surga Buah</p>
          <p className="text-xs text-muted-foreground">Supply Chain Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
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
