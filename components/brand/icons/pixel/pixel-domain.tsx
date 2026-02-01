'use client'

import { PixelIconBase, type PixelIconProps } from './pixel-core'

/**
 * Domain icons - File, Folder, Building, User, etc.
 * Built from rectangles for pixel-perfect rendering
 */

/** File with text */
export function IconFileText({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* File outline */}
      <rect x="2" y="1" width="9" height="2" />
      <rect x="2" y="1" width="2" height="14" />
      <rect x="2" y="13" width="10" height="2" />
      <rect x="10" y="3" width="2" height="12" />
      {/* Corner fold */}
      <rect x="9" y="1" width="2" height="2" />
      <rect x="11" y="1" width="2" height="4" />
      {/* Text lines */}
      <rect x="4" y="6" width="6" height="2" opacity="0.5" />
      <rect x="4" y="9" width="5" height="2" opacity="0.5" />
      <rect x="4" y="12" width="6" height="2" opacity="0.5" />
    </PixelIconBase>
  )
}

/** Plain file */
export function IconFile({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* File outline */}
      <rect x="2" y="1" width="9" height="2" />
      <rect x="2" y="1" width="2" height="14" />
      <rect x="2" y="13" width="10" height="2" />
      <rect x="10" y="3" width="2" height="12" />
      {/* Corner fold */}
      <rect x="9" y="1" width="2" height="2" />
      <rect x="11" y="1" width="2" height="4" />
    </PixelIconBase>
  )
}

/** CSV file */
export function IconFileCsv({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* File outline */}
      <rect x="2" y="1" width="9" height="2" />
      <rect x="2" y="1" width="2" height="14" />
      <rect x="2" y="13" width="10" height="2" />
      <rect x="10" y="3" width="2" height="12" />
      {/* Corner fold */}
      <rect x="9" y="1" width="2" height="2" />
      <rect x="11" y="1" width="2" height="4" />
      {/* CSV indicator (comma pattern) */}
      <rect x="4" y="6" width="2" height="2" />
      <rect x="6" y="9" width="2" height="2" opacity="0.5" />
      <rect x="8" y="6" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Excel file */
export function IconFileXls({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* File outline */}
      <rect x="2" y="1" width="9" height="2" />
      <rect x="2" y="1" width="2" height="14" />
      <rect x="2" y="13" width="10" height="2" />
      <rect x="10" y="3" width="2" height="12" />
      {/* Corner fold */}
      <rect x="9" y="1" width="2" height="2" />
      <rect x="11" y="1" width="2" height="4" />
      {/* X indicator */}
      <rect x="5" y="6" width="2" height="2" />
      <rect x="7" y="8" width="2" height="2" />
      <rect x="7" y="6" width="2" height="2" />
      <rect x="5" y="8" width="2" height="2" />
    </PixelIconBase>
  )
}

/** PDF file */
export function IconFilePdf({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* File outline */}
      <rect x="2" y="1" width="9" height="2" />
      <rect x="2" y="1" width="2" height="14" />
      <rect x="2" y="13" width="10" height="2" />
      <rect x="10" y="3" width="2" height="12" />
      {/* Corner fold */}
      <rect x="9" y="1" width="2" height="2" />
      <rect x="11" y="1" width="2" height="4" />
      {/* P indicator */}
      <rect x="5" y="6" width="2" height="5" />
      <rect x="5" y="6" width="4" height="2" />
      <rect x="7" y="6" width="2" height="3" />
    </PixelIconBase>
  )
}

/** Folder closed */
export function IconFolder({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Tab */}
      <rect x="1" y="2" width="5" height="2" />
      {/* Body */}
      <rect x="1" y="4" width="14" height="2" />
      <rect x="1" y="4" width="2" height="10" />
      <rect x="13" y="4" width="2" height="10" />
      <rect x="1" y="12" width="14" height="2" />
      {/* Fill */}
      <rect x="3" y="6" width="10" height="6" opacity="0.2" />
    </PixelIconBase>
  )
}

