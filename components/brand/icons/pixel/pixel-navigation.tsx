'use client'

import { PixelIconBase, type PixelIconProps } from './pixel-core'

/**
 * Navigation icons - Carets, Arrows, etc.
 * Built from rectangles for pixel-perfect rendering
 */

/** Caret pointing down */
export function IconCaretDown({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="2" y="5" width="3" height="2" />
      <rect x="4" y="7" width="2" height="2" />
      <rect x="6" y="9" width="2" height="2" />
      <rect x="8" y="9" width="2" height="2" />
      <rect x="10" y="7" width="2" height="2" />
      <rect x="11" y="5" width="3" height="2" />
    </PixelIconBase>
  )
}

/** Caret pointing up */
export function IconCaretUp({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="2" y="9" width="3" height="2" />
      <rect x="4" y="7" width="2" height="2" />
      <rect x="6" y="5" width="2" height="2" />
      <rect x="8" y="5" width="2" height="2" />
      <rect x="10" y="7" width="2" height="2" />
      <rect x="11" y="9" width="3" height="2" />
    </PixelIconBase>
  )
}

/** Caret pointing left */
export function IconCaretLeft({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="9" y="2" width="2" height="3" />
      <rect x="7" y="4" width="2" height="2" />
      <rect x="5" y="6" width="2" height="2" />
      <rect x="5" y="8" width="2" height="2" />
      <rect x="7" y="10" width="2" height="2" />
      <rect x="9" y="11" width="2" height="3" />
    </PixelIconBase>
  )
}

/** Caret pointing right */
export function IconCaretRight({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="5" y="2" width="2" height="3" />
      <rect x="7" y="4" width="2" height="2" />
      <rect x="9" y="6" width="2" height="2" />
      <rect x="9" y="8" width="2" height="2" />
      <rect x="7" y="10" width="2" height="2" />
      <rect x="5" y="11" width="2" height="3" />
    </PixelIconBase>
  )
}

