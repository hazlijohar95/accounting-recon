import React from 'react'
import { useCurrentFrame, interpolate, Easing, spring, useVideoConfig } from 'remotion'
import { COLORS } from '../../utils/timing'

export interface FloatingDataCardProps {
  /** Unique identifier for the card */
  id: string
  /** Initial position [x, y] as percentage of viewport */
  initialPosition: [number, number]
  /** Target position when aligned [x, y] as percentage */
  targetPosition?: [number, number]
  /** Initial rotation in degrees */
  initialRotation?: number
  /** Depth layer for parallax (0-1, higher = closer) */
  depth?: number
  /** Animation progress for alignment (0 = floating, 1 = aligned) */
  alignmentProgress?: number
  /** Card content */
  children: React.ReactNode
  /** Card opacity override */
  opacity?: number
  /** Width in pixels */
  width?: number
  /** Frame when card should fade in */
  fadeInFrame?: number
  /** Duration of fade in (frames) */
  fadeInDuration?: number
}

/**
 * Base floating data card with drift/bob animation.
 * Used as container for bank transactions, invoices, receipts.
 */
export function FloatingDataCard({
  id,
  initialPosition,
  targetPosition,
  initialRotation = 0,
  depth = 0.5,
  alignmentProgress = 0,
  children,
  opacity = 1,
  width = 320,
  fadeInFrame = 0,
  fadeInDuration = 30,
}: FloatingDataCardProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Fade in animation (handle edge case where fadeInDuration is 0)
  const fadeProgress = fadeInDuration > 0
    ? interpolate(
        frame,
        [fadeInFrame, fadeInFrame + fadeInDuration],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      )
    : frame >= fadeInFrame ? 1 : 0
  const fadeOpacity = fadeProgress * opacity

  // Floating bob animation (sine wave)
  const bobFrequency = 0.015 + depth * 0.01 // Different frequency per depth
  const bobAmplitude = 8 * (1 - depth) // Less movement for closer cards
  const bobOffset = Math.sin(frame * bobFrequency + parseInt(id, 36)) * bobAmplitude

  // Horizontal drift (slower sine wave)
  const driftFrequency = 0.008
  const driftAmplitude = 5 * (1 - depth)
  const driftOffset = Math.sin(frame * driftFrequency + parseInt(id, 36) * 2) * driftAmplitude

  // Rotation oscillation
  const rotationAmplitude = 2 * (1 - alignmentProgress)
  const rotationOffset =
    Math.sin(frame * 0.02 + parseInt(id, 36) * 3) * rotationAmplitude

  // Spring physics for alignment
  const springConfig = { damping: 15, mass: 1, stiffness: 80 }
  const alignSpring = spring({
    frame,
    fps,
    config: springConfig,
    durationInFrames: 60,
  })

  // Interpolate position based on alignment progress
  const currentX =
    targetPosition && alignmentProgress > 0
      ? interpolate(
          alignmentProgress * alignSpring,
          [0, 1],
          [initialPosition[0] + driftOffset * 0.1, targetPosition[0]]
        )
      : initialPosition[0] + driftOffset * 0.1

  const currentY =
    targetPosition && alignmentProgress > 0
      ? interpolate(
          alignmentProgress * alignSpring,
          [0, 1],
          [initialPosition[1] + bobOffset * 0.1, targetPosition[1]]
        )
      : initialPosition[1] + bobOffset * 0.1

  // Final rotation
  const currentRotation = interpolate(
    alignmentProgress,
    [0, 1],
    [initialRotation + rotationOffset, 0],
    { extrapolateRight: 'clamp' }
  )

  // Scale based on depth (parallax effect)
  const depthScale = 0.85 + depth * 0.3

  return (
    <div
      style={{
        position: 'absolute',
        left: `${currentX}%`,
        top: `${currentY}%`,
        transform: `
          translate(-50%, -50%)
          rotate(${currentRotation}deg)
          scale(${depthScale})
          translateY(${bobOffset}px)
          translateX(${driftOffset}px)
        `,
        opacity: fadeOpacity,
        width,
        zIndex: Math.round(depth * 100),
      }}
    >
      {/* Card container */}
      <div
        style={{
          backgroundColor: COLORS.card,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: 12,
          padding: 16,
          boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 ${depth * 20}px rgba(0,0,0,0.2)`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