/** Folder open */
export function IconFolderOpen({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Tab */}
      <rect x="1" y="2" width="5" height="2" />
      {/* Back */}
      <rect x="1" y="4" width="2" height="10" />
      <rect x="1" y="12" width="14" height="2" />
      {/* Front flap (angled) */}
      <rect x="3" y="6" width="12" height="2" />
      <rect x="4" y="8" width="10" height="2" />
      <rect x="5" y="10" width="8" height="2" />
      <rect x="14" y="6" width="2" height="6" />
    </PixelIconBase>
  )
}

/** Buildings - office complex */
export function IconBuildings({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Tall building */}
      <rect x="1" y="3" width="6" height="12" />
      <rect x="2" y="5" width="2" height="2" opacity="0.3" />
      <rect x="2" y="8" width="2" height="2" opacity="0.3" />
      <rect x="2" y="11" width="2" height="2" opacity="0.3" />
      {/* Short building */}
      <rect x="9" y="7" width="6" height="8" />
      <rect x="10" y="9" width="2" height="2" opacity="0.3" />
      <rect x="10" y="12" width="2" height="2" opacity="0.3" />
    </PixelIconBase>
  )
}

/** Single building */
export function IconBuilding({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Building body */}
      <rect x="3" y="1" width="10" height="14" />
      {/* Windows */}
      <rect x="5" y="3" width="2" height="2" opacity="0.3" />
      <rect x="9" y="3" width="2" height="2" opacity="0.3" />
      <rect x="5" y="7" width="2" height="2" opacity="0.3" />
      <rect x="9" y="7" width="2" height="2" opacity="0.3" />
      {/* Door */}
      <rect x="7" y="11" width="2" height="4" opacity="0.3" />
    </PixelIconBase>
  )
}

/** House */
export function IconHouse({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Roof */}
      <rect x="7" y="1" width="2" height="2" />
      <rect x="5" y="3" width="6" height="2" />
      <rect x="3" y="5" width="10" height="2" />
      {/* Walls */}
      <rect x="2" y="7" width="2" height="8" />
      <rect x="12" y="7" width="2" height="8" />
      <rect x="2" y="13" width="12" height="2" />
      {/* Door */}
      <rect x="6" y="9" width="4" height="6" opacity="0.3" />
      {/* Window */}
      <rect x="9" y="9" width="2" height="2" opacity="0.3" />
    </PixelIconBase>
  )
}

/** Data table */
export function IconTable({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Frame */}
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="1" width="2" height="14" />
      <rect x="13" y="1" width="2" height="14" />
      {/* Header row */}
      <rect x="3" y="3" width="10" height="2" opacity="0.3" />
      {/* Horizontal lines */}
      <rect x="1" y="5" width="14" height="2" opacity="0.5" />
      <rect x="1" y="9" width="14" height="2" opacity="0.5" />
      {/* Vertical divider */}
      <rect x="7" y="5" width="2" height="8" opacity="0.5" />
    </PixelIconBase>
  )
}

/** Database */
export function IconDatabase({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Top ellipse */}
      <rect x="2" y="1" width="12" height="3" />
      {/* Body */}
      <rect x="1" y="3" width="2" height="10" />
      <rect x="13" y="3" width="2" height="10" />
      {/* Middle line */}
      <rect x="2" y="7" width="12" height="2" opacity="0.5" />
      {/* Bottom */}
      <rect x="2" y="12" width="12" height="3" />
    </PixelIconBase>
  )
}

/** Hard drive */
export function IconHardDrive({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Body */}
      <rect x="1" y="4" width="14" height="8" />
      {/* Top edge */}
      <rect x="1" y="4" width="14" height="2" opacity="0.3" />
      {/* LED */}
      <rect x="11" y="9" width="2" height="2" />
      {/* Divider line */}
      <rect x="3" y="9" width="6" height="2" opacity="0.5" />
    </PixelIconBase>
  )
}

/** Dollar sign */
export function IconDollarSign({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Vertical line */}
      <rect x="7" y="1" width="2" height="14" />
      {/* S shape */}
      <rect x="4" y="3" width="6" height="2" />
      <rect x="4" y="3" width="2" height="4" />
      <rect x="5" y="7" width="6" height="2" />
      <rect x="10" y="9" width="2" height="4" />
      <rect x="4" y="11" width="8" height="2" />
    </PixelIconBase>
  )
}

