import { cn } from '@/lib/utils'
import { LogoWordmark } from './logo-wordmark'

interface LogoMarkProps {
  size?: number
  className?: string
}

/**
 * Geometric "R" logo mark for Reconcile brand.
 * Built from rectangles to reflect the sharp, minimal aesthetic.
 */
export function LogoMark({ size = 48, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      <rect x="8" y="8" width="8" height="32" fill="currentColor" />
      <rect x="16" y="8" width="16" height="8" fill="currentColor" />
      <rect x="32" y="8" width="8" height="12" fill="currentColor" />
      <rect x="16" y="20" width="16" height="8" fill="currentColor" />
      <rect x="24" y="28" width="8" height="4" fill="currentColor" />
      <rect x="32" y="32" width="8" height="8" fill="currentColor" />
    </svg>
  )
}

interface LogoFullProps {
  className?: string
}

/**
 * Full horizontal logo with mark + geometric wordmark.
 * Both elements use 48px canvas with content from y=8 to y=40,
 * ensuring perfect alignment at any size.
 */
export function LogoFull({ className }: LogoFullProps) {
  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      role="img"
      aria-label="Reconcile"
    >
      <LogoMark size={32} />
      <LogoWordmark height={32} className="text-current" />
    </div>
  )
}

interface LogoStackedProps {
  className?: string
}

/**
 * Stacked logo with mark above geometric wordmark.
 */
export function LogoStacked({ className }: LogoStackedProps) {
  return (
    <div
      className={cn('flex flex-col items-center gap-3', className)}
      role="img"
      aria-label="Reconcile"
    >
      <LogoMark size={48} />
      <LogoWordmark height={16} className="text-current" />
    </div>
  )
}
