import { cn } from '@/lib/utils'

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
 * Full horizontal logo with mark + wordmark.
 */
export function LogoFull({ className }: LogoFullProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <LogoMark size={32} />
      <span className="font-mono text-sm tracking-wide">reconcile</span>
    </div>
  )
}

interface LogoStackedProps {
  className?: string
}

/**
 * Stacked logo with mark above wordmark.
 */
export function LogoStacked({ className }: LogoStackedProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <LogoMark size={48} />
      <span className="font-mono text-xs tracking-wide">reconcile</span>
    </div>
  )
}