/** Money/Cash */
export function IconMoney({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Bill outline */}
      <rect x="1" y="3" width="14" height="2" />
      <rect x="1" y="11" width="14" height="2" />
      <rect x="1" y="3" width="2" height="10" />
      <rect x="13" y="3" width="2" height="10" />
      {/* Center circle */}
      <rect x="6" y="6" width="4" height="4" />
      {/* Corner decorations */}
      <rect x="3" y="5" width="2" height="2" opacity="0.3" />
      <rect x="11" y="5" width="2" height="2" opacity="0.3" />
      <rect x="3" y="9" width="2" height="2" opacity="0.3" />
      <rect x="11" y="9" width="2" height="2" opacity="0.3" />
    </PixelIconBase>
  )
}

/** Receipt */
export function IconReceipt({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Paper with torn bottom */}
      <rect x="3" y="1" width="10" height="2" />
      <rect x="3" y="1" width="2" height="12" />
      <rect x="11" y="1" width="2" height="12" />
      {/* Torn edge */}
      <rect x="3" y="13" width="2" height="2" />
      <rect x="6" y="12" width="2" height="2" />
      <rect x="9" y="13" width="2" height="2" />
      <rect x="11" y="12" width="2" height="2" />
      {/* Text lines */}
      <rect x="5" y="4" width="6" height="2" opacity="0.5" />
      <rect x="5" y="7" width="4" height="2" opacity="0.5" />
      <rect x="5" y="10" width="5" height="2" opacity="0.5" />
    </PixelIconBase>
  )
}

/** Invoice */
export function IconInvoice({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Document */}
      <rect x="2" y="1" width="12" height="2" />
      <rect x="2" y="13" width="12" height="2" />
      <rect x="2" y="1" width="2" height="14" />
      <rect x="12" y="1" width="2" height="14" />
      {/* Header */}
      <rect x="4" y="3" width="8" height="2" opacity="0.3" />
      {/* Lines */}
      <rect x="4" y="6" width="6" height="2" opacity="0.5" />
      <rect x="4" y="9" width="5" height="2" opacity="0.5" />
      {/* Total line */}
      <rect x="4" y="12" width="8" height="2" />
    </PixelIconBase>
  )
}

/** Bank */
export function IconBank({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Roof */}
      <rect x="7" y="1" width="2" height="2" />
      <rect x="4" y="3" width="8" height="2" />
      <rect x="2" y="5" width="12" height="2" />
      {/* Pillars */}
      <rect x="3" y="7" width="2" height="6" />
      <rect x="7" y="7" width="2" height="6" />
      <rect x="11" y="7" width="2" height="6" />
      {/* Base */}
      <rect x="1" y="13" width="14" height="2" />
    </PixelIconBase>
  )
}

/** Credit card */
export function IconCreditCard({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Card outline */}
      <rect x="1" y="3" width="14" height="2" />
      <rect x="1" y="11" width="14" height="2" />
      <rect x="1" y="3" width="2" height="10" />
      <rect x="13" y="3" width="2" height="10" />
      {/* Magnetic stripe */}
      <rect x="1" y="5" width="14" height="2" opacity="0.5" />
      {/* Chip */}
      <rect x="3" y="8" width="3" height="2" opacity="0.5" />
    </PixelIconBase>
  )
}

/** Wallet */
export function IconWallet({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Wallet body */}
      <rect x="1" y="3" width="12" height="2" />
      <rect x="1" y="11" width="12" height="2" />
      <rect x="1" y="3" width="2" height="10" />
      <rect x="11" y="3" width="2" height="10" />
      {/* Flap */}
      <rect x="11" y="5" width="4" height="6" />
      {/* Clasp */}
      <rect x="12" y="7" width="2" height="2" opacity="0.5" />
    </PixelIconBase>
  )
}

/** Calculator */
export function IconCalculator({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Body */}
      <rect x="2" y="1" width="12" height="2" />
      <rect x="2" y="13" width="12" height="2" />
      <rect x="2" y="1" width="2" height="14" />
      <rect x="12" y="1" width="2" height="14" />
      {/* Display */}
      <rect x="4" y="3" width="8" height="3" opacity="0.3" />
      {/* Buttons */}
      <rect x="4" y="7" width="2" height="2" opacity="0.5" />
      <rect x="7" y="7" width="2" height="2" opacity="0.5" />
      <rect x="10" y="7" width="2" height="2" opacity="0.5" />
      <rect x="4" y="10" width="2" height="2" opacity="0.5" />
      <rect x="7" y="10" width="2" height="2" opacity="0.5" />
      <rect x="10" y="10" width="2" height="2" opacity="0.5" />
    </PixelIconBase>
  )
}

