'use client'

import { PixelIconBase, type PixelIconProps } from './pixel-core'

/**
 * AI/Magic icons - Sparkle, Brain, Wand, etc.
 * Built from rectangles for pixel-perfect rendering
 */

/** Sparkle - 4-point star */
export function IconSparkle({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Center */}
      <rect x="7" y="7" width="2" height="2" />
      {/* 4 points */}
      <rect x="7" y="2" width="2" height="4" />
      <rect x="7" y="10" width="2" height="4" />
      <rect x="2" y="7" width="4" height="2" />
      <rect x="10" y="7" width="4" height="2" />
      {/* Small diagonals for sparkle effect */}
      <rect x="4" y="4" width="2" height="2" />
      <rect x="10" y="4" width="2" height="2" />
      <rect x="4" y="10" width="2" height="2" />
      <rect x="10" y="10" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Sparkles - multiple sparkle effect */
export function IconSparkles({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Main sparkle */}
      <rect x="6" y="6" width="2" height="2" />
      <rect x="6" y="2" width="2" height="3" />
      <rect x="6" y="9" width="2" height="3" />
      <rect x="2" y="6" width="3" height="2" />
      <rect x="9" y="6" width="3" height="2" />
      {/* Small sparkle top-right */}
      <rect x="12" y="1" width="2" height="2" />
      <rect x="12" y="4" width="2" height="1" />
      <rect x="11" y="2" width="1" height="2" />
      <rect x="14" y="2" width="1" height="2" />
      {/* Small sparkle bottom-left */}
      <rect x="2" y="12" width="2" height="2" />
      <rect x="1" y="13" width="1" height="1" />
      <rect x="4" y="13" width="1" height="1" />
    </PixelIconBase>
  )
}

/** Magic wand */
export function IconWand({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Wand body (diagonal) */}
      <rect x="9" y="7" width="2" height="2" />
      <rect x="11" y="9" width="2" height="2" />
      <rect x="13" y="11" width="2" height="2" />
      <rect x="12" y="13" width="3" height="2" />
      {/* Wand tip/star */}
      <rect x="7" y="5" width="2" height="2" />
      <rect x="5" y="3" width="2" height="2" />
      <rect x="3" y="1" width="2" height="2" />
      {/* Sparkle at tip */}
      <rect x="1" y="3" width="2" height="1" />
      <rect x="4" y="1" width="1" height="2" />
      <rect x="6" y="5" width="1" height="1" />
      <rect x="5" y="6" width="1" height="1" />
    </PixelIconBase>
  )
}

/** Robot head */
export function IconRobot({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Antenna */}
      <rect x="7" y="1" width="2" height="2" />
      {/* Head */}
      <rect x="2" y="3" width="12" height="2" />
      <rect x="2" y="11" width="12" height="2" />
      <rect x="2" y="3" width="2" height="10" />
      <rect x="12" y="3" width="2" height="10" />
      {/* Eyes */}
      <rect x="4" y="6" width="3" height="3" />
      <rect x="9" y="6" width="3" height="3" />
      {/* Mouth */}
      <rect x="5" y="10" width="6" height="1" opacity="0.5" />
      {/* Ears */}
      <rect x="0" y="5" width="2" height="4" />
      <rect x="14" y="5" width="2" height="4" />
    </PixelIconBase>
  )
}

/** Brain */
export function IconBrain({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Left hemisphere */}
      <rect x="2" y="3" width="5" height="2" />
      <rect x="1" y="5" width="2" height="6" />
      <rect x="2" y="11" width="5" height="2" />
      <rect x="5" y="5" width="2" height="2" />
      <rect x="3" y="7" width="4" height="2" />
      {/* Right hemisphere */}
      <rect x="9" y="3" width="5" height="2" />
      <rect x="13" y="5" width="2" height="6" />
      <rect x="9" y="11" width="5" height="2" />
      <rect x="9" y="5" width="2" height="2" />
      <rect x="9" y="7" width="4" height="2" />
      {/* Center connection */}
      <rect x="7" y="4" width="2" height="8" opacity="0.5" />
    </PixelIconBase>
  )
}

