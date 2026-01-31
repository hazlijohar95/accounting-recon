'use client'

import { cn } from '@/lib/utils'
import { useValueAnimation } from '@/hooks/useValueAnimation'

interface StatCardProps {
  /** Stat label */
  label: string
  /** Numeric value to display */
  value: number
  /** Optional prefix (e.g., "$") */
  prefix?: string
  /** Optional suffix (e.g., "%") */
  suffix?: string
  /** Trend indicator */
  trend?: 'up' | 'down' | 'neutral'
  /** Optional trend value (e.g., "+12.5%") */
  trendValue?: string
  /** Optional secondary text below value */
  secondaryText?: string
  /** Optional geometric icon */
  icon?: React.ReactNode
  /** Whether to animate the number on mount */
  animate?: boolean
  /** Animation duration in ms */
  animationDuration?: number
  /** Number of decimal places */
  decimals?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * Animated stat card with number counter, trend indicators, and hover effects.
 * Uses the brand's geometric design language.
 */
export function StatCard({
  label,
  value,
  prefix = '',
  suffix = '',
  trend,
  trendValue,
  secondaryText,
  icon,
  animate = true,
  animationDuration = 800,
  decimals = 0,
  className,
}: StatCardProps) {
  // Use the animation hook for value counter
  const { displayValue } = useValueAnimation({
    value,
    animate,
    duration: animationDuration,
    easing: 'easeOutCubic',
  })

  // Format the display value
  const formattedValue = decimals > 0
    ? displayValue.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : Math.round(displayValue).toLocaleString('en-US')

  return (
    <div
      className={cn(
        'relative border border-border p-4 transition-colors duration-200',
        'hover:border-foreground/20',
        className
      )}
    >
      {/* Label with optional icon */}
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
        {icon}
        {label}
      </div>

      {/* Value */}
      <div className="mt-2 flex items-baseline gap-1">
        {prefix && <span className="text-lg text-muted-foreground">{prefix}</span>}
        <span className="text-2xl font-medium tabular-nums">{formattedValue}</span>
        {suffix && <span className="text-lg text-muted-foreground">{suffix}</span>}
      </div>

      {/* Trend indicator */}
      {(trend || trendValue || secondaryText) && (
        <div className="mt-1.5 flex items-center gap-2">
          {trend && <TrendIndicator trend={trend} />}
          {trendValue && (
            <span
              className={cn(
                'text-xs font-medium',
                trend === 'up' && 'text-emerald-500',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-muted-foreground'
              )}
            >
              {trendValue}
            </span>
          )}
          {secondaryText && (
            <span className="text-xs text-muted-foreground">{secondaryText}</span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Geometric trend indicator using rectangle-based arrows
 */
function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
  if (trend === 'neutral') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted-foreground">
        <rect x="1" y="5" width="10" height="2" fill="currentColor" />
      </svg>
    )
  }

  const isUp = trend === 'up'
  const colorClass = isUp ? 'text-emerald-500' : 'text-destructive'

  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className={cn(colorClass, !isUp && 'rotate-180')}
    >
      {/* Arrow pointing up */}
      <rect x="5" y="3" width="2" height="7" fill="currentColor" />
      <rect x="3" y="4" width="3" height="2" fill="currentColor" transform="rotate(-45 4.5 5)" />
      <rect x="6" y="4" width="3" height="2" fill="currentColor" transform="rotate(45 7.5 5)" />
    </svg>
  )
}

/**
 * Mini stat card variant for compact displays
 */
export function StatCardMini({
  label,
  value,
  prefix = '',
  className,
}: Pick<StatCardProps, 'label' | 'value' | 'prefix' | 'className'>) {
  return (
    <div className={cn('flex items-center justify-between p-3 border border-border', className)}>
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium tabular-nums">
        {prefix}{value.toLocaleString('en-US')}
      </span>
    </div>
  )
}

// Geometric icons for stat cards (matching brand design language)

export function IconCashIn({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className}>
      <rect x="1" y="6" width="10" height="2" fill="currentColor" />
      <rect x="5" y="6" width="2" height="5" fill="currentColor" />
      <rect x="3" y="5" width="2" height="4" fill="currentColor" transform="rotate(45 4 7)" />
      <rect x="7" y="5" width="2" height="4" fill="currentColor" transform="rotate(-45 8 7)" />
    </svg>
  )
}

export function IconCashOut({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className}>
      <rect x="1" y="4" width="10" height="2" fill="currentColor" />
      <rect x="5" y="1" width="2" height="5" fill="currentColor" />
      <rect x="3" y="4" width="2" height="4" fill="currentColor" transform="rotate(-45 4 5)" />
      <rect x="7" y="4" width="2" height="4" fill="currentColor" transform="rotate(45 8 5)" />
    </svg>
  )
}

export function IconMatched({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className}>
      <path
        d="M2 6L5 9L10 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        fill="none"
      />
    </svg>
  )
}

export function IconSuspense({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className}>
      <rect x="5" y="2" width="2" height="5" fill="currentColor" />
      <rect x="5" y="9" width="2" height="2" fill="currentColor" />
    </svg>
  )
}
