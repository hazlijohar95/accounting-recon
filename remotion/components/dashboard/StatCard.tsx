import React from 'react'
import { useCurrentFrame, interpolate, Easing, spring, useVideoConfig } from 'remotion'
import { COLORS } from '../../utils/timing'

interface StatCardProps {
  /** Stat label */
  label: string
  /** Target numeric value */
  value: number
  /** Value prefix (e.g., "$") */
  prefix?: string
  /** Value suffix (e.g., "%", "K") */
  suffix?: string
  /** Frame when animation starts */
  startFrame: number
  /** Duration for number counting (frames) */
  countDuration?: number
  /** Card width */
  width?: number
  /** Accent color for the value */
  valueColor?: string
  /** Show trend indicator */
  trend?: 'up' | 'down' | 'neutral'
  /** Icon SVG path */
  icon?: React.ReactNode
}

/**
 * Animated stat card with number counter.
 * Scales in and counts up to target value.
 */
export function StatCard({
  label,
  value,
  prefix = '',
  suffix = '',
  startFrame,
  countDuration = 48,
  width = 200,
  valueColor = COLORS.text,
  trend,
  icon,
}: StatCardProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const relativeFrame = frame - startFrame

  // Don't render before start
  if (relativeFrame < 0) return null

  // Scale in animation with spring
  const scaleProgress = spring({
    frame: relativeFrame,
    fps,
    config: { damping: 15, mass: 1, stiffness: 100 },
    durationInFrames: 30,
  })

  // Fade in
  const fadeProgress = interpolate(
    relativeFrame,
    [0, 15],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // Number counting animation (guard against zero duration)
  const safeCountDuration = Math.max(1, countDuration)
  const countProgress = interpolate(
    relativeFrame,
    [5, 5 + safeCountDuration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )
  const easedCount = Easing.out(Easing.cubic)(countProgress)
  const displayValue = Math.round(value * easedCount)

  // Format number with commas
  const formattedValue = displayValue.toLocaleString()

  // Trend colors and icons
  const trendConfig = {
    up: { color: COLORS.matched, rotation: -45 },
    down: { color: '#ef4444', rotation: 45 },
    neutral: { color: COLORS.textSecondary, rotation: 0 },
  }

  return (
    <div
      style={{
        width,
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.cardBorder}`,
        borderRadius: 12,
        padding: 20,
        opacity: fadeProgress,
        transform: `scale(${scaleProgress})`,
        transformOrigin: 'center center',
      }}
    >
      {/* Header with icon and label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: COLORS.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
        {icon && (
          <div
            style={{
              width: 24,
              height: 24,
              color: COLORS.textSecondary,
              opacity: 0.6,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value with trend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: valueColor,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          }}
        >
          {prefix}
          {formattedValue}
          {suffix}
        </span>

        {trend && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              color: trendConfig[trend].color,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                transform: `rotate(${trendConfig[trend].rotation}deg)`,
              }}
            >
              <path
                d="M5 12h14M12 5l7 7M12 5l-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