/** Lightbulb - idea */
export function IconLightbulb({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Bulb */}
      <rect x="4" y="1" width="8" height="2" />
      <rect x="3" y="3" width="2" height="4" />
      <rect x="11" y="3" width="2" height="4" />
      <rect x="4" y="7" width="2" height="2" />
      <rect x="10" y="7" width="2" height="2" />
      {/* Inner glow */}
      <rect x="6" y="3" width="4" height="4" opacity="0.3" />
      {/* Base */}
      <rect x="5" y="9" width="6" height="2" />
      <rect x="6" y="11" width="4" height="2" />
      <rect x="5" y="13" width="6" height="2" />
    </PixelIconBase>
  )
}

/** Atom - science/tech */
export function IconAtom({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Nucleus */}
      <rect x="7" y="7" width="2" height="2" />
      {/* Horizontal orbit */}
      <rect x="1" y="7" width="4" height="2" opacity="0.6" />
      <rect x="11" y="7" width="4" height="2" opacity="0.6" />
      {/* Diagonal orbit 1 */}
      <rect x="2" y="2" width="2" height="2" opacity="0.6" />
      <rect x="4" y="4" width="2" height="2" opacity="0.6" />
      <rect x="10" y="10" width="2" height="2" opacity="0.6" />
      <rect x="12" y="12" width="2" height="2" opacity="0.6" />
      {/* Diagonal orbit 2 */}
      <rect x="12" y="2" width="2" height="2" opacity="0.6" />
      <rect x="10" y="4" width="2" height="2" opacity="0.6" />
      <rect x="4" y="10" width="2" height="2" opacity="0.6" />
      <rect x="2" y="12" width="2" height="2" opacity="0.6" />
      {/* Electrons */}
      <rect x="1" y="6" width="2" height="2" />
      <rect x="3" y="2" width="2" height="2" />
      <rect x="11" y="12" width="2" height="2" />
    </PixelIconBase>
  )
}

/** CPU chip */
export function IconCpu({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Chip body */}
      <rect x="4" y="4" width="8" height="8" />
      {/* Inner die */}
      <rect x="6" y="6" width="4" height="4" opacity="0.5" />
      {/* Pins top */}
      <rect x="5" y="1" width="2" height="3" />
      <rect x="9" y="1" width="2" height="3" />
      {/* Pins bottom */}
      <rect x="5" y="12" width="2" height="3" />
      <rect x="9" y="12" width="2" height="3" />
      {/* Pins left */}
      <rect x="1" y="5" width="3" height="2" />
      <rect x="1" y="9" width="3" height="2" />
      {/* Pins right */}
      <rect x="12" y="5" width="3" height="2" />
      <rect x="12" y="9" width="3" height="2" />
    </PixelIconBase>
  )
}

/** Target - matching/targeting */
export function IconTarget({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Outer ring */}
      <rect x="4" y="1" width="8" height="2" />
      <rect x="4" y="13" width="8" height="2" />
      <rect x="1" y="4" width="2" height="8" />
      <rect x="13" y="4" width="2" height="8" />
      <rect x="2" y="2" width="2" height="2" />
      <rect x="12" y="2" width="2" height="2" />
      <rect x="2" y="12" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
      {/* Inner ring */}
      <rect x="6" y="5" width="4" height="2" />
      <rect x="6" y="9" width="4" height="2" />
      <rect x="5" y="6" width="2" height="4" />
      <rect x="9" y="6" width="2" height="4" />
      {/* Center dot */}
      <rect x="7" y="7" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Crosshair */
export function IconCrosshair({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Vertical line */}
      <rect x="7" y="1" width="2" height="5" />
      <rect x="7" y="10" width="2" height="5" />
      {/* Horizontal line */}
      <rect x="1" y="7" width="5" height="2" />
      <rect x="10" y="7" width="5" height="2" />
      {/* Center */}
      <rect x="7" y="7" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Git branch */
export function IconGitBranch({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Main line */}
      <rect x="3" y="1" width="2" height="14" />
      {/* Branch */}
      <rect x="5" y="5" width="4" height="2" />
      <rect x="9" y="5" width="2" height="6" />
      {/* Dots */}
      <rect x="2" y="2" width="4" height="4" opacity="0.3" />
      <rect x="8" y="9" width="4" height="4" opacity="0.3" />
      <rect x="2" y="12" width="4" height="3" opacity="0.3" />
    </PixelIconBase>
  )
}

/** Git merge */
export function IconGitMerge({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Main line */}
      <rect x="3" y="1" width="2" height="14" />
      {/* Merge branch */}
      <rect x="9" y="3" width="2" height="4" />
      <rect x="5" y="7" width="6" height="2" />
      {/* Dots */}
      <rect x="2" y="1" width="4" height="4" opacity="0.3" />
      <rect x="8" y="1" width="4" height="4" opacity="0.3" />
      <rect x="2" y="11" width="4" height="4" opacity="0.3" />
    </PixelIconBase>
  )
}