/** Line chart */
export function IconChartLine({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Axes */}
      <rect x="1" y="1" width="2" height="14" />
      <rect x="1" y="13" width="14" height="2" />
      {/* Line */}
      <rect x="3" y="9" width="2" height="2" />
      <rect x="5" y="7" width="2" height="2" />
      <rect x="7" y="5" width="2" height="2" />
      <rect x="9" y="7" width="2" height="2" />
      <rect x="11" y="3" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Bar chart */
export function IconChartBar({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Axes */}
      <rect x="1" y="1" width="2" height="14" />
      <rect x="1" y="13" width="14" height="2" />
      {/* Bars */}
      <rect x="4" y="7" width="2" height="6" />
      <rect x="7" y="4" width="2" height="9" />
      <rect x="10" y="9" width="2" height="4" />
      <rect x="13" y="2" width="2" height="11" />
    </PixelIconBase>
  )
}

/** Pie chart */
export function IconChartPie({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Circle outline */}
      <rect x="4" y="1" width="8" height="2" />
      <rect x="4" y="13" width="8" height="2" />
      <rect x="1" y="4" width="2" height="8" />
      <rect x="13" y="4" width="2" height="8" />
      <rect x="2" y="2" width="2" height="2" />
      <rect x="12" y="2" width="2" height="2" />
      <rect x="2" y="12" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
      {/* Slice lines */}
      <rect x="7" y="3" width="2" height="5" />
      <rect x="9" y="7" width="4" height="2" />
      {/* Slice fill */}
      <rect x="9" y="3" width="4" height="4" opacity="0.3" />
    </PixelIconBase>
  )
}

/** Calendar */
export function IconCalendar({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Frame */}
      <rect x="1" y="3" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="3" width="2" height="12" />
      <rect x="13" y="3" width="2" height="12" />
      {/* Hooks */}
      <rect x="4" y="1" width="2" height="4" />
      <rect x="10" y="1" width="2" height="4" />
      {/* Grid */}
      <rect x="3" y="7" width="2" height="2" opacity="0.5" />
      <rect x="6" y="7" width="2" height="2" opacity="0.5" />
      <rect x="9" y="7" width="2" height="2" opacity="0.5" />
      <rect x="3" y="10" width="2" height="2" opacity="0.5" />
      <rect x="6" y="10" width="2" height="2" opacity="0.5" />
      <rect x="9" y="10" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Calendar blank */
export function IconCalendarBlank({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Frame */}
      <rect x="1" y="3" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="3" width="2" height="12" />
      <rect x="13" y="3" width="2" height="12" />
      {/* Hooks */}
      <rect x="4" y="1" width="2" height="4" />
      <rect x="10" y="1" width="2" height="4" />
      {/* Header line */}
      <rect x="1" y="6" width="14" height="2" opacity="0.5" />
    </PixelIconBase>
  )
}

/** Tag/Label */
export function IconTag({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Tag body */}
      <rect x="1" y="1" width="8" height="2" />
      <rect x="1" y="1" width="2" height="8" />
      <rect x="9" y="3" width="2" height="2" />
      <rect x="11" y="5" width="2" height="2" />
      <rect x="13" y="7" width="2" height="2" />
      <rect x="11" y="9" width="2" height="2" />
      <rect x="9" y="11" width="2" height="2" />
      <rect x="3" y="9" width="2" height="6" />
      <rect x="3" y="13" width="6" height="2" />
      {/* Hole */}
      <rect x="4" y="4" width="2" height="2" opacity="0.3" />
    </PixelIconBase>
  )
}

/** Hash/Number */
export function IconHash({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Vertical lines */}
      <rect x="5" y="1" width="2" height="14" />
      <rect x="9" y="1" width="2" height="14" />
      {/* Horizontal lines */}
      <rect x="1" y="5" width="14" height="2" />
      <rect x="1" y="9" width="14" height="2" />
    </PixelIconBase>
  )
}

