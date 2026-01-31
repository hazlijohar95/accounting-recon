import React from 'react'
import { useCurrentFrame, interpolate, Easing } from 'remotion'
import { COLORS } from '../../utils/timing'

interface ConnectionLineProps {
  /** Start point [x, y] as percentage */
  from: [number, number]
  /** End point [x, y] as percentage */
  to: [number, number]
  /** Frame when draw animation starts */
  startFrame: number
  /** Duration of draw animation (frames) */
  drawDuration?: number
  /** Line color */
  color?: string
  /** Line width */
  strokeWidth?: number
  /** Show particle trail effect */
  showParticles?: boolean
  /** Curve intensity (0 = straight, 1 = curved) */
  curveIntensity?: number
  /** Opacity override */
  opacity?: number
}

/**
 * SVG connection line that draws between two points.
 * Used to visualize matching relationships.
 */
export function ConnectionLine({
  from,
  to,
  startFrame,
  drawDuration = 30,
  color = COLORS.matched,
  strokeWidth = 2,
  showParticles = true,
  curveIntensity = 0.3,
  opacity = 1,
}: ConnectionLineProps) {
  const frame = useCurrentFrame()
  const relativeFrame = frame - startFrame

  // Don't render before start
  if (relativeFrame < 0) return null

  // Draw progress with easing (guard against zero duration)
  const safeDrawDuration = Math.max(1, drawDuration)
  const rawProgress = interpolate(
    relativeFrame,
    [0, safeDrawDuration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )
  const progress = Easing.out(Easing.cubic)(rawProgress)

  // Calculate control point for bezier curve
  const midX = (from[0] + to[0]) / 2
  const midY = (from[1] + to[1]) / 2
  const controlX = midX
  const controlY = midY - 10 * curveIntensity

  // Build path
  const path = curveIntensity > 0
    ? `M ${from[0]} ${from[1]} Q ${controlX} ${controlY} ${to[0]} ${to[1]}`
    : `M ${from[0]} ${from[1]} L ${to[0]} ${to[1]}`

  // Calculate approximate path length for dash animation
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const pathLength = Math.sqrt(dx * dx + dy * dy) * (1 + curveIntensity * 0.2)

  // Particle position along path
  const particleProgress = progress

  // Calculate particle position (simplified for straight/slight curve)
  const particleX = interpolate(particleProgress, [0, 1], [from[0], to[0]])
  const particleY = curveIntensity > 0
    ? interpolate(
        particleProgress,
        [0, 0.5, 1],
        [from[1], controlY, to[1]]
      )
    : interpolate(particleProgress, [0, 1], [from[1], to[1]])

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Glow effect */}
      <defs>
        <filter id={`glow-${from.join('-')}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main line with draw animation */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth * 0.05}
        strokeLinecap="round"
        strokeDasharray={pathLength}
        strokeDashoffset={pathLength * (1 - progress)}
        opacity={opacity * 0.8}
        filter={`url(#glow-${from.join('-')})`}
      />

      {/* Brighter core line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth * 0.03}
        strokeLinecap="round"
        strokeDasharray={pathLength}
        strokeDashoffset={pathLength * (1 - progress)}
        opacity={opacity}
      />

      {/* Particle trail */}
      {showParticles && progress > 0 && progress < 1 && (
        <>
          <circle
            cx={particleX}
            cy={particleY}
            r={0.8}
            fill={color}
            opacity={opacity}
          />
          <circle
            cx={particleX}
            cy={particleY}
            r={1.5}
            fill={color}
            opacity={opacity * 0.3}
          />
        </>
      )}

      {/* End point glow when complete */}
      {progress >= 1 && (
        <circle
          cx={to[0]}
          cy={to[1]}
          r={1}
          fill={color}
          opacity={opacity * 0.5}
        >
          <animate
            attributeName="r"
            values="1;1.5;1"
            dur="1s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.5;0.2;0.5"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </svg>
  )
}