/** Pulse/Activity */
export function IconPulse({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Pulse line */}
      <rect x="1" y="8" width="3" height="2" />
      <rect x="4" y="6" width="2" height="2" />
      <rect x="6" y="2" width="2" height="4" />
      <rect x="8" y="10" width="2" height="4" />
      <rect x="10" y="6" width="2" height="4" />
      <rect x="12" y="8" width="3" height="2" />
    </PixelIconBase>
  )
}

/** Tree structure */
export function IconTree({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Root */}
      <rect x="1" y="2" width="4" height="3" />
      {/* Trunk */}
      <rect x="5" y="3" width="2" height="10" />
      {/* Branch 1 */}
      <rect x="7" y="5" width="4" height="2" />
      <rect x="11" y="4" width="4" height="4" />
      {/* Branch 2 */}
      <rect x="7" y="11" width="4" height="2" />
      <rect x="11" y="10" width="4" height="4" />
    </PixelIconBase>
  )
}

/** Flow - bidirectional arrows */
export function IconFlow({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Left arrow */}
      <rect x="1" y="4" width="6" height="2" />
      <rect x="1" y="3" width="2" height="4" />
      {/* Right arrow */}
      <rect x="9" y="10" width="6" height="2" />
      <rect x="13" y="9" width="2" height="4" />
      {/* Center connection */}
      <rect x="7" y="6" width="2" height="4" />
    </PixelIconBase>
  )
}

/** Shuffle */
export function IconShuffle({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Top path */}
      <rect x="1" y="3" width="4" height="2" />
      <rect x="5" y="5" width="2" height="2" />
      <rect x="7" y="7" width="2" height="2" />
      <rect x="9" y="9" width="2" height="2" />
      <rect x="11" y="11" width="4" height="2" />
      {/* Bottom path */}
      <rect x="1" y="11" width="4" height="2" />
      <rect x="5" y="9" width="2" height="2" />
      <rect x="9" y="5" width="2" height="2" />
      <rect x="11" y="3" width="4" height="2" />
      {/* Arrow heads */}
      <rect x="13" y="1" width="2" height="4" />
      <rect x="13" y="11" width="2" height="4" />
    </PixelIconBase>
  )
}

/** Swap - bidirectional */
export function IconSwap({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Top arrow pointing right */}
      <rect x="1" y="4" width="10" height="2" />
      <rect x="9" y="2" width="2" height="2" />
      <rect x="11" y="4" width="2" height="2" />
      <rect x="9" y="6" width="2" height="2" />
      {/* Bottom arrow pointing left */}
      <rect x="5" y="10" width="10" height="2" />
      <rect x="5" y="8" width="2" height="2" />
      <rect x="3" y="10" width="2" height="2" />
      <rect x="5" y="12" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Stack - layered items */
export function IconStack({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Top layer */}
      <rect x="4" y="1" width="8" height="2" />
      <rect x="3" y="3" width="10" height="1" opacity="0.5" />
      {/* Middle layer */}
      <rect x="3" y="5" width="10" height="2" />
      <rect x="2" y="7" width="12" height="1" opacity="0.5" />
      {/* Bottom layer */}
      <rect x="2" y="9" width="12" height="2" />
      <rect x="1" y="11" width="14" height="1" opacity="0.5" />
      {/* Base */}
      <rect x="1" y="13" width="14" height="2" />
    </PixelIconBase>
  )
}

// Aliases
export const IconCircuitry = IconCpu
export const IconActivity = IconPulse
export const IconLayers = IconStack
