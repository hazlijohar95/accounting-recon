'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Props for the ConfidenceGauge component.
 */
interface ConfidenceGaugeProps {
  /** Confidence value from 0-100 */
  value: number
  /** Gauge size: 'sm' (64px), 'md' (96px), or 'lg' (128px) */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to animate the gauge on mount */
  animate?: boolean
  /** Whether to show the confidence level label below */
  showLabel?: boolean
  /** Additional CSS classes */
  className?: string
}

const sizeConfig = {
  sm: { width: 64, stroke: 4, fontSize: 'text-xs' },
  md: { width: 96, stroke: 6, fontSize: 'text-sm' },
  lg: { width: 128, stroke: 8, fontSize: 'text-base' },
}

function getConfidenceLevel(value: number): {
  level: 'high' | 'medium' | 'low'
  color: string
  bgColor: string
} {
  if (value >= 90) {
    return { level: 'high', color: 'stroke-emerald-500', bgColor: 'bg-emerald-500' }
  }
  if (value >= 70) {
    return { level: 'medium', color: 'stroke-amber-500', bgColor: 'bg-amber-500' }
  }
  return { level: 'low', color: 'stroke-red-500', bgColor: 'bg-red-500' }
}

/**
 * Circular confidence gauge with animated arc indicator.
 *
 * Displays a 270-degree arc gauge that fills based on the confidence value.
 * Uses color coding to indicate confidence levels:
 * - Green (≥90%): High confidence - auto-match
 * - Amber (70-89%): Medium confidence - review suggested
 * - Red (<70%): Low confidence - manual review needed
 *
 * @example
 * ```tsx
 * <ConfidenceGauge value={85} size="lg" />
 * ```
 */
export function ConfidenceGauge({
  value,
  size = 'md',
  animate = true,
  showLabel = true,
  className,
}: ConfidenceGaugeProps) {
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value)
  const config = sizeConfig[size]
  const { level, color } = getConfidenceLevel(value)

  // Arc calculations
  const radius = (config.width - config.stroke) / 2
  const circumference = 2 * Math.PI * radius
  const arcLength = circumference * 0.75 // 270 degrees
  const offset = arcLength - (arcLength * displayValue) / 100

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value)
      return
    }

    const duration = 1000
    const start = performance.now()
    const startValue = 0

    const animateValue = (currentTime: number) => {
      const elapsed = currentTime - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic

      setDisplayValue(Math.round(startValue + (value - startValue) * eased))

      if (progress < 1) {
        requestAnimationFrame(animateValue)
      }
    }

    requestAnimationFrame(animateValue)
  }, [value, animate])

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg
        width={config.width}
        height={config.width}
        viewBox={`0 0 ${config.width} ${config.width}`}
        className="transform -rotate-[135deg]"
      >
        {/* Background arc */}
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="none"
          strokeWidth={config.stroke}
          className="stroke-secondary"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="square"
        />
        {/* Value arc */}
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="none"
          strokeWidth={config.stroke}
          className={cn(color, 'transition-all duration-300')}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="square"
        />
      </svg>
      {/* Center value */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn('font-mono font-medium', config.fontSize)}>
          {displayValue}%
        </span>
      </div>
      {showLabel && (
        <span className="mt-2 text-xs text-muted-foreground uppercase tracking-wider">
          {level}
        </span>
      )}
    </div>
  )
}

/**
 * Props for the ConfidenceBar component.
 */
interface ConfidenceBarProps {
  /** Confidence value from 0-100 */
  value: number
  /** Whether to animate the bar on mount */
  animate?: boolean
  /** Whether to show the percentage value */
  showValue?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Horizontal confidence bar with animated fill.
 *
 * Displays a simple horizontal progress bar that fills based on confidence.
 * Includes optional label showing the confidence level and recommended action.
 *
 * @example
 * ```tsx
 * <ConfidenceBar value={75} showValue />
 * ```
 */
export function ConfidenceBar({
  value,
  animate = true,
  showValue = true,
  className,
}: ConfidenceBarProps) {
  const [displayWidth, setDisplayWidth] = useState(animate ? 0 : value)
  const { level, bgColor } = getConfidenceLevel(value)

  useEffect(() => {
    if (!animate) {
      setDisplayWidth(value)
      return
    }

    const timer = setTimeout(() => setDisplayWidth(value), 100)
    return () => clearTimeout(timer)
  }, [value, animate])

  return (
    <div className={cn('w-full', className)}>
      {showValue && (
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground uppercase tracking-wider">
            Confidence
          </span>
          <span className="font-mono">{value}%</span>
        </div>
      )}
      <div className="h-1 bg-secondary">
        <div
          className={cn(bgColor, 'h-full transition-all duration-700 ease-out')}
          style={{ width: `${displayWidth}%` }}
        />
      </div>
      {showValue && (
        <div className="mt-1 text-xs text-muted-foreground text-right">
          {level === 'high' && 'Auto-match'}
          {level === 'medium' && 'Review suggested'}
          {level === 'low' && 'Manual review'}
        </div>
      )}
    </div>
  )
}

/**
 * Props for the ConfidenceThresholds component.
 */
interface ConfidenceThresholdsProps {
  /** Additional CSS classes */
  className?: string
}

/**
 * Legend showing confidence threshold ranges.
 *
 * Displays the three confidence levels with their color indicators:
 * - High (≥90%): Green - auto-match
 * - Medium (70-89%): Amber - review suggested
 * - Low (<70%): Red - manual review
 *
 * @example
 * ```tsx
 * <ConfidenceThresholds className="mt-4" />
 * ```
 */
export function ConfidenceThresholds({ className }: ConfidenceThresholdsProps) {
  return (
    <div className={cn('flex gap-6', className)}>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-emerald-500" />
        <div className="text-xs">
          <span className="text-muted-foreground">High</span>
          <span className="ml-1 font-mono">&ge;90%</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-amber-500" />
        <div className="text-xs">
          <span className="text-muted-foreground">Medium</span>
          <span className="ml-1 font-mono">70-89%</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-red-500" />
        <div className="text-xs">
          <span className="text-muted-foreground">Low</span>
          <span className="ml-1 font-mono">&lt;70%</span>
        </div>
      </div>
    </div>
  )
}
