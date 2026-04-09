'use client'

import { useSeason } from '@/context/season-context'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Sun, CloudRain } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SeasonToggle() {
  const { musim, toggleMusim, isKemarau } = useSeason()

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-2">
      {/* Icon & Label Kemarau */}
      <div className={cn('flex items-center gap-1.5', isKemarau ? 'text-amber-500' : 'text-muted-foreground')}>
        <Sun className="h-4 w-4" />
        <Label
          htmlFor="season-toggle"
          className={cn('cursor-pointer text-xs font-medium', isKemarau ? 'text-amber-600' : 'text-muted-foreground')}
        >
          Kemarau
        </Label>
      </div>

      {/* Toggle Switch */}
      <Switch
        id="season-toggle"
        checked={musim === 'hujan'}
        onCheckedChange={toggleMusim}
      />

      {/* Icon & Label Hujan */}
      <div className={cn('flex items-center gap-1.5', !isKemarau ? 'text-blue-500' : 'text-muted-foreground')}>
        <CloudRain className="h-4 w-4" />
        <Label
          htmlFor="season-toggle"
          className={cn('cursor-pointer text-xs font-medium', !isKemarau ? 'text-blue-600' : 'text-muted-foreground')}
        >
          Hujan
        </Label>
      </div>

      {/* Status badge */}
      <Badge
        variant="outline"
        className={cn(
          'ml-1 text-xs font-semibold',
          isKemarau
            ? 'border-amber-300 bg-amber-50 text-amber-700'
            : 'border-blue-300 bg-blue-50 text-blue-700'
        )}
      >
        {isKemarau ? 'Musim Kemarau' : 'Musim Hujan'}
      </Badge>
    </div>
  )
}
