'use client'

import { useIsDemo, useToggleMode } from '@/lib/store'
import { cn } from '@/lib/utils'
import { IconSparkle } from '@/components/brand/icons'

interface AppTopbarProps {
  className?: string
}

export function AppTopbar({ className }: AppTopbarProps) {
  const isDemo = useIsDemo()
  const toggleMode = useToggleMode()

  if (!isDemo) return null

  return (
    <div className={cn('border-b border-border bg-background/80 backdrop-blur', className)}>
      <div className="px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-foreground/20 bg-foreground/5 text-foreground text-[10px] font-mono tracking-widest uppercase">
            <IconSparkle size={12} className="text-chart-5" />
            Demo Mode
          </span>
          <span className="hidden sm:inline">Demo data is loaded — actions won’t save</span>
        </div>
        <button
          onClick={() => toggleMode()}
          className="text-xs px-3 py-1.5 border border-foreground/20 hover:border-foreground hover:bg-foreground hover:text-background transition-colors"
        >
          Switch to Real
        </button>
      </div>
    </div>
  )
}
