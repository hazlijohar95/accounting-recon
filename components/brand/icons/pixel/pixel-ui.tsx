'use client'

import { PixelIconBase, type PixelIconProps } from './pixel-core'

/**
 * UI icons - Loader, Eye, Filter, Grid, etc.
 * Built from rectangles for pixel-perfect rendering
 */

/** Loader - 8 radiating bars (animated via spin prop) */
export function IconLoader({ size = 16, className }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={true}>
      {/* 8 radiating rectangles */}
      <rect x="7" y="1" width="2" height="3" opacity="1" />
      <rect x="11" y="2" width="2" height="3" opacity="0.875" transform="rotate(45 12 4)" />
      <rect x="12" y="7" width="3" height="2" opacity="0.75" />
      <rect x="11" y="11" width="2" height="3" opacity="0.625" transform="rotate(-45 12 12)" />
      <rect x="7" y="12" width="2" height="3" opacity="0.5" />
      <rect x="3" y="11" width="2" height="3" opacity="0.375" transform="rotate(45 4 12)" />
      <rect x="1" y="7" width="3" height="2" opacity="0.25" />
      <rect x="3" y="2" width="2" height="3" opacity="0.125" transform="rotate(-45 4 4)" />
    </PixelIconBase>
  )
}

/** Loader (static - no animation) */
export function IconLoaderStatic({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="7" y="1" width="2" height="3" opacity="1" />
      <rect x="11" y="2" width="2" height="3" opacity="0.875" transform="rotate(45 12 4)" />
      <rect x="12" y="7" width="3" height="2" opacity="0.75" />
      <rect x="11" y="11" width="2" height="3" opacity="0.625" transform="rotate(-45 12 12)" />
      <rect x="7" y="12" width="2" height="3" opacity="0.5" />
      <rect x="3" y="11" width="2" height="3" opacity="0.375" transform="rotate(45 4 12)" />
      <rect x="1" y="7" width="3" height="2" opacity="0.25" />
      <rect x="3" y="2" width="2" height="3" opacity="0.125" transform="rotate(-45 4 4)" />
    </PixelIconBase>
  )
}

/** Spinner - gap spinner (animated) */
export function IconSpinner({ size = 16, className }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={true}>
      {/* Square ring with gap */}
      <rect x="5" y="1" width="6" height="2" />
      <rect x="13" y="5" width="2" height="6" />
      <rect x="5" y="13" width="6" height="2" />
      <rect x="1" y="5" width="2" height="6" />
      {/* Corners */}
      <rect x="11" y="2" width="2" height="3" />
      <rect x="11" y="11" width="2" height="3" />
      <rect x="3" y="11" width="2" height="3" />
      {/* Gap at top-left corner */}
    </PixelIconBase>
  )
}

/** Eye - visible */
export function IconEye({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Eye outline */}
      <rect x="5" y="3" width="6" height="2" />
      <rect x="3" y="5" width="2" height="2" />
      <rect x="11" y="5" width="2" height="2" />
      <rect x="1" y="7" width="2" height="2" />
      <rect x="13" y="7" width="2" height="2" />
      <rect x="3" y="9" width="2" height="2" />
      <rect x="11" y="9" width="2" height="2" />
      <rect x="5" y="11" width="6" height="2" />
      {/* Pupil */}
      <rect x="6" y="6" width="4" height="4" />
    </PixelIconBase>
  )
}

