'use client'

import { cn } from '@/lib/utils'

interface PageTransitionProps {
  direction?: 'left' | 'right' | 'up' | 'down'
  isActive?: boolean
  className?: string
  onComplete?: () => void
}

export function PageTransition({
  direction = 'left',
  isActive = false,
  className,
  onComplete,
}: PageTransitionProps) {
  const bars = 6
  const isHorizontal = direction === 'left' || direction === 'right'
  const isReverse = direction === 'right' || direction === 'down'

  if (!isActive) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 pointer-events-none',
        isHorizontal ? 'flex flex-row' : 'flex flex-col',
        className
      )}
      onAnimationEnd={onComplete}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const delay = isReverse ? (bars - 1 - i) * 50 : i * 50
        return (
          <div
            key={i}
            className={cn(
              'bg-foreground',
              isHorizontal ? 'h-full flex-1' : 'w-full flex-1',
              isHorizontal ? 'animate-wipe-vertical' : 'animate-wipe-horizontal',
              isHorizontal
                ? direction === 'left'
                  ? 'origin-left'
                  : 'origin-right'
                : direction === 'up'
                  ? 'origin-top'
                  : 'origin-bottom'
            )}
            style={{ animationDelay: `${delay}ms` }}
          />
        )
      })}
    </div>
  )
}

interface PageTransitionOverlayProps {
  active?: boolean
  direction?: 'left' | 'right'
  className?: string
}

export function PageTransitionOverlay({
  active = false,
  direction = 'right',
  className,
}: PageTransitionOverlayProps) {
  if (!active) return null

  const bars = 6
  const isReverse = direction === 'right'

  return (
    <div
      className={cn(
        'absolute inset-0 z-40 flex flex-row pointer-events-none',
        className
      )}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const delay = isReverse ? (bars - 1 - i) * 40 : i * 40
        return (
          <div
            key={i}
            className="h-full flex-1 bg-foreground animate-wipe-vertical origin-top"
            style={{
              animationDelay: `${delay}ms`,
              animationDuration: '300ms',
            }}
          />
        )
      })}
    </div>
  )
}
