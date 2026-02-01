'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { IconSun, IconMoon, IconDesktop } from '@/components/brand/icons'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleSetTheme = (newTheme: string) => {
    setTheme(newTheme)
  }

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 p-1 bg-secondary rounded-sm">
        <div className="w-7 h-7" />
        <div className="w-7 h-7" />
        <div className="w-7 h-7" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-secondary rounded-sm">
      <button
        onClick={() => handleSetTheme('light')}
        className={cn(
          'p-1.5 rounded-sm transition-colors',
          theme === 'light'
            ? 'bg-background text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="Light mode"
      >
        <IconSun size={16} />
      </button>
      <button
        onClick={() => handleSetTheme('dark')}
        className={cn(
          'p-1.5 rounded-sm transition-colors',
          theme === 'dark'
            ? 'bg-background text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="Dark mode"
      >
        <IconMoon size={16} />
      </button>
      <button
        onClick={() => handleSetTheme('system')}
        className={cn(
          'p-1.5 rounded-sm transition-colors',
          theme === 'system'
            ? 'bg-background text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="System preference"
      >
        <IconDesktop size={16} />
      </button>
    </div>
  )
}