/** Eye off - hidden */
export function IconEyeOff({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Eye outline (partial) */}
      <rect x="5" y="3" width="6" height="2" />
      <rect x="11" y="5" width="2" height="2" />
      <rect x="13" y="7" width="2" height="2" />
      <rect x="11" y="9" width="2" height="2" />
      <rect x="5" y="11" width="6" height="2" />
      <rect x="3" y="9" width="2" height="2" />
      <rect x="1" y="7" width="2" height="2" />
      <rect x="3" y="5" width="2" height="2" />
      {/* Slash through */}
      <rect x="2" y="2" width="2" height="2" />
      <rect x="4" y="4" width="2" height="2" />
      <rect x="6" y="6" width="2" height="2" />
      <rect x="8" y="8" width="2" height="2" />
      <rect x="10" y="10" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Filter - funnel shape */
export function IconFilter({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="1" y="1" width="14" height="2" />
      <rect x="2" y="3" width="12" height="2" />
      <rect x="4" y="5" width="8" height="2" />
      <rect x="5" y="7" width="6" height="2" />
      <rect x="6" y="9" width="4" height="2" />
      <rect x="7" y="11" width="2" height="4" />
    </PixelIconBase>
  )
}

/** Sort ascending - A to Z with arrow */
export function IconSortAsc({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Bars increasing */}
      <rect x="1" y="12" width="3" height="2" />
      <rect x="1" y="8" width="5" height="2" />
      <rect x="1" y="4" width="7" height="2" />
      {/* Up arrow */}
      <rect x="11" y="4" width="2" height="10" />
      <rect x="9" y="6" width="2" height="2" />
      <rect x="13" y="6" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Sort descending - Z to A with arrow */
export function IconSortDesc({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Bars decreasing */}
      <rect x="1" y="4" width="3" height="2" />
      <rect x="1" y="8" width="5" height="2" />
      <rect x="1" y="12" width="7" height="2" />
      {/* Down arrow */}
      <rect x="11" y="2" width="2" height="10" />
      <rect x="9" y="10" width="2" height="2" />
      <rect x="13" y="10" width="2" height="2" />
    </PixelIconBase>
  )
}

/** List view */
export function IconList({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="1" y="2" width="2" height="2" />
      <rect x="5" y="2" width="10" height="2" />
      <rect x="1" y="7" width="2" height="2" />
      <rect x="5" y="7" width="10" height="2" />
      <rect x="1" y="12" width="2" height="2" />
      <rect x="5" y="12" width="10" height="2" />
    </PixelIconBase>
  )
}

/** List with bullets */
export function IconListBullets({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="1" y="2" width="3" height="3" />
      <rect x="6" y="3" width="9" height="2" />
      <rect x="1" y="7" width="3" height="3" />
      <rect x="6" y="8" width="9" height="2" />
      <rect x="1" y="12" width="3" height="3" />
      <rect x="6" y="13" width="9" height="2" />
    </PixelIconBase>
  )
}

/** Grid view - 2x2 */
export function IconGrid({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="1" y="1" width="6" height="6" />
      <rect x="9" y="1" width="6" height="6" />
      <rect x="1" y="9" width="6" height="6" />
      <rect x="9" y="9" width="6" height="6" />
    </PixelIconBase>
  )
}

/** Rows view */
export function IconRows({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="1" y="1" width="14" height="4" />
      <rect x="1" y="6" width="14" height="4" />
      <rect x="1" y="11" width="14" height="4" />
    </PixelIconBase>
  )
}

/** Columns view */
export function IconColumns({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="1" y="1" width="4" height="14" />
      <rect x="6" y="1" width="4" height="14" />
      <rect x="11" y="1" width="4" height="14" />
    </PixelIconBase>
  )
}

/** Sidebar */
export function IconSidebar({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Frame */}
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="1" width="2" height="14" />
      <rect x="13" y="1" width="2" height="14" />
      {/* Sidebar divider */}
      <rect x="5" y="3" width="2" height="10" />
    </PixelIconBase>
  )
}

/** Layout */
export function IconLayout({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Frame */}
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="1" width="2" height="14" />
      <rect x="13" y="1" width="2" height="14" />
      {/* Horizontal divider */}
      <rect x="1" y="5" width="14" height="2" />
      {/* Vertical divider */}
      <rect x="7" y="7" width="2" height="6" />
    </PixelIconBase>
  )
}