/** User */
export function IconUser({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Head */}
      <rect x="5" y="1" width="6" height="6" />
      {/* Body */}
      <rect x="3" y="9" width="10" height="2" />
      <rect x="2" y="11" width="12" height="4" />
    </PixelIconBase>
  )
}

/** Multiple users */
export function IconUsers({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Front user head */}
      <rect x="4" y="3" width="5" height="5" />
      {/* Front user body */}
      <rect x="2" y="10" width="9" height="2" />
      <rect x="1" y="12" width="11" height="3" />
      {/* Back user head */}
      <rect x="10" y="1" width="4" height="4" opacity="0.5" />
      {/* Back user body */}
      <rect x="10" y="7" width="5" height="2" opacity="0.5" />
      <rect x="10" y="9" width="5" height="3" opacity="0.5" />
    </PixelIconBase>
  )
}

/** User in circle */
export function IconUserCircle({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Circle frame */}
      <rect x="4" y="1" width="8" height="2" />
      <rect x="4" y="13" width="8" height="2" />
      <rect x="1" y="4" width="2" height="8" />
      <rect x="13" y="4" width="2" height="8" />
      <rect x="2" y="2" width="2" height="2" />
      <rect x="12" y="2" width="2" height="2" />
      <rect x="2" y="12" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
      {/* Head */}
      <rect x="6" y="4" width="4" height="4" />
      {/* Body */}
      <rect x="4" y="10" width="8" height="3" />
    </PixelIconBase>
  )
}

/** Briefcase */
export function IconBriefcase({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Handle */}
      <rect x="5" y="1" width="6" height="2" />
      <rect x="5" y="1" width="2" height="4" />
      <rect x="9" y="1" width="2" height="4" />
      {/* Body */}
      <rect x="1" y="5" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="5" width="2" height="10" />
      <rect x="13" y="5" width="2" height="10" />
      {/* Middle divider */}
      <rect x="1" y="9" width="14" height="2" opacity="0.3" />
    </PixelIconBase>
  )
}

/** Gear/Settings */
export function IconGear({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Center square */}
      <rect x="5" y="5" width="6" height="6" />
      {/* Inner hole */}
      <rect x="6" y="6" width="4" height="4" opacity="0.3" />
      {/* Top tooth */}
      <rect x="6" y="1" width="4" height="3" />
      {/* Bottom tooth */}
      <rect x="6" y="12" width="4" height="3" />
      {/* Left tooth */}
      <rect x="1" y="6" width="3" height="4" />
      {/* Right tooth */}
      <rect x="12" y="6" width="3" height="4" />
    </PixelIconBase>
  )
}

/** Sliders/Adjustments */
export function IconSliders({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Track 1 */}
      <rect x="1" y="3" width="14" height="2" opacity="0.5" />
      <rect x="3" y="2" width="3" height="3" />
      {/* Track 2 */}
      <rect x="1" y="8" width="14" height="2" opacity="0.5" />
      <rect x="9" y="7" width="3" height="3" />
      {/* Track 3 */}
      <rect x="1" y="13" width="14" height="2" opacity="0.5" />
      <rect x="5" y="12" width="3" height="3" />
    </PixelIconBase>
  )
}

/** Bell notification */
export function IconBell({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Bell top */}
      <rect x="7" y="1" width="2" height="2" />
      <rect x="5" y="3" width="6" height="2" />
      <rect x="4" y="5" width="8" height="2" />
      <rect x="3" y="7" width="10" height="2" />
      <rect x="2" y="9" width="12" height="2" />
      {/* Bell bottom */}
      <rect x="1" y="11" width="14" height="2" />
      {/* Clapper */}
      <rect x="7" y="13" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Bell ringing */
export function IconBellRinging({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Bell (tilted) */}
      <rect x="8" y="1" width="2" height="2" />
      <rect x="6" y="3" width="6" height="2" />
      <rect x="5" y="5" width="8" height="2" />
      <rect x="4" y="7" width="10" height="2" />
      <rect x="3" y="9" width="11" height="2" />
      <rect x="2" y="11" width="12" height="2" />
      {/* Clapper */}
      <rect x="7" y="13" width="2" height="2" />
      {/* Motion lines */}
      <rect x="1" y="3" width="2" height="2" opacity="0.5" />
      <rect x="1" y="6" width="2" height="2" opacity="0.5" />
    </PixelIconBase>
  )
}

