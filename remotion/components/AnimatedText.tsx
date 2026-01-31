import React from 'react'
import { useCurrentFrame, interpolate, Easing } from 'remotion'
import { COLORS } from '../utils/timing'

interface TypewriterTextProps {
  text: string
  /** Frame when typing starts */
  startFrame: number
  /** Frames per character */
  framesPerChar?: number
  /** Font size in pixels */
  fontSize?: number
  /** Font weight */
  fontWeight?: number | string
  /** Text color */
  color?: string
  /** Letter spacing */
  letterSpacing?: string
  /** Show cursor */
  showCursor?: boolean
  /** Font family */
  fontFamily?: string
}

/**
 * Typewriter effect text component.
 * Characters appear one by one with a cursor.
 */
export function TypewriterText({
  text,
  startFrame,
  framesPerChar = 3,
  fontSize = 72,
  fontWeight = 600,
  color = COLORS.text,
  letterSpacing = '-0.02em',
  showCursor = true,
  fontFamily = 'system-ui, -apple-system, sans-serif',
}: TypewriterTextProps) {
  const frame = useCurrentFrame()
  const relativeFrame = frame - startFrame

  if (relativeFrame < 0) return null

  // Calculate how many characters to show
  const charsToShow = Math.min(
    text.length,
    Math.floor(relativeFrame / framesPerChar)
  )

  const displayText = text.slice(0, charsToShow)
  const isTyping = charsToShow < text.length

  // Cursor blink (every 30 frames)
  const cursorVisible = showCursor && (isTyping || (Math.floor(frame / 30) % 2 === 0))

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        color,
        letterSpacing,
        fontFamily,
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      <span>{displayText}</span>
      {cursorVisible && (
        <span
          style={{
            width: fontSize * 0.05,
            height: fontSize * 0.85,
            backgroundColor: color,
            marginLeft: 4,
            opacity: isTyping ? 1 : 0.7,
          }}
        />
      )}
    </div>
  )
}

interface FadeInTextProps {
  children: React.ReactNode
  /** Frame when fade starts */
  startFrame: number
  /** Duration of fade in frames */
  duration?: number
  /** Slide up distance in pixels */
  slideDistance?: number
  /** Style overrides */
  style?: React.CSSProperties
}

/**
 * Fade-in text with optional slide-up effect.
 */
export function FadeInText({
  children,
  startFrame,
  duration = 30,
  slideDistance = 20,
  style,
}: FadeInTextProps) {
  const frame = useCurrentFrame()
  const relativeFrame = frame - startFrame

  const progress = Math.max(0, Math.min(1, relativeFrame / duration))
  const easedProgress = Easing.out(Easing.cubic)(progress)

  const opacity = interpolate(easedProgress, [0, 1], [0, 1])
  const translateY = interpolate(easedProgress, [0, 1], [slideDistance, 0])

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

interface PulsingTextProps {
  children: React.ReactNode
  /** Pulse frequency in frames */
  pulseFrames?: number
  /** Minimum scale */
  minScale?: number
  /** Maximum scale */
  maxScale?: number
  /** Style overrides */
  style?: React.CSSProperties
}

/**
 * Text with subtle pulsing scale effect.
 */
export function PulsingText({
  children,
  pulseFrames = 60,
  minScale = 0.98,
  maxScale = 1.02,
  style,
}: PulsingTextProps) {
  const frame = useCurrentFrame()

  // Sine wave for smooth pulsing
  const pulseProgress = Math.sin((frame / pulseFrames) * Math.PI * 2) * 0.5 + 0.5
  const scale = interpolate(pulseProgress, [0, 1], [minScale, maxScale])

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