/** Sun - light theme */
export function IconSun({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Center */}
      <rect x="6" y="6" width="4" height="4" />
      {/* Rays */}
      <rect x="7" y="1" width="2" height="3" />
      <rect x="7" y="12" width="2" height="3" />
      <rect x="1" y="7" width="3" height="2" />
      <rect x="12" y="7" width="3" height="2" />
      {/* Diagonal rays */}
      <rect x="2" y="2" width="2" height="2" />
      <rect x="12" y="2" width="2" height="2" />
      <rect x="2" y="12" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Moon - dark theme */
export function IconMoon({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Crescent shape */}
      <rect x="4" y="1" width="6" height="2" />
      <rect x="2" y="3" width="2" height="4" />
      <rect x="10" y="3" width="2" height="2" />
      <rect x="2" y="9" width="2" height="4" />
      <rect x="4" y="13" width="6" height="2" />
      <rect x="10" y="11" width="2" height="2" />
      {/* Inner cutout effect */}
      <rect x="8" y="5" width="4" height="2" opacity="0.3" />
      <rect x="10" y="7" width="2" height="2" opacity="0.3" />
      <rect x="8" y="9" width="4" height="2" opacity="0.3" />
    </PixelIconBase>
  )
}

/** Desktop monitor */
export function IconDesktop({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Monitor */}
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="9" width="14" height="2" />
      <rect x="1" y="1" width="2" height="10" />
      <rect x="13" y="1" width="2" height="10" />
      {/* Stand */}
      <rect x="7" y="11" width="2" height="2" />
      <rect x="5" y="13" width="6" height="2" />
    </PixelIconBase>
  )
}

/** Laptop */
export function IconLaptop({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Screen */}
      <rect x="2" y="1" width="12" height="2" />
      <rect x="2" y="9" width="12" height="2" />
      <rect x="2" y="1" width="2" height="10" />
      <rect x="12" y="1" width="2" height="10" />
      {/* Base */}
      <rect x="1" y="11" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
    </PixelIconBase>
  )
}

/** Mobile phone */
export function IconMobile({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Frame */}
      <rect x="4" y="1" width="8" height="2" />
      <rect x="4" y="13" width="8" height="2" />
      <rect x="4" y="1" width="2" height="14" />
      <rect x="10" y="1" width="2" height="14" />
      {/* Speaker */}
      <rect x="6" y="2" width="4" height="1" opacity="0.5" />
      {/* Home button */}
      <rect x="7" y="12" width="2" height="2" opacity="0.5" />
    </PixelIconBase>
  )
}

/** Maximize - expand */
export function IconMaximize({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Top-left corner */}
      <rect x="1" y="1" width="5" height="2" />
      <rect x="1" y="1" width="2" height="5" />
      {/* Top-right corner */}
      <rect x="10" y="1" width="5" height="2" />
      <rect x="13" y="1" width="2" height="5" />
      {/* Bottom-left corner */}
      <rect x="1" y="13" width="5" height="2" />
      <rect x="1" y="10" width="2" height="5" />
      {/* Bottom-right corner */}
      <rect x="10" y="13" width="5" height="2" />
      <rect x="13" y="10" width="2" height="5" />
    </PixelIconBase>
  )
}

/** Minimize - collapse */
export function IconMinimize({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Top-left arrows pointing inward */}
      <rect x="1" y="4" width="2" height="2" />
      <rect x="3" y="2" width="2" height="2" />
      <rect x="4" y="1" width="2" height="2" />
      {/* Top-right */}
      <rect x="13" y="4" width="2" height="2" />
      <rect x="11" y="2" width="2" height="2" />
      <rect x="10" y="1" width="2" height="2" />
      {/* Bottom-left */}
      <rect x="1" y="10" width="2" height="2" />
      <rect x="3" y="12" width="2" height="2" />
      <rect x="4" y="13" width="2" height="2" />
      {/* Bottom-right */}
      <rect x="13" y="10" width="2" height="2" />
      <rect x="11" y="12" width="2" height="2" />
      <rect x="10" y="13" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Expand arrows outward */
export function IconExpand({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Diagonal lines */}
      <rect x="2" y="2" width="2" height="2" />
      <rect x="4" y="4" width="2" height="2" />
      <rect x="12" y="2" width="2" height="2" />
      <rect x="10" y="4" width="2" height="2" />
      <rect x="2" y="12" width="2" height="2" />
      <rect x="4" y="10" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
      <rect x="10" y="10" width="2" height="2" />
      {/* Corner arrows */}
      <rect x="1" y="1" width="4" height="2" />
      <rect x="1" y="1" width="2" height="4" />
      <rect x="11" y="1" width="4" height="2" />
      <rect x="13" y="1" width="2" height="4" />
      <rect x="1" y="13" width="4" height="2" />
      <rect x="1" y="11" width="2" height="4" />
      <rect x="11" y="13" width="4" height="2" />
      <rect x="13" y="11" width="2" height="4" />
    </PixelIconBase>
  )
}

