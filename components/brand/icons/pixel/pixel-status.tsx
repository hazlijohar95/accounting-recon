'use client'

import { PixelIconBase, type PixelIconProps } from './pixel-core'

/**
 * Status icons - CheckCircle, XCircle, WarningCircle, Info, etc.
 * Square containers replace circles for pixel aesthetic
 */

/** Success - square with checkmark */
export function IconCheckCircle({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Square container */}
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="1" width="2" height="14" />
      <rect x="13" y="1" width="2" height="14" />
      {/* Checkmark */}
      <rect x="4" y="8" width="2" height="2" />
      <rect x="6" y="10" width="2" height="2" />
      <rect x="8" y="8" width="2" height="2" />
      <rect x="10" y="6" width="2" height="2" />
      <rect x="12" y="4" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Error - square with X */
export function IconXCircle({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Square container */}
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="1" width="2" height="14" />
      <rect x="13" y="1" width="2" height="14" />
      {/* X mark */}
      <rect x="4" y="5" width="2" height="2" />
      <rect x="6" y="7" width="2" height="2" />
      <rect x="8" y="9" width="2" height="2" />
      <rect x="10" y="11" width="2" height="2" />
      <rect x="10" y="5" width="2" height="2" />
      <rect x="8" y="7" width="2" height="2" />
      <rect x="4" y="11" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Warning - square with exclamation */
export function IconWarningCircle({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Square container */}
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="1" width="2" height="14" />
      <rect x="13" y="1" width="2" height="14" />
      {/* Exclamation mark */}
      <rect x="7" y="4" width="2" height="5" />
      <rect x="7" y="11" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Info - square with i symbol */
export function IconInfo({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Square container */}
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="1" width="2" height="14" />
      <rect x="13" y="1" width="2" height="14" />
      {/* Info i - dot */}
      <rect x="7" y="4" width="2" height="2" />
      {/* Info i - stem */}
      <rect x="7" y="7" width="2" height="5" />
    </PixelIconBase>
  )
}

/** Question - square with ? symbol */
export function IconQuestion({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Square container */}
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="1" width="2" height="14" />
      <rect x="13" y="1" width="2" height="14" />
      {/* Question mark */}
      <rect x="5" y="4" width="6" height="2" />
      <rect x="9" y="4" width="2" height="3" />
      <rect x="7" y="7" width="2" height="2" />
      <rect x="7" y="11" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Warning triangle - exclamation in triangle shape */
export function IconWarning({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Triangle outline - built around exclamation mark */}
      <rect x="7" y="1" width="2" height="2" />
      <rect x="6" y="3" width="4" height="2" />
      {/* Left side of triangle around exclamation */}
      <rect x="5" y="5" width="2" height="4" />
      <rect x="4" y="7" width="3" height="4" />
      <rect x="3" y="9" width="4" height="4" />
      <rect x="2" y="11" width="5" height="2" />
      {/* Right side of triangle around exclamation */}
      <rect x="9" y="5" width="2" height="4" />
      <rect x="9" y="7" width="3" height="4" />
      <rect x="9" y="9" width="4" height="4" />
      <rect x="9" y="11" width="5" height="2" />
      {/* Base of triangle */}
      <rect x="1" y="13" width="14" height="2" />
      {/* Exclamation mark - separate from triangle */}
      <rect x="7" y="5" width="2" height="4" opacity="0.2" />
      <rect x="7" y="11" width="2" height="2" opacity="0.2" />
    </PixelIconBase>
  )
}

/** Prohibit - square with diagonal line */
export function IconProhibit({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Square container */}
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="1" width="2" height="14" />
      <rect x="13" y="1" width="2" height="14" />
      {/* Diagonal line */}
      <rect x="3" y="3" width="2" height="2" />
      <rect x="5" y="5" width="2" height="2" />
      <rect x="7" y="7" width="2" height="2" />
      <rect x="9" y="9" width="2" height="2" />
      <rect x="11" y="11" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Shield with check - security verified */
export function IconShieldCheck({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Shield shape */}
      <rect x="2" y="1" width="12" height="2" />
      <rect x="1" y="1" width="2" height="8" />
      <rect x="13" y="1" width="2" height="8" />
      <rect x="2" y="9" width="2" height="3" />
      <rect x="12" y="9" width="2" height="3" />
      <rect x="4" y="11" width="2" height="2" />
      <rect x="10" y="11" width="2" height="2" />
      <rect x="6" y="13" width="4" height="2" />
      {/* Checkmark */}
      <rect x="4" y="6" width="2" height="2" />
      <rect x="6" y="8" width="2" height="2" />
      <rect x="8" y="6" width="2" height="2" />
      <rect x="10" y="4" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Shield with warning - security alert */
export function IconShieldWarning({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Shield shape */}
      <rect x="2" y="1" width="12" height="2" />
      <rect x="1" y="1" width="2" height="8" />
      <rect x="13" y="1" width="2" height="8" />
      <rect x="2" y="9" width="2" height="3" />
      <rect x="12" y="9" width="2" height="3" />
      <rect x="4" y="11" width="2" height="2" />
      <rect x="10" y="11" width="2" height="2" />
      <rect x="6" y="13" width="4" height="2" />
      {/* Exclamation */}
      <rect x="7" y="4" width="2" height="4" />
      <rect x="7" y="10" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Clock - square with hands */
export function IconClock({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Square face */}
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="1" width="2" height="14" />
      <rect x="13" y="1" width="2" height="14" />
      {/* Center dot */}
      <rect x="7" y="7" width="2" height="2" />
      {/* Hour hand (pointing up) */}
      <rect x="7" y="4" width="2" height="3" />
      {/* Minute hand (pointing right) */}
      <rect x="9" y="7" width="3" height="2" />
    </PixelIconBase>
  )
}

/** Hourglass - time passing */
export function IconHourglass({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Top frame */}
      <rect x="2" y="1" width="12" height="2" />
      {/* Top bulb */}
      <rect x="3" y="3" width="10" height="2" opacity="0.5" />
      <rect x="4" y="5" width="8" height="2" opacity="0.5" />
      {/* Neck */}
      <rect x="7" y="6" width="2" height="4" />
      {/* Bottom bulb */}
      <rect x="4" y="10" width="8" height="2" />
      <rect x="3" y="11" width="10" height="2" />
      {/* Bottom frame */}
      <rect x="2" y="13" width="12" height="2" />
    </PixelIconBase>
  )
}

/** Checkbox checked */
export function IconCheckSquare({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Square */}
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="1" width="2" height="14" />
      <rect x="13" y="1" width="2" height="14" />
      {/* Fill */}
      <rect x="3" y="3" width="10" height="10" opacity="0.2" />
      {/* Check */}
      <rect x="4" y="8" width="2" height="2" />
      <rect x="6" y="10" width="2" height="2" />
      <rect x="8" y="8" width="2" height="2" />
      <rect x="10" y="6" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Empty checkbox */
export function IconSquare({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="1" width="2" height="14" />
      <rect x="13" y="1" width="2" height="14" />
    </PixelIconBase>
  )
}

/** Circle - rendered as octagon for pixel style */
export function IconCircle({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Octagonal shape */}
      <rect x="4" y="1" width="8" height="2" />
      <rect x="4" y="13" width="8" height="2" />
      <rect x="1" y="4" width="2" height="8" />
      <rect x="13" y="4" width="2" height="8" />
      {/* Corner fills */}
      <rect x="2" y="2" width="2" height="2" />
      <rect x="12" y="2" width="2" height="2" />
      <rect x="2" y="12" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Bug - debug icon */
export function IconBug({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Body */}
      <rect x="5" y="5" width="6" height="8" />
      {/* Head */}
      <rect x="6" y="2" width="4" height="3" />
      {/* Antennae */}
      <rect x="4" y="1" width="2" height="2" />
      <rect x="10" y="1" width="2" height="2" />
      {/* Legs */}
      <rect x="2" y="6" width="3" height="2" />
      <rect x="11" y="6" width="3" height="2" />
      <rect x="2" y="9" width="3" height="2" />
      <rect x="11" y="9" width="3" height="2" />
      <rect x="3" y="12" width="2" height="2" />
      <rect x="11" y="12" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Trend up - arrow going up */
export function IconTrendUp({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Upward trend line */}
      <rect x="1" y="11" width="2" height="2" />
      <rect x="3" y="9" width="2" height="2" />
      <rect x="5" y="7" width="2" height="2" />
      <rect x="7" y="9" width="2" height="2" />
      <rect x="9" y="7" width="2" height="2" />
      <rect x="11" y="5" width="2" height="2" />
      <rect x="13" y="3" width="2" height="2" />
      {/* Arrow head */}
      <rect x="11" y="2" width="4" height="2" />
      <rect x="13" y="4" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Flag - marker */
export function IconFlag({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Pole */}
      <rect x="2" y="1" width="2" height="14" />
      {/* Flag body */}
      <rect x="4" y="1" width="10" height="2" />
      <rect x="4" y="7" width="10" height="2" />
      <rect x="12" y="1" width="2" height="8" />
      {/* Flag fill */}
      <rect x="4" y="3" width="8" height="4" opacity="0.3" />
    </PixelIconBase>
  )
}

// Aliases for lucide compatibility
export const IconCheckCircle2 = IconCheckCircle
export const IconAlertCircle = IconWarningCircle
export const IconAlertTriangle = IconWarning
export const IconHelpCircle = IconQuestion
