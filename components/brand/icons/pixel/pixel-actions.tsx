'use client'

import { PixelIconBase, type PixelIconProps } from './pixel-core'

/**
 * Action icons - X, Check, Plus, Minus, Search, Trash, etc.
 * Built from rectangles for pixel-perfect rendering
 */

/** Close/dismiss - two crossed 2px rectangles */
export function IconX({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Diagonal from top-left to bottom-right */}
      <rect x="3" y="4" width="2" height="2" />
      <rect x="5" y="6" width="2" height="2" />
      <rect x="7" y="8" width="2" height="2" />
      <rect x="9" y="10" width="2" height="2" />
      <rect x="11" y="12" width="2" height="2" />
      {/* Diagonal from top-right to bottom-left */}
      <rect x="11" y="4" width="2" height="2" />
      <rect x="9" y="6" width="2" height="2" />
      <rect x="5" y="10" width="2" height="2" />
      <rect x="3" y="12" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Checkmark - angular V shape */
export function IconCheck({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Short arm going down-left */}
      <rect x="2" y="7" width="2" height="2" />
      <rect x="4" y="9" width="2" height="2" />
      {/* Long arm going up-right */}
      <rect x="6" y="7" width="2" height="2" />
      <rect x="8" y="5" width="2" height="2" />
      <rect x="10" y="3" width="2" height="2" />
      <rect x="12" y="1" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Plus sign - cross shape */
export function IconPlus({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Vertical bar */}
      <rect x="7" y="2" width="2" height="12" />
      {/* Horizontal bar */}
      <rect x="2" y="7" width="12" height="2" />
    </PixelIconBase>
  )
}

/** Minus sign - horizontal bar */
export function IconMinus({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="2" y="7" width="12" height="2" />
    </PixelIconBase>
  )
}

/** Search/magnifying glass - square with handle */
export function IconSearch({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Lens frame */}
      <rect x="2" y="1" width="8" height="2" />
      <rect x="2" y="9" width="8" height="2" />
      <rect x="1" y="2" width="2" height="8" />
      <rect x="9" y="2" width="2" height="8" />
      {/* Handle (diagonal) */}
      <rect x="9" y="9" width="2" height="2" />
      <rect x="11" y="11" width="2" height="2" />
      <rect x="13" y="13" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Trash can - container with lines */
export function IconTrash({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Lid */}
      <rect x="2" y="2" width="12" height="2" />
      <rect x="6" y="1" width="4" height="2" />
      {/* Can body */}
      <rect x="3" y="4" width="2" height="10" />
      <rect x="11" y="4" width="2" height="10" />
      <rect x="3" y="12" width="10" height="2" />
      {/* Inner lines */}
      <rect x="6" y="6" width="1" height="5" opacity="0.5" />
      <rect x="9" y="6" width="1" height="5" opacity="0.5" />
    </PixelIconBase>
  )
}

/** Edit/pencil - angled rectangle */
export function IconEdit({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Pencil body (diagonal) */}
      <rect x="10" y="1" width="2" height="2" />
      <rect x="8" y="3" width="4" height="2" />
      <rect x="6" y="5" width="4" height="2" />
      <rect x="4" y="7" width="4" height="2" />
      <rect x="2" y="9" width="4" height="2" />
      {/* Tip */}
      <rect x="1" y="11" width="3" height="3" />
      {/* Eraser */}
      <rect x="11" y="2" width="3" height="3" opacity="0.5" />
    </PixelIconBase>
  )
}

/** Copy - two overlapping documents */
export function IconCopy({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Back document */}
      <rect x="4" y="1" width="10" height="2" />
      <rect x="4" y="1" width="2" height="10" />
      <rect x="12" y="1" width="2" height="10" />
      <rect x="4" y="9" width="5" height="2" opacity="0.4" />
      {/* Front document */}
      <rect x="1" y="5" width="10" height="2" />
      <rect x="1" y="5" width="2" height="10" />
      <rect x="9" y="5" width="2" height="10" />
      <rect x="1" y="13" width="10" height="2" />
    </PixelIconBase>
  )
}

/** Eraser - angled block */
export function IconEraser({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Eraser body */}
      <rect x="2" y="9" width="8" height="4" />
      <rect x="5" y="6" width="8" height="4" />
      {/* Rubber part */}
      <rect x="2" y="9" width="4" height="4" opacity="0.5" />
      {/* Base line */}
      <rect x="1" y="13" width="14" height="2" />
    </PixelIconBase>
  )
}

/** Download - arrow pointing down into tray */
export function IconDownload({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Arrow shaft */}
      <rect x="7" y="1" width="2" height="8" />
      {/* Arrow head */}
      <rect x="5" y="7" width="2" height="2" />
      <rect x="9" y="7" width="2" height="2" />
      <rect x="3" y="9" width="4" height="2" />
      <rect x="9" y="9" width="4" height="2" />
      {/* Tray */}
      <rect x="1" y="11" width="2" height="4" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="13" y="11" width="2" height="4" />
    </PixelIconBase>
  )
}