/** Collapse arrows inward */
export function IconCollapse({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Center plus */}
      <rect x="7" y="5" width="2" height="6" />
      <rect x="5" y="7" width="6" height="2" />
      {/* Inward arrows */}
      <rect x="2" y="2" width="2" height="2" />
      <rect x="4" y="4" width="2" height="2" />
      <rect x="12" y="2" width="2" height="2" />
      <rect x="10" y="4" width="2" height="2" />
      <rect x="2" y="12" width="2" height="2" />
      <rect x="4" y="10" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
      <rect x="10" y="10" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Text align left */
export function IconAlignLeft({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="1" y="2" width="14" height="2" />
      <rect x="1" y="6" width="10" height="2" />
      <rect x="1" y="10" width="12" height="2" />
      <rect x="1" y="14" width="8" height="2" />
    </PixelIconBase>
  )
}

/** Text align center */
export function IconAlignCenter({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="1" y="2" width="14" height="2" />
      <rect x="3" y="6" width="10" height="2" />
      <rect x="2" y="10" width="12" height="2" />
      <rect x="4" y="14" width="8" height="2" />
    </PixelIconBase>
  )
}

/** Text align right */
export function IconAlignRight({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="1" y="2" width="14" height="2" />
      <rect x="5" y="6" width="10" height="2" />
      <rect x="3" y="10" width="12" height="2" />
      <rect x="7" y="14" width="8" height="2" />
    </PixelIconBase>
  )
}

/** Text T */
export function IconText({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="2" y="2" width="12" height="2" />
      <rect x="7" y="2" width="2" height="12" />
    </PixelIconBase>
  )
}

/** Text Aa */
export function IconTextAa({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Big A */}
      <rect x="1" y="2" width="2" height="12" />
      <rect x="1" y="2" width="6" height="2" />
      <rect x="5" y="2" width="2" height="12" />
      <rect x="1" y="8" width="6" height="2" />
      {/* Small a */}
      <rect x="9" y="6" width="6" height="2" />
      <rect x="9" y="12" width="6" height="2" />
      <rect x="9" y="6" width="2" height="8" />
      <rect x="13" y="6" width="2" height="8" />
    </PixelIconBase>
  )
}

/** Zoom in */
export function IconZoomIn({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Magnifying glass */}
      <rect x="2" y="1" width="8" height="2" />
      <rect x="2" y="9" width="8" height="2" />
      <rect x="1" y="2" width="2" height="8" />
      <rect x="9" y="2" width="2" height="8" />
      {/* Handle */}
      <rect x="9" y="9" width="2" height="2" />
      <rect x="11" y="11" width="2" height="2" />
      <rect x="13" y="13" width="2" height="2" />
      {/* Plus inside */}
      <rect x="5" y="4" width="2" height="4" />
      <rect x="4" y="5" width="4" height="2" />
    </PixelIconBase>
  )
}

/** Zoom out */
export function IconZoomOut({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Magnifying glass */}
      <rect x="2" y="1" width="8" height="2" />
      <rect x="2" y="9" width="8" height="2" />
      <rect x="1" y="2" width="2" height="8" />
      <rect x="9" y="2" width="2" height="8" />
      {/* Handle */}
      <rect x="9" y="9" width="2" height="2" />
      <rect x="11" y="11" width="2" height="2" />
      <rect x="13" y="13" width="2" height="2" />
      {/* Minus inside */}
      <rect x="4" y="5" width="4" height="2" />
    </PixelIconBase>
  )
}

