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
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 md:gap-3 md:px-4 md:py-2">
      {/* Icon & Label Kemarau */}
      <div className={cn('flex items-center gap-1', isKemarau ? 'text-amber-500' : 'text-muted-foreground')}>
        <Sun className="h-4 w-4 flex-shrink-0" />
        <Label
          htmlFor="season-toggle"
          className={cn('hidden cursor-pointer text-xs font-medium sm:block', isKemarau ? 'text-amber-600' : 'text-muted-foreground')}
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
      <div className={cn('flex items-center gap-1', !isKemarau ? 'text-blue-500' : 'text-muted-foreground')}>
        <CloudRain className="h-4 w-4 flex-shrink-0" />
        <Label
          htmlFor="season-toggle"
          className={cn('hidden cursor-pointer text-xs font-medium sm:block', !isKemarau ? 'text-blue-600' : 'text-muted-foreground')}
        >
          Hujan
        </Label>
      </div>

      {/* Status badge — hide on xs */}
      <Badge
        variant="outline"
        className={cn(
          'hidden text-xs font-semibold md:inline-flex',
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
