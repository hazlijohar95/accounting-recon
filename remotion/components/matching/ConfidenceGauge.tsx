import React from 'react'
import { useCurrentFrame, interpolate, Easing } from 'remotion'
import { COLORS } from '../../utils/timing'

interface ConfidenceGaugeProps {
  /** Target confidence value (0-100) */
  targetValue: number
  /** Frame when animation starts */
  startFrame: number
  /** Duration of fill animation (frames) */
  fillDuration?: number
  /** Gauge size in pixels */
  size?: number
  /** Arc thickness */
  strokeWidth?: number
  /** Show percentage text */
  showValue?: boolean
  /** Label below gauge */
  label?: string
  /** Opacity override */
  opacity?: number
}

/**
 * Animated confidence arc gauge.
 * Fills from 0 to target value with easing.
 */
export function ConfidenceGauge({
  targetValue,
  startFrame,
  fillDuration = 60,
  size = 120,
  strokeWidth = 8,
  showValue = true,
  label = 'Confidence',
  opacity = 1,
}: ConfidenceGaugeProps) {
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

  // Current displayed value
  const currentValue = Math.round(targetValue * fillProgress)

  // Arc calculations
  const radius = (size - strokeWidth) / 2
  const circumference = radius * Math.PI * 1.5 // 270 degrees (3/4 circle)
  const arcOffset = circumference * (1 - (currentValue / 100))

  // Color based on value
  const getColor = (value: number) => {
    if (value >= 90) return COLORS.matched
    if (value >= 70) return '#f59e0b' // amber
    return '#ef4444' // red
  }

  const gaugeColor = getColor(currentValue)

  // Number animation for displayed value
  const displayValue = Math.round(targetValue * fillProgress)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        opacity: opacity * fadeProgress,
      }}
    >
      {/* Gauge SVG */}
      <svg
        width={size}
        height={size * 0.75}
        viewBox={`0 0 ${size} ${size * 0.75}`}
        style={{ overflow: 'visible' }}
      >
        {/* Background arc */}
        <path
          d={describeArc(size / 2, size / 2, radius, -225, 45)}
          fill="none"
          stroke={COLORS.cardBorder}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Value arc */}
        <path
          d={describeArc(size / 2, size / 2, radius, -225, 45)}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={arcOffset}
          style={{
            filter: `drop-shadow(0 0 6px ${gaugeColor}40)`,
          }}
        />

        {/* Glow effect at end of arc */}
        {currentValue > 0 && (
          <circle
            cx={size / 2 + radius * Math.cos(((-225 + 270 * currentValue / 100) * Math.PI) / 180)}
            cy={size / 2 + radius * Math.sin(((-225 + 270 * currentValue / 100) * Math.PI) / 180)}
            r={strokeWidth / 2 + 2}
            fill={gaugeColor}
            opacity={0.5}
          />
        )}
      </svg>

      {/* Value display */}
      {showValue && (
        <div
          style={{
            marginTop: -size * 0.35,
            display: 'flex',
            alignItems: 'baseline',
            gap: 2,
          }}
        >
          <span
            style={{
              fontSize: size * 0.28,
              fontWeight: 700,
              color: gaugeColor,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {displayValue}
          </span>
          <span
            style={{
              fontSize: size * 0.14,
              fontWeight: 500,
              color: COLORS.textSecondary,
            }}
          >
            %
          </span>
        </div>
      )}

      {/* Label */}
      {label && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: COLORS.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginTop: showValue ? -4 : 8,
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}

/**
 * Helper to generate SVG arc path.
 */
function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(x, y, radius, endAngle)
  const end = polarToCartesian(x, y, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
  ].join(' ')
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}