/** Dropdown caret */
export function IconDropdown({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Circle */}
      <rect x="4" y="1" width="8" height="2" />
      <rect x="4" y="13" width="8" height="2" />
      <rect x="1" y="4" width="2" height="8" />
      <rect x="13" y="4" width="2" height="8" />
      <rect x="2" y="2" width="2" height="2" />
      <rect x="12" y="2" width="2" height="2" />
      <rect x="2" y="12" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
      {/* Down caret */}
      <rect x="4" y="6" width="2" height="2" />
      <rect x="6" y="8" width="2" height="2" />
      <rect x="8" y="8" width="2" height="2" />
      <rect x="10" y="6" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Play button */
export function IconPlay({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="4" y="2" width="2" height="12" />
      <rect x="6" y="4" width="2" height="8" />
      <rect x="8" y="5" width="2" height="6" />
      <rect x="10" y="6" width="2" height="4" />
      <rect x="12" y="7" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Pause button */
export function IconPause({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="3" y="2" width="4" height="12" />
      <rect x="9" y="2" width="4" height="12" />
    </PixelIconBase>
  )
}

/** Stop button */
export function IconStop({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="3" y="3" width="10" height="10" />
    </PixelIconBase>
  )
}

/** Skip forward */
export function IconSkipForward({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Play triangle */}
      <rect x="2" y="2" width="2" height="12" />
      <rect x="4" y="4" width="2" height="8" />
      <rect x="6" y="5" width="2" height="6" />
      <rect x="8" y="6" width="2" height="4" />
      {/* End bar */}
      <rect x="12" y="2" width="2" height="12" />
    </PixelIconBase>
  )
}

/** Skip back */
export function IconSkipBack({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Start bar */}
      <rect x="2" y="2" width="2" height="12" />
      {/* Play triangle (reversed) */}
      <rect x="12" y="2" width="2" height="12" />
      <rect x="10" y="4" width="2" height="8" />
      <rect x="8" y="5" width="2" height="6" />
      <rect x="6" y="6" width="2" height="4" />
    </PixelIconBase>
  )
}

/** Volume on - speaker with waves */
export function IconVolumeOn({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Speaker */}
      <rect x="1" y="5" width="3" height="6" />
      <rect x="4" y="4" width="2" height="8" />
      <rect x="6" y="2" width="2" height="12" />
      {/* Sound waves */}
      <rect x="10" y="5" width="2" height="6" opacity="0.6" />
      <rect x="12" y="3" width="2" height="10" opacity="0.4" />
      <rect x="14" y="1" width="2" height="14" opacity="0.2" />
    </PixelIconBase>
  )
}

/** Volume off - speaker with X */
export function IconVolumeOff({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Speaker */}
      <rect x="1" y="5" width="3" height="6" />
      <rect x="4" y="4" width="2" height="8" />
      <rect x="6" y="2" width="2" height="12" />
      {/* X mark */}
      <rect x="10" y="5" width="2" height="2" />
      <rect x="12" y="7" width="2" height="2" />
      <rect x="14" y="9" width="2" height="2" />
      <rect x="14" y="5" width="2" height="2" />
      <rect x="10" y="9" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Power button */
export function IconPower({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Circle (broken at top) */}
      <rect x="3" y="4" width="2" height="6" />
      <rect x="11" y="4" width="2" height="6" />
      <rect x="4" y="10" width="2" height="3" />
      <rect x="10" y="10" width="2" height="3" />
      <rect x="5" y="12" width="6" height="2" />
      {/* Power line */}
      <rect x="7" y="1" width="2" height="7" />
    </PixelIconBase>
  )
}