/** Upload - arrow pointing up from tray */
export function IconUpload({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Tray */}
      <rect x="1" y="11" width="2" height="4" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="13" y="11" width="2" height="4" />
      {/* Arrow head (upward chevron) */}
      <rect x="3" y="6" width="3" height="2" />
      <rect x="5" y="4" width="2" height="2" />
      <rect x="7" y="2" width="2" height="2" />
      <rect x="9" y="4" width="2" height="2" />
      <rect x="10" y="6" width="3" height="2" />
      {/* Arrow shaft */}
      <rect x="7" y="6" width="2" height="5" />
    </PixelIconBase>
  )
}

/** Save/floppy disk */
export function IconSave({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Disk outline */}
      <rect x="1" y="1" width="2" height="14" />
      <rect x="1" y="1" width="12" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="13" y="3" width="2" height="12" />
      {/* Corner notch */}
      <rect x="11" y="1" width="2" height="2" />
      <rect x="13" y="1" width="2" height="4" />
      {/* Label area */}
      <rect x="4" y="1" width="6" height="5" opacity="0.3" />
      {/* Label hole */}
      <rect x="8" y="2" width="2" height="3" />
      {/* Disk window */}
      <rect x="4" y="9" width="8" height="4" opacity="0.3" />
    </PixelIconBase>
  )
}

/** Send - paper plane shape */
export function IconSend({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Main body pointing right */}
      <rect x="1" y="7" width="12" height="2" />
      {/* Top wing */}
      <rect x="3" y="3" width="2" height="4" />
      <rect x="5" y="5" width="2" height="2" />
      {/* Bottom wing */}
      <rect x="3" y="9" width="2" height="4" />
      <rect x="5" y="9" width="2" height="2" />
      {/* Tip */}
      <rect x="11" y="6" width="2" height="4" />
      <rect x="13" y="7" width="2" height="2" />
    </PixelIconBase>
  )
}

/** More horizontal - three dots */
export function IconMoreHorizontal({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="2" y="7" width="2" height="2" />
      <rect x="7" y="7" width="2" height="2" />
      <rect x="12" y="7" width="2" height="2" />
    </PixelIconBase>
  )
}

/** More vertical - three dots stacked */
export function IconMoreVertical({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="7" y="2" width="2" height="2" />
      <rect x="7" y="7" width="2" height="2" />
      <rect x="7" y="12" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Link - chain links */
export function IconLink({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Left link */}
      <rect x="1" y="5" width="2" height="6" />
      <rect x="1" y="5" width="5" height="2" />
      <rect x="1" y="9" width="5" height="2" />
      {/* Right link */}
      <rect x="10" y="5" width="5" height="2" />
      <rect x="10" y="9" width="5" height="2" />
      <rect x="13" y="5" width="2" height="6" />
      {/* Connection */}
      <rect x="6" y="7" width="4" height="2" />
    </PixelIconBase>
  )
}

/** Unlink - broken chain */
export function IconUnlink({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Left link */}
      <rect x="1" y="5" width="2" height="6" />
      <rect x="1" y="5" width="5" height="2" />
      <rect x="1" y="9" width="5" height="2" />
      {/* Right link (offset) */}
      <rect x="10" y="5" width="5" height="2" />
      <rect x="10" y="9" width="5" height="2" />
      <rect x="13" y="5" width="2" height="6" />
      {/* Break indicator */}
      <rect x="7" y="6" width="1" height="1" opacity="0.4" />
      <rect x="8" y="9" width="1" height="1" opacity="0.4" />
    </PixelIconBase>
  )
}

/** Select all - grid with checkmark */
export function IconSelectAll({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Grid frame */}
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="1" width="2" height="14" />
      <rect x="13" y="1" width="2" height="14" />
      {/* Grid lines */}
      <rect x="1" y="7" width="14" height="1" opacity="0.3" />
      <rect x="7" y="1" width="1" height="14" opacity="0.3" />
      {/* Checkmark */}
      <rect x="4" y="7" width="2" height="2" />
      <rect x="6" y="9" width="2" height="2" />
      <rect x="8" y="7" width="2" height="2" />
      <rect x="10" y="5" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Command key symbol */
export function IconCommand({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Four loops arranged in cloverleaf */}
      {/* Top-left loop */}
      <rect x="2" y="2" width="3" height="2" />
      <rect x="2" y="2" width="2" height="3" />
      {/* Top-right loop */}
      <rect x="11" y="2" width="3" height="2" />
      <rect x="12" y="2" width="2" height="3" />
      {/* Bottom-left loop */}
      <rect x="2" y="12" width="3" height="2" />
      <rect x="2" y="11" width="2" height="3" />
      {/* Bottom-right loop */}
      <rect x="11" y="12" width="3" height="2" />
      <rect x="12" y="11" width="2" height="3" />
      {/* Center cross */}
      <rect x="5" y="7" width="6" height="2" />
      <rect x="7" y="5" width="2" height="6" />
    </PixelIconBase>
  )
}

// Aliases for compatibility
export const IconTrash2 = IconTrash
export const IconPencil = IconEdit
