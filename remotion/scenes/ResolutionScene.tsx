import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion'
import { GradientBackground } from '../components/backgrounds/GradientBackground'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import { COLORS } from '../utils/timing'

/**
 * Scene 3: Resolution (18-26s, frames 1080-1560)
 *
 * Clean reconciled dashboard emerges. Everything aligned,
 * totals balancing, calm confidence.
 */
export function ResolutionScene() {
  const frame = useCurrentFrame()

  // Crossfade from previous scene
  const fadeIn = interpolate(
    frame,
    [0, 30],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // Subtle camera push-in then hold
  const cameraZoom = interpolate(
    frame,
    [0, 180],
    [0.98, 1],
    { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
  )

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Gradient background */}
      <GradientBackground vignette={0.4} />

      {/* Dashboard with camera effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: fadeIn,
          transform: `scale(${cameraZoom})`,
          transformOrigin: 'center center',
        }}
      >
        <DashboardLayout
          startFrame={15}
          cashIn={248500}
          cashOut={187300}
          matchedPercent={95}
          suspenseCount={12}
        />
      </div>

      {/* Subtle ambient glow in center */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          width: 600,
          height: 400,
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(ellipse at center, ${COLORS.matched}08 0%, transparent 70%)`,
          pointerEvents: 'none',
          opacity: interpolate(
            frame,
            [120, 180],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          ),
        }}
      />
    </AbsoluteFill>
  )
}