/** Lightning bolt */
export function IconLightning({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="7" y="1" width="5" height="2" />
      <rect x="6" y="3" width="4" height="2" />
      <rect x="5" y="5" width="3" height="2" />
      <rect x="4" y="7" width="8" height="2" />
      <rect x="7" y="9" width="3" height="2" />
      <rect x="6" y="11" width="3" height="2" />
      <rect x="5" y="13" width="3" height="2" />
    </PixelIconBase>
  )
}

/** Panel collapsing left */
export function IconPanelCollapse({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Panel frame */}
      <rect x="1" y="1" width="2" height="14" />
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="13" y="1" width="2" height="14" />
      {/* Divider */}
      <rect x="5" y="3" width="2" height="10" opacity="0.4" />
      {/* Arrow pointing left */}
      <rect x="8" y="7" width="4" height="2" />
      <rect x="8" y="5" width="2" height="2" />
      <rect x="8" y="9" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Panel expanding right */
export function IconPanelExpand({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Panel frame */}
      <rect x="1" y="1" width="2" height="14" />
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="13" y="1" width="2" height="14" />
      {/* Divider */}
      <rect x="5" y="3" width="2" height="10" opacity="0.4" />
      {/* Arrow pointing right */}
      <rect x="8" y="7" width="4" height="2" />
      <rect x="10" y="5" width="2" height="2" />
      <rect x="10" y="9" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Demo mode indicator - stylized "D" */
export function IconDemo({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Stylized D made of rectangles */}
      <rect x="3" y="2" width="3" height="12" />
      <rect x="6" y="2" width="5" height="3" />
      <rect x="6" y="11" width="5" height="3" />
      <rect x="10" y="4" width="3" height="8" />
    </PixelIconBase>
  )
}

/** Real mode indicator - stylized "R" (mini version of logo) */
export function IconReal({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Mini R matching the brand logo */}
      <rect x="2" y="2" width="3" height="12" />
      <rect x="5" y="2" width="6" height="3" />
      <rect x="10" y="2" width="3" height="4" />
      <rect x="5" y="6" width="6" height="3" />
      <rect x="8" y="9" width="3" height="2" />
      <rect x="10" y="11" width="4" height="3" />
    </PixelIconBase>
  )
}

/** Switch/toggle indicator */
export function IconSwitch({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Track */}
      <rect x="1" y="5" width="14" height="6" opacity="0.3" />
      {/* Knob */}
      <rect x="9" y="4" width="5" height="8" />
    </PixelIconBase>
  )
}

/** Dashboard - 4 squares in a 2x2 grid */
export function IconDashboard({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Top-left square */}
      <rect x="1" y="1" width="6" height="6" />
      {/* Top-right square */}
      <rect x="9" y="1" width="6" height="6" />
      {/* Bottom-left square */}
      <rect x="1" y="9" width="6" height="6" />
      {/* Bottom-right square */}
      <rect x="9" y="9" width="6" height="6" />
    </PixelIconBase>
  )
}

/** Reconcile - two overlapping documents */
export function IconReconcile({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Left document */}
      <rect x="1" y="1" width="8" height="11" opacity="0.5" />
      {/* Right document (overlapping) */}
      <rect x="7" y="4" width="8" height="11" />
    </PixelIconBase>
  )
}

/** Reports - document with horizontal lines */
export function IconReports({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Document outline */}
      <rect x="2" y="1" width="12" height="14" opacity="0.2" />
      {/* Left edge */}
      <rect x="2" y="1" width="2" height="14" />
      {/* Top edge */}
      <rect x="2" y="1" width="12" height="2" />
      {/* Bottom edge */}
      <rect x="2" y="13" width="12" height="2" />
      {/* Right edge */}
      <rect x="12" y="1" width="2" height="14" />
      {/* Text lines */}
      <rect x="4" y="4" width="8" height="2" />
      <rect x="4" y="7" width="6" height="2" />
      <rect x="4" y="10" width="7" height="2" />
    </PixelIconBase>
  )
}

// Aliases for compatibility
export const IconLoader2 = IconLoader
export const IconEyeClosed = IconEyeOff
export const IconPanelLeft = IconSidebar
export const IconZap = IconLightning