/** Envelope/Mail */
export function IconEnvelope({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Envelope body */}
      <rect x="1" y="3" width="14" height="2" />
      <rect x="1" y="11" width="14" height="2" />
      <rect x="1" y="3" width="2" height="10" />
      <rect x="13" y="3" width="2" height="10" />
      {/* Flap */}
      <rect x="2" y="4" width="2" height="2" />
      <rect x="4" y="6" width="2" height="2" />
      <rect x="6" y="8" width="2" height="2" />
      <rect x="8" y="8" width="2" height="2" />
      <rect x="10" y="6" width="2" height="2" />
      <rect x="12" y="4" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Envelope open */
export function IconEnvelopeOpen({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Flap (open) */}
      <rect x="7" y="1" width="2" height="2" />
      <rect x="5" y="3" width="2" height="2" />
      <rect x="9" y="3" width="2" height="2" />
      <rect x="3" y="5" width="2" height="2" />
      <rect x="11" y="5" width="2" height="2" />
      {/* Body */}
      <rect x="1" y="7" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="7" width="2" height="8" />
      <rect x="13" y="7" width="2" height="8" />
    </PixelIconBase>
  )
}

/** Chat bubble */
export function IconChat({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Bubble */}
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="9" width="10" height="2" />
      <rect x="1" y="1" width="2" height="10" />
      <rect x="13" y="1" width="2" height="10" />
      {/* Tail */}
      <rect x="3" y="11" width="2" height="2" />
      <rect x="1" y="13" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Chat with dots */
export function IconChatDots({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Bubble */}
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="9" width="10" height="2" />
      <rect x="1" y="1" width="2" height="10" />
      <rect x="13" y="1" width="2" height="10" />
      {/* Tail */}
      <rect x="3" y="11" width="2" height="2" />
      <rect x="1" y="13" width="2" height="2" />
      {/* Dots */}
      <rect x="4" y="5" width="2" height="2" opacity="0.5" />
      <rect x="7" y="5" width="2" height="2" opacity="0.5" />
      <rect x="10" y="5" width="2" height="2" opacity="0.5" />
    </PixelIconBase>
  )
}

/** Image/Picture */
export function IconImage({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Frame */}
      <rect x="1" y="2" width="14" height="2" />
      <rect x="1" y="12" width="14" height="2" />
      <rect x="1" y="2" width="2" height="12" />
      <rect x="13" y="2" width="2" height="12" />
      {/* Sun */}
      <rect x="10" y="4" width="2" height="2" />
      {/* Mountain */}
      <rect x="3" y="10" width="2" height="2" />
      <rect x="5" y="8" width="2" height="4" />
      <rect x="7" y="6" width="2" height="6" />
      <rect x="9" y="8" width="2" height="4" />
    </PixelIconBase>
  )
}

/** Camera */
export function IconCamera({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Top notch */}
      <rect x="5" y="2" width="6" height="2" />
      {/* Body */}
      <rect x="1" y="4" width="14" height="2" />
      <rect x="1" y="12" width="14" height="2" />
      <rect x="1" y="4" width="2" height="10" />
      <rect x="13" y="4" width="2" height="10" />
      {/* Lens */}
      <rect x="6" y="7" width="4" height="4" />
    </PixelIconBase>
  )
}

/** Paperclip */
export function IconPaperclip({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Clip shape */}
      <rect x="5" y="1" width="4" height="2" />
      <rect x="4" y="3" width="2" height="8" />
      <rect x="8" y="1" width="2" height="10" />
      <rect x="5" y="11" width="4" height="2" />
      <rect x="6" y="5" width="2" height="6" />
      <rect x="6" y="5" width="4" height="2" />
      <rect x="10" y="3" width="2" height="6" />
      <rect x="7" y="13" width="4" height="2" />
      <rect x="11" y="9" width="2" height="4" />
    </PixelIconBase>
  )
}

/** Cloud */
export function IconCloud({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Cloud shape */}
      <rect x="4" y="3" width="4" height="2" />
      <rect x="2" y="5" width="2" height="4" />
      <rect x="8" y="5" width="2" height="2" />
      <rect x="10" y="5" width="4" height="2" />
      <rect x="12" y="7" width="2" height="4" />
      <rect x="2" y="9" width="12" height="2" />
      <rect x="4" y="11" width="8" height="2" />
    </PixelIconBase>
  )
}

