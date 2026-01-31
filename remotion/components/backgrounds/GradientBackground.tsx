import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { COLORS } from '../../utils/timing'

interface GradientBackgroundProps {
  /** Primary background color */
  primaryColor?: string
  /** Secondary color for gradient */
  secondaryColor?: string
  /** Gradient angle in degrees */
  angle?: number
  /** Animate gradient shift */
  animate?: boolean
  /** Vignette intensity (0-1) */
  vignette?: number
}

/**
 * Institutional gradient background.
 * Dark, subtle, CFO-trustworthy aesthetic.
 */
export function GradientBackground({
  primaryColor = COLORS.background,
  secondaryColor = '#111111',
  angle = 180,
  animate = false,
  vignette = 0.3,
}: GradientBackgroundProps) {
  const frame = useCurrentFrame()

  // Subtle angle animation if enabled
  const animatedAngle = animate
    ? angle + interpolate(frame, [0, 1800], [0, 15], { extrapolateRight: 'clamp' })
    : angle

  return (
    <AbsoluteFill>
      {/* Base gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(${animatedAngle}deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        }}
      />

      {/* Vignette overlay */}
      {vignette > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at center, transparent 50%, ${primaryColor} 100%)`,
            opacity: vignette,
          }}
        />
      )}
    </AbsoluteFill>
  )
}
