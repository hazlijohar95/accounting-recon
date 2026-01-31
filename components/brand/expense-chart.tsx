'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export interface ExpenseCategory {
  category: string
  amount: number
  percentage: number
}

interface ExpenseChartProps {
  data: ExpenseCategory[]
  limit?: number // Show top N categories
  animate?: boolean
  animationDuration?: number
  className?: string
  showPercentages?: boolean
}

// Color palette for expense categories (brand-appropriate)
const CATEGORY_COLORS = [
  'hsl(var(--foreground))',
  'hsl(var(--foreground) / 0.8)',
  'hsl(var(--foreground) / 0.6)',
  'hsl(var(--foreground) / 0.4)',
  'hsl(var(--foreground) / 0.25)',
  'hsl(var(--foreground) / 0.15)',
]

export function ExpenseChart({
  data,
  limit = 5,
  animate = true,
  animationDuration = 800, // Standardized with StatCard
  className,
  showPercentages = true,
}: ExpenseChartProps) {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = animate && !prefersReducedMotion
  const [animationProgress, setAnimationProgress] = useState(shouldAnimate ? 0 : 1)
  const chartRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)

  // Animate bars on mount
  useEffect(() => {
    if (!shouldAnimate) {
      setAnimationProgress(1)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const startTime = performance.now()

          const animateBars = (currentTime: number) => {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / animationDuration, 1)
            // Ease out cubic (matching StatCard)
            const eased = 1 - Math.pow(1 - progress, 3)
            setAnimationProgress(eased)

            if (progress < 1) {
              animationRef.current = requestAnimationFrame(animateBars)
            }
          }

          animationRef.current = requestAnimationFrame(animateBars)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (chartRef.current) {
      observer.observe(chartRef.current)
    }

    return () => {
      observer.disconnect()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [shouldAnimate, animationDuration])

  // Limit and sort data
  const displayData = data.slice(0, limit)
  const maxAmount = Math.max(...displayData.map((d) => d.amount), 1)

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 border border-border', className)}>
        <span className="text-sm text-muted-foreground">No expense data available</span>
      </div>
    )
  }

  return (
    <div ref={chartRef} className={cn('space-y-3', className)}>
      {displayData.map((item, index) => {
        const barWidth = (item.amount / maxAmount) * 100 * animationProgress
        const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length]
        // Staggered animation delay for visual polish
        const staggerDelay = shouldAnimate ? index * 50 : 0

        return (
          <div
            key={item.category}
            className="group"
            style={{
              opacity: shouldAnimate ? Math.min(1, animationProgress + index * 0.1) : 1,
              transform: shouldAnimate
                ? `translateX(${(1 - Math.min(1, animationProgress + index * 0.05)) * -8}px)`
                : 'none',
              transition: `opacity 200ms ${staggerDelay}ms, transform 200ms ${staggerDelay}ms`,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm truncate pr-2">{item.category}</span>
              <div className="flex items-center gap-2 shrink-0">
                {showPercentages && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {item.percentage}%
                  </span>
                )}
                <span className="text-sm font-medium tabular-nums">
                  ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </span>
              </div>
            </div>
            {/* Standardized bar height: h-2 */}
            <div className="h-2 bg-muted/30 relative overflow-hidden">
              <div
                className="h-full transition-[width] duration-100"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Compact variant for sidebar or smaller spaces
export function ExpenseChartCompact({
  data,
  limit = 3,
  className,
}: Pick<ExpenseChartProps, 'data' | 'limit' | 'className'>) {
  const displayData = data.slice(0, limit)

  if (data.length === 0) {
    return (
      <div className={cn('text-xs text-muted-foreground', className)}>No data</div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {displayData.map((item, index) => (
        <div key={item.category} className="flex items-center gap-2 text-xs">
          <div
            className="w-2 h-2 shrink-0"
            style={{
              backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
            }}
          />
          <span className="truncate flex-1 text-muted-foreground">{item.category}</span>
          <span className="tabular-nums font-medium">
            ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </span>
        </div>
      ))}
      {data.length > limit && (
        <div className="text-xs text-muted-foreground pt-1 border-t border-border">
          +{data.length - limit} more categories
        </div>
      )}
    </div>
  )
}

// Top expenses list with amounts and ranks
export interface TopExpense {
  id: string
  description: string
  amount: number
  date: string
  category: string
}

interface TopExpensesListProps {
  data: TopExpense[]
  limit?: number
  animate?: boolean
  animationDuration?: number
  className?: string
}

export function TopExpensesList({
  data,
  limit = 5,
  animate = true,
  animationDuration = 800, // Standardized with StatCard
  className,
}: TopExpensesListProps) {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = animate && !prefersReducedMotion
  const [animationProgress, setAnimationProgress] = useState(shouldAnimate ? 0 : 1)
  const listRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (!shouldAnimate) {
      setAnimationProgress(1)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const startTime = performance.now()

          const animateList = (currentTime: number) => {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / animationDuration, 1)
            // Ease out cubic (matching StatCard)
            const eased = 1 - Math.pow(1 - progress, 3)
            setAnimationProgress(eased)

            if (progress < 1) {
              animationRef.current = requestAnimationFrame(animateList)
            }
          }

          animationRef.current = requestAnimationFrame(animateList)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (listRef.current) {
      observer.observe(listRef.current)
    }

    return () => {
      observer.disconnect()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [shouldAnimate, animationDuration])

  const displayData = data.slice(0, limit)
  const maxAmount = Math.max(...displayData.map((d) => d.amount), 1)

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 border border-border', className)}>
        <span className="text-sm text-muted-foreground">No expenses recorded</span>
      </div>
    )
  }

  return (
    <div ref={listRef} className={cn('divide-y divide-border', className)}>
      {displayData.map((item, index) => {
        const barWidth = (item.amount / maxAmount) * 100 * animationProgress
        // Staggered animation
        const staggerDelay = shouldAnimate ? index * 60 : 0

        return (
          <div
            key={item.id}
            className="py-3 first:pt-0 last:pb-0"
            style={{
              opacity: shouldAnimate ? Math.min(1, animationProgress + index * 0.15) : 1,
              transform: shouldAnimate
                ? `translateY(${(1 - Math.min(1, animationProgress + index * 0.1)) * 8}px)`
                : 'none',
              transition: `opacity 250ms ${staggerDelay}ms, transform 250ms ${staggerDelay}ms`,
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                {/* Enhanced rank indicator with subtle background */}
                <span className="text-xs text-muted-foreground tabular-nums w-5 h-5 flex items-center justify-center bg-muted/30 shrink-0">
                  {index + 1}
                </span>
                <span className="text-sm truncate">{item.description}</span>
              </div>
              <span className="text-sm font-medium tabular-nums shrink-0">
                ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-2 pl-7">
              {/* Standardized bar height: h-2 (matching ExpenseChart) */}
              <div className="flex-1 h-2 bg-muted/30 overflow-hidden">
                <div
                  className="h-full bg-foreground/60 transition-[width] duration-100"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{item.category}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