/** Cloud upload */
export function IconCloudUpload({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Cloud shape */}
      <rect x="4" y="2" width="4" height="2" />
      <rect x="2" y="4" width="2" height="3" />
      <rect x="8" y="4" width="2" height="2" />
      <rect x="10" y="4" width="4" height="2" />
      <rect x="12" y="6" width="2" height="3" />
      <rect x="2" y="7" width="4" height="2" />
      <rect x="10" y="7" width="4" height="2" />
      {/* Arrow up */}
      <rect x="7" y="6" width="2" height="6" />
      <rect x="5" y="8" width="2" height="2" />
      <rect x="9" y="8" width="2" height="2" />
      {/* Base */}
      <rect x="4" y="13" width="8" height="2" />
    </PixelIconBase>
  )
}

/** Cloud download */
export function IconCloudDownload({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Cloud shape */}
      <rect x="4" y="1" width="4" height="2" />
      <rect x="2" y="3" width="2" height="3" />
      <rect x="8" y="3" width="2" height="2" />
      <rect x="10" y="3" width="4" height="2" />
      <rect x="12" y="5" width="2" height="3" />
      <rect x="2" y="6" width="4" height="2" />
      <rect x="10" y="6" width="4" height="2" />
      {/* Arrow down */}
      <rect x="7" y="5" width="2" height="6" />
      <rect x="5" y="9" width="2" height="2" />
      <rect x="9" y="9" width="2" height="2" />
      {/* Base */}
      <rect x="4" y="13" width="8" height="2" />
    </PixelIconBase>
  )
}

/** Lock */
export function IconLock({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Shackle */}
      <rect x="4" y="1" width="8" height="2" />
      <rect x="4" y="1" width="2" height="6" />
      <rect x="10" y="1" width="2" height="6" />
      {/* Body */}
      <rect x="2" y="7" width="12" height="2" />
      <rect x="2" y="13" width="12" height="2" />
      <rect x="2" y="7" width="2" height="8" />
      <rect x="12" y="7" width="2" height="8" />
      {/* Keyhole */}
      <rect x="7" y="10" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Unlock */
export function IconUnlock({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Open shackle */}
      <rect x="4" y="1" width="8" height="2" />
      <rect x="10" y="1" width="2" height="6" />
      {/* Body */}
      <rect x="2" y="7" width="12" height="2" />
      <rect x="2" y="13" width="12" height="2" />
      <rect x="2" y="7" width="2" height="8" />
      <rect x="12" y="7" width="2" height="8" />
      {/* Keyhole */}
      <rect x="7" y="10" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Key */
export function IconKey({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Head */}
      <rect x="2" y="2" width="5" height="2" />
      <rect x="2" y="6" width="5" height="2" />
      <rect x="1" y="3" width="2" height="4" />
      <rect x="6" y="3" width="2" height="4" />
      {/* Shaft */}
      <rect x="8" y="4" width="6" height="2" />
      {/* Teeth */}
      <rect x="10" y="6" width="2" height="2" />
      <rect x="13" y="6" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Sign in - arrow entering frame */
export function IconSignIn({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Door frame */}
      <rect x="8" y="1" width="2" height="14" />
      <rect x="8" y="1" width="7" height="2" />
      <rect x="8" y="13" width="7" height="2" />
      {/* Arrow */}
      <rect x="1" y="7" width="6" height="2" />
      <rect x="4" y="5" width="2" height="2" />
      <rect x="4" y="9" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Sign out - arrow leaving frame */
export function IconSignOut({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Door frame */}
      <rect x="1" y="1" width="2" height="14" />
      <rect x="1" y="1" width="7" height="2" />
      <rect x="1" y="13" width="7" height="2" />
      {/* Arrow */}
      <rect x="6" y="7" width="6" height="2" />
      <rect x="10" y="5" width="2" height="2" />
      <rect x="10" y="9" width="2" height="2" />
    </PixelIconBase>
  )
}

/** Globe */
export function IconGlobe({ size = 16, className, spin }: PixelIconProps) {
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
      {/* Latitude lines */}
      <rect x="3" y="7" width="10" height="2" opacity="0.5" />
      {/* Longitude */}
      <rect x="7" y="2" width="2" height="12" opacity="0.5" />
    </PixelIconBase>
  )
}

/** Map pin */
export function IconMapPin({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Pin top */}
      <rect x="4" y="1" width="8" height="2" />
      <rect x="3" y="3" width="2" height="4" />
      <rect x="11" y="3" width="2" height="4" />
      <rect x="4" y="7" width="3" height="2" />
      <rect x="9" y="7" width="3" height="2" />
      {/* Pin point */}
      <rect x="6" y="9" width="4" height="2" />
      <rect x="7" y="11" width="2" height="4" />
      {/* Center dot */}
      <rect x="6" y="4" width="4" height="3" opacity="0.3" />
    </PixelIconBase>
  )
}

/** Code brackets */
export function IconCode({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Left bracket */}
      <rect x="1" y="3" width="2" height="2" />
      <rect x="3" y="5" width="2" height="2" />
      <rect x="5" y="7" width="2" height="2" />
      <rect x="3" y="9" width="2" height="2" />
      <rect x="1" y="11" width="2" height="2" />
      {/* Right bracket */}
      <rect x="13" y="3" width="2" height="2" />
      <rect x="11" y="5" width="2" height="2" />
      <rect x="9" y="7" width="2" height="2" />
      <rect x="11" y="9" width="2" height="2" />
      <rect x="13" y="11" width="2" height="2" />
    </PixelIconBase>
  )
}

