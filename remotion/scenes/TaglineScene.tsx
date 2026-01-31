import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion'
import { Logo3DRemotionBase } from '../components/Logo3DRemotionBase'
import { COLORS } from '../utils/timing'

/**
 * Scene 4: Tagline (26-30s, frames 1560-1800)
 *
 * Logo + "Change the way you reconcile."
 * Quiet, decisive ending - no blinking, no pulsing.
 */
export function TaglineScene() {
  const frame = useCurrentFrame()

  // Crossfade in from previous scene
  const sceneOpacity = interpolate(
    frame,
    [0, 30],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // Logo fade in
  const logoOpacity = interpolate(
    frame,
    [15, 45],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
  )

  // Logo scale (subtle grow)
  const logoScale = interpolate(
    frame,
    [15, 60],
    [0.95, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
  )

  // Tagline fade in (delayed)
  const taglineOpacity = interpolate(
    frame,
    [45, 75],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
  )

  // Tagline slide up
  const taglineY = interpolate(
    frame,
    [45, 75],
    [15, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
  )

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background, opacity: sceneOpacity }}>
      {/* Subtle vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 30%, ${COLORS.background} 100%)`,
        }}
      />

      {/* Logo container - upper portion */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '55%',
          opacity: logoOpacity,
        }}
      >
        <Logo3DRemotionBase
          assemblyProgress={1}
          scale={logoScale * 1.2}
          cameraPosition={[0, 0.1, 4]}
          color={COLORS.logo}
          opacity={logoOpacity}
        />
      </div>

      {/* Tagline */}
      <div
        style={{
          position: 'absolute',
          bottom: '25%',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
        }}
      >
        {/* Main tagline */}
        <h1
          style={{
            fontSize: 42,
            fontWeight: 400,
            color: COLORS.text,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '-0.02em',
            margin: 0,
            textAlign: 'center',
          }}
        >
          Change the way you reconcile.
        </h1>

        {/* Brand name - subtle */}
        <span
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: COLORS.textSecondary,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: 8,
          }}
        >
          Reconciled
        </span>
      </div>

      {/* Quiet confidence - no animations after entrance */}
    </AbsoluteFill>
  )
}