/** Double caret left - pagination first */
export function IconCaretDoubleLeft({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* First caret */}
      <rect x="11" y="3" width="2" height="2" />
      <rect x="9" y="5" width="2" height="2" />
      <rect x="7" y="7" width="2" height="2" />
      <rect x="9" y="9" width="2" height="2" />
      <rect x="11" y="11" width="2" height="2" />
      {/* Second caret */}
      <rect x="6" y="3" width="2" height="2" />
      <rect x="4" y="5" width="2" height="2" />
      <rect x="2" y="7" width="2" height="2" />
      <rect x="4" y="9" width="2" height="2" />
      <rect x="6" y="11" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Double caret right - pagination last */
export function IconCaretDoubleRight({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* First caret */}
      <rect x="3" y="3" width="2" height="2" />
      <rect x="5" y="5" width="2" height="2" />
      <rect x="7" y="7" width="2" height="2" />
      <rect x="5" y="9" width="2" height="2" />
      <rect x="3" y="11" width="2" height="2" />
      {/* Second caret */}
      <rect x="8" y="3" width="2" height="2" />
      <rect x="10" y="5" width="2" height="2" />
      <rect x="12" y="7" width="2" height="2" />
      <rect x="10" y="9" width="2" height="2" />
      <rect x="8" y="11" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Arrow pointing right */
export function IconArrowRight({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Shaft */}
      <rect x="2" y="7" width="10" height="2" />
      {/* Head */}
      <rect x="9" y="4" width="2" height="3" />
      <rect x="9" y="9" width="2" height="3" />
      <rect x="11" y="5" width="2" height="2" />
      <rect x="11" y="9" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Arrow pointing left */
export function IconArrowLeft({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Shaft */}
      <rect x="4" y="7" width="10" height="2" />
      {/* Head */}
      <rect x="5" y="4" width="2" height="3" />
      <rect x="5" y="9" width="2" height="3" />
      <rect x="3" y="5" width="2" height="2" />
      <rect x="3" y="9" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Arrow pointing down */
export function IconArrowDown({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Shaft */}
      <rect x="7" y="2" width="2" height="10" />
      {/* Head */}
      <rect x="4" y="9" width="3" height="2" />
      <rect x="9" y="9" width="3" height="2" />
      <rect x="5" y="11" width="2" height="2" />
      <rect x="9" y="11" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Arrow pointing up */
export function IconArrowUp({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Shaft */}
      <rect x="7" y="4" width="2" height="10" />
      {/* Head */}
      <rect x="4" y="5" width="3" height="2" />
      <rect x="9" y="5" width="3" height="2" />
      <rect x="5" y="3" width="2" height="2" />
      <rect x="9" y="3" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Arrow up-right (diagonal) - for credits/positive */
export function IconArrowUpRight({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Diagonal shaft */}
      <rect x="4" y="11" width="2" height="2" />
      <rect x="6" y="9" width="2" height="2" />
      <rect x="8" y="7" width="2" height="2" />
      <rect x="10" y="5" width="2" height="2" />
      {/* Arrow head */}
      <rect x="8" y="2" width="6" height="2" />
      <rect x="12" y="2" width="2" height="6" />
    </PixelIconBase>
  )
}

/** Arrow down-left (diagonal) - for debits/negative */
export function IconArrowDownLeft({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Diagonal shaft */}
      <rect x="10" y="3" width="2" height="2" />
      <rect x="8" y="5" width="2" height="2" />
      <rect x="6" y="7" width="2" height="2" />
      <rect x="4" y="9" width="2" height="2" />
      {/* Arrow head */}
      <rect x="2" y="12" width="6" height="2" />
      <rect x="2" y="8" width="2" height="6" />
    </PixelIconBase>
  )
}

/** Refresh - circular arrows */
export function IconRefresh({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Top arc */}
      <rect x="5" y="1" width="6" height="2" />
      <rect x="11" y="3" width="2" height="4" />
      {/* Top arrow head */}
      <rect x="11" y="1" width="4" height="2" />
      <rect x="13" y="3" width="2" height="2" />
      {/* Bottom arc */}
      <rect x="5" y="13" width="6" height="2" />
      <rect x="3" y="9" width="2" height="4" />
      {/* Bottom arrow head */}
      <rect x="1" y="13" width="4" height="2" />
      <rect x="1" y="11" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Undo - counter-clockwise arrow */
export function IconUndo({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Arc */}
      <rect x="3" y="3" width="2" height="4" />
      <rect x="5" y="1" width="6" height="2" />
      <rect x="11" y="3" width="2" height="4" />
      <rect x="5" y="7" width="8" height="2" />
      {/* Arrow head */}
      <rect x="1" y="1" width="4" height="2" />
      <rect x="1" y="3" width="2" height="2" />
      {/* Bottom connection */}
      <rect x="5" y="9" width="2" height="5" />
      <rect x="5" y="12" width="6" height="2" />
    </PixelIconBase>
  )
}

/** External link - arrow pointing out of box */
export function IconExternalLink({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Box (L-shape) */}
      <rect x="1" y="5" width="2" height="10" />
      <rect x="1" y="13" width="10" height="2" />
      <rect x="9" y="9" width="2" height="6" />
      <rect x="1" y="5" width="5" height="2" />
      {/* Diagonal arrow */}
      <rect x="7" y="7" width="2" height="2" />
      <rect x="9" y="5" width="2" height="2" />
      <rect x="11" y="3" width="2" height="2" />
      {/* Arrow head */}
      <rect x="9" y="1" width="6" height="2" />
      <rect x="13" y="1" width="2" height="6" />
    </PixelIconBase>
  )
}

// Aliases for chevron compatibility
export const IconChevronDown = IconCaretDown
export const IconChevronUp = IconCaretUp
export const IconChevronLeft = IconCaretLeft
export const IconChevronRight = IconCaretRight
export const IconChevronsLeft = IconCaretDoubleLeft
export const IconChevronsRight = IconCaretDoubleRight