/** File with code */
export function IconFileCode({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* File outline */}
      <rect x="2" y="1" width="9" height="2" />
      <rect x="2" y="1" width="2" height="14" />
      <rect x="2" y="13" width="10" height="2" />
      <rect x="10" y="3" width="2" height="12" />
      {/* Corner fold */}
      <rect x="9" y="1" width="2" height="2" />
      <rect x="11" y="1" width="2" height="4" />
      {/* Code brackets */}
      <rect x="4" y="6" width="1" height="1" />
      <rect x="5" y="7" width="1" height="1" />
      <rect x="4" y="8" width="1" height="1" />
      <rect x="8" y="6" width="1" height="1" />
      <rect x="7" y="7" width="1" height="1" />
      <rect x="8" y="8" width="1" height="1" />
    </PixelIconBase>
  )
}

/** Film strip */
export function IconFilmStrip({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Frame */}
      <rect x="1" y="1" width="14" height="2" />
      <rect x="1" y="13" width="14" height="2" />
      <rect x="1" y="1" width="2" height="14" />
      <rect x="13" y="1" width="2" height="14" />
      {/* Sprocket holes */}
      <rect x="2" y="4" width="2" height="2" />
      <rect x="2" y="8" width="2" height="2" />
      <rect x="12" y="4" width="2" height="2" />
      <rect x="12" y="8" width="2" height="2" />
      {/* Frame content */}
      <rect x="5" y="5" width="6" height="6" opacity="0.3" />
    </PixelIconBase>
  )
}

/** Four squares - grid */
export function IconSquaresFour({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      <rect x="1" y="1" width="6" height="6" />
      <rect x="9" y="1" width="6" height="6" />
      <rect x="1" y="9" width="6" height="6" />
      <rect x="9" y="9" width="6" height="6" />
    </PixelIconBase>
  )
}

/** Git diff */
export function IconGitDiff({ size = 16, className, spin }: PixelIconProps) {
  return (
    <PixelIconBase size={size} className={className} spin={spin}>
      {/* Plus side */}
      <rect x="2" y="2" width="4" height="4" />
      <rect x="2" y="6" width="2" height="6" />
      {/* Minus side */}
      <rect x="12" y="10" width="4" height="4" />
      <rect x="12" y="4" width="2" height="6" />
      {/* Connection */}
      <rect x="4" y="10" width="8" height="2" />
      <rect x="4" y="4" width="8" height="2" />
    </PixelIconBase>
  )
}

// Aliases for compatibility
export const IconBuilding2 = IconBuildings
export const IconTable2 = IconTable
export const IconMail = IconEnvelope
export const IconMessageCircle = IconChat
export const IconSettings = IconGear
export const IconLogIn = IconSignIn
export const IconLogOut = IconSignOut
