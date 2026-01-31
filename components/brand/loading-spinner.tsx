'use client'

/**
 * Brand Loading Components.
 *
 * Provides loading indicators using the Reconciled brand's geometric
 * design language. Uses a 3x3 grid of squares with staggered pulse
 * animation rather than traditional circular spinners.
 *
 * @module components/brand/loading-spinner
 */

import { cn } from '@/lib/utils'

/**
 * Props for the LoadingSpinner component.
 */
interface LoadingSpinnerProps {
  /** Spinner size: 'sm' (24px), 'md' (36px), or 'lg' (48px) */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

const sizeMap = {
  sm: { grid: 24, cell: 6, gap: 2 },
  md: { grid: 36, cell: 10, gap: 2 },
  lg: { grid: 48, cell: 14, gap: 2 },
}

/**
 * Geometric loading spinner using 3x3 grid of pulsing squares.
 *
 * Displays a grid of 9 squares that pulse in a diagonal wave pattern,
 * creating a smooth loading animation that matches the brand aesthetic.
 *
 * @example
 * ```tsx
 * <LoadingSpinner size="lg" />
 * ```
 */
export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const { grid, cell, gap } = sizeMap[size]

  // 3x3 grid of squares with staggered pulse animation
  const squares = [
    { x: 0, y: 0, delay: 0 },
    { x: 1, y: 0, delay: 100 },
    { x: 2, y: 0, delay: 200 },
    { x: 0, y: 1, delay: 100 },
    { x: 1, y: 1, delay: 200 },
    { x: 2, y: 1, delay: 300 },
    { x: 0, y: 2, delay: 200 },
    { x: 1, y: 2, delay: 300 },
    { x: 2, y: 2, delay: 400 },
  ]

  return (
    <div
      className={cn('inline-flex', className)}
      style={{ width: grid, height: grid }}
      role="status"
      aria-label="Loading"
    >
      <svg
        width={grid}
        height={grid}
        viewBox={`0 0 ${grid} ${grid}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {squares.map(({ x, y, delay }, i) => (
          <rect
            key={i}
            x={x * (cell + gap)}
            y={y * (cell + gap)}
            width={cell}
            height={cell}
            fill="currentColor"
            className="animate-pulse-grid"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </svg>
    </div>
  )
}

/**
 * Inline loading dots indicator.
 *
 * Three square dots with staggered pulse animation, useful for
 * inline loading states like "Processing..." messages.
 *
 * @example
 * ```tsx
 * <span>Loading<LoadingDots /></span>
 * ```
 */
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-current animate-pulse-grid"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  )
}
