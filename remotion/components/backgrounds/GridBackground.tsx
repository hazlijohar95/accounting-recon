import React, { useMemo } from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { COLORS } from '../../utils/timing'

interface GridBackgroundProps {
  /** Grid cell size in pixels */
  cellSize?: number
  /** Grid line opacity (0-1) */
  gridOpacity?: number
  /** Noise texture opacity (0-1) */
  noiseOpacity?: number
  /** Animate grid (subtle drift) */
  animate?: boolean
  /** Background color override */
  backgroundColor?: string
}

/**
 * Subtle grid background with noise texture.
 * Institutional-grade aesthetic with faint visual texture.
 */
export function GridBackground({
  cellSize = 60,
  gridOpacity = 0.05,
  noiseOpacity = 0.03,
  animate = true,
  backgroundColor = COLORS.background,
}: GridBackgroundProps) {
  const frame = useCurrentFrame()

  // Subtle drift animation
  const offsetX = animate
    ? interpolate(frame, [0, 1800], [0, cellSize * 0.5], { extrapolateRight: 'clamp' })
    : 0

  // Generate noise pattern using SVG filter
  const noiseFilter = useMemo(
    () => ({
      __html: `
        <svg width="0" height="0">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
            <feColorMatrix type="saturate" values="0"/>
          </filter>
        </svg>
      `,
    }),
    []
  )

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* SVG noise filter definition */}
      <div dangerouslySetInnerHTML={noiseFilter} />

      {/* Grid pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,${gridOpacity}) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,${gridOpacity}) 1px, transparent 1px)
          `,
          backgroundSize: `${cellSize}px ${cellSize}px`,
          backgroundPosition: `${offsetX}px 0`,
        }}
      />

      {/* Noise texture overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          filter: 'url(#noise)',
          opacity: noiseOpacity,
        }}
      />

      {/* Subtle radial gradient for depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 0%, ${backgroundColor} 100%)`,
          opacity: 0.5,
        }}
      />
    </AbsoluteFill>
  )
}
