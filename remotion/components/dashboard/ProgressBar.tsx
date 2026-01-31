import React from 'react'
import { useCurrentFrame, interpolate, Easing } from 'remotion'
import { COLORS } from '../../utils/timing'

interface ProgressBarProps {
  /** Target progress value (0-100) */
  value: number
  /** Frame when animation starts */
  startFrame: number
  /** Duration of fill animation (frames) */
  fillDuration?: number
  /** Bar height in pixels */
  height?: number
  /** Bar width (CSS value) */
  width?: string | number
  /** Show percentage label */
  showLabel?: boolean
  /** Label position */
  labelPosition?: 'above' | 'inside' | 'right'
  /** Progress bar color */
  color?: string
  /** Label text (defaults to "Progress") */
  label?: string
  /** Opacity override */
  opacity?: number
}

/**
 * Animated progress bar with fill animation.
 */
export function ProgressBar({
  value,
  startFrame,
  fillDuration = 60,
  height = 8,
  width = '100%',
  showLabel = true,
  labelPosition = 'above',
  color = COLORS.matched,
  label = 'Reconciliation Progress',
  opacity = 1,
}: ProgressBarProps) {
  const frame = useCurrentFrame()
  const relativeFrame = frame - startFrame

  // Don't render before start
  if (relativeFrame < 0) return null

  // Fade in
  const fadeProgress = interpolate(
    relativeFrame,
    [0, 15],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // Fill progress with easing (guard against zero duration)
  const safeFillDuration = Math.max(1, fillDuration)
  const rawFillProgress = interpolate(
    relativeFrame,
    [10, 10 + safeFillDuration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )
  const fillProgress = Easing.out(Easing.cubic)(rawFillProgress)
  const currentValue = value * fillProgress
  const displayPercent = Math.round(currentValue)

  return (
    <div
      style={{
        width,
        opacity: opacity * fadeProgress,
        display: 'flex',
        flexDirection: labelPosition === 'right' ? 'row' : 'column',
        alignItems: labelPosition === 'right' ? 'center' : 'stretch',
        gap: labelPosition === 'right' ? 16 : 8,
      }}
    >
      {/* Label above */}
      {showLabel && labelPosition === 'above' && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
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
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.text,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {displayPercent}%
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div
        style={{
          flex: labelPosition === 'right' ? 1 : undefined,
          height,
          backgroundColor: COLORS.cardBorder,
          borderRadius: height / 2,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Fill */}
        <div
          style={{
            height: '100%',
            width: `${currentValue}%`,
            backgroundColor: color,
            borderRadius: height / 2,
            boxShadow: `0 0 12px ${color}40`,
            position: 'relative',
          }}
        >
          {/* Shine effect */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)',
              borderRadius: `${height / 2}px ${height / 2}px 0 0`,
            }}
          />
        </div>

        {/* Label inside */}
        {showLabel && labelPosition === 'inside' && height >= 20 && (
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: height * 0.6,
              fontWeight: 600,
              color: displayPercent > 50 ? 'white' : COLORS.text,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {displayPercent}%
          </span>
        )}
      </div>

      {/* Label right */}
      {showLabel && labelPosition === 'right' && (
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: COLORS.text,
            fontVariantNumeric: 'tabular-nums',
            minWidth: 45,
          }}
        >
          {displayPercent}%
        </span>
      )}
    </div>
  )
}
