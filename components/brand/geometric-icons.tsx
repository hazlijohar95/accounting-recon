import { cn } from '@/lib/utils'

interface IconProps {
  size?: number
  className?: string
}

/**
 * Geometric icons for Reconcile brand.
 * Built exclusively from rectangles to match the brand aesthetic.
 * All icons use a 16x16 viewBox for consistency.
 */

/** Arrow entering a frame - sign in */
export function IconSignIn({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Door frame */}
      <rect x="8" y="1" width="2" height="14" fill="currentColor" />
      <rect x="8" y="1" width="7" height="2" fill="currentColor" />
      <rect x="8" y="13" width="7" height="2" fill="currentColor" />
      {/* Arrow */}
      <rect x="1" y="7" width="6" height="2" fill="currentColor" />
      <rect x="4" y="5" width="2" height="2" fill="currentColor" />
      <rect x="4" y="9" width="2" height="2" fill="currentColor" />
    </svg>
  )
}

/** Arrow leaving a frame - sign out */
export function IconSignOut({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Door frame */}
      <rect x="1" y="1" width="2" height="14" fill="currentColor" />
      <rect x="1" y="1" width="7" height="2" fill="currentColor" />
      <rect x="1" y="13" width="7" height="2" fill="currentColor" />
      {/* Arrow */}
      <rect x="6" y="7" width="6" height="2" fill="currentColor" />
      <rect x="10" y="5" width="2" height="2" fill="currentColor" />
      <rect x="10" y="9" width="2" height="2" fill="currentColor" />
    </svg>
  )
}

/** Geometric user silhouette */
export function IconUser({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Head */}
      <rect x="5" y="1" width="6" height="6" fill="currentColor" />
      {/* Body */}
      <rect x="3" y="9" width="10" height="2" fill="currentColor" />
      <rect x="2" y="11" width="12" height="4" fill="currentColor" />
    </svg>
  )
}

/** Panel collapsing left */
export function IconPanelCollapse({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Panel frame */}
      <rect x="1" y="1" width="2" height="14" fill="currentColor" />
      <rect x="1" y="1" width="14" height="2" fill="currentColor" />
      <rect x="1" y="13" width="14" height="2" fill="currentColor" />
      <rect x="13" y="1" width="2" height="14" fill="currentColor" />
      {/* Divider */}
      <rect x="5" y="3" width="1.5" height="10" fill="currentColor" opacity="0.4" />
      {/* Arrow pointing left */}
      <rect x="8" y="7" width="4" height="2" fill="currentColor" />
      <rect x="8" y="5" width="2" height="2" fill="currentColor" />
      <rect x="8" y="9" width="2" height="2" fill="currentColor" />
    </svg>
  )
}

/** Panel expanding right */
export function IconPanelExpand({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Panel frame */}
      <rect x="1" y="1" width="2" height="14" fill="currentColor" />
      <rect x="1" y="1" width="14" height="2" fill="currentColor" />
      <rect x="1" y="13" width="14" height="2" fill="currentColor" />
      <rect x="13" y="1" width="2" height="14" fill="currentColor" />
      {/* Divider */}
      <rect x="5" y="3" width="1.5" height="10" fill="currentColor" opacity="0.4" />
      {/* Arrow pointing right */}
      <rect x="8" y="7" width="4" height="2" fill="currentColor" />
      <rect x="10" y="5" width="2" height="2" fill="currentColor" />
      <rect x="10" y="9" width="2" height="2" fill="currentColor" />
    </svg>
  )
}

/** Demo mode indicator - stylized "D" */
export function IconDemo({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Stylized D made of rectangles */}
      <rect x="3" y="2" width="3" height="12" fill="currentColor" />
      <rect x="6" y="2" width="5" height="2.5" fill="currentColor" />
      <rect x="6" y="11.5" width="5" height="2.5" fill="currentColor" />
      <rect x="10" y="4" width="3" height="8" fill="currentColor" />
    </svg>
  )
}

/** Real mode indicator - stylized "R" (mini version of logo) */
export function IconReal({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Mini R matching the brand logo */}
      <rect x="2" y="2" width="3" height="12" fill="currentColor" />
      <rect x="5" y="2" width="6" height="2.5" fill="currentColor" />
      <rect x="10" y="2" width="3" height="4" fill="currentColor" />
      <rect x="5" y="6.5" width="6" height="2.5" fill="currentColor" />
      <rect x="8" y="9" width="3" height="2" fill="currentColor" />
      <rect x="10" y="11" width="4" height="3" fill="currentColor" />
    </svg>
  )
}

/** Switch/toggle indicator */
export function IconSwitch({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Track */}
      <rect x="1" y="5" width="14" height="6" fill="currentColor" opacity="0.3" />
      {/* Knob */}
      <rect x="9" y="4" width="5" height="8" fill="currentColor" />
    </svg>
  )
}

/** Arrow right for navigation */
export function IconArrowRight({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      <rect x="2" y="7" width="10" height="2" fill="currentColor" />
      <rect x="9" y="4" width="2" height="3" fill="currentColor" />
      <rect x="9" y="9" width="2" height="3" fill="currentColor" />
      <rect x="11" y="5" width="2" height="2" fill="currentColor" />
      <rect x="11" y="9" width="2" height="2" fill="currentColor" />
    </svg>
  )
}

/** Dashboard - 4 squares in a 2x2 grid */
export function IconDashboard({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Top-left square */}
      <rect x="1" y="1" width="6" height="6" fill="currentColor" />
      {/* Top-right square */}
      <rect x="9" y="1" width="6" height="6" fill="currentColor" />
      {/* Bottom-left square */}
      <rect x="1" y="9" width="6" height="6" fill="currentColor" />
      {/* Bottom-right square */}
      <rect x="9" y="9" width="6" height="6" fill="currentColor" />
    </svg>
  )
}

/** Upload - tray with upward chevron */
export function IconUpload({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Tray/box */}
      <rect x="1" y="11" width="2" height="4" fill="currentColor" />
      <rect x="1" y="13" width="14" height="2" fill="currentColor" />
      <rect x="13" y="11" width="2" height="4" fill="currentColor" />
      {/* Upward chevron */}
      <rect x="3" y="6" width="3" height="2" fill="currentColor" />
      <rect x="5" y="4" width="2" height="2" fill="currentColor" />
      <rect x="7" y="2" width="2" height="2" fill="currentColor" />
      <rect x="9" y="4" width="2" height="2" fill="currentColor" />
      <rect x="10" y="6" width="3" height="2" fill="currentColor" />
    </svg>
  )
}

/** Reconcile - two overlapping rectangles */
export function IconReconcile({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Left document */}
      <rect x="1" y="1" width="8" height="11" fill="currentColor" opacity="0.5" />
      {/* Right document (overlapping) */}
      <rect x="7" y="4" width="8" height="11" fill="currentColor" />
    </svg>
  )
}

/** Reports - document with horizontal lines */
export function IconReports({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Document outline */}
      <rect x="2" y="1" width="12" height="14" fill="currentColor" opacity="0.2" />
      {/* Left edge */}
      <rect x="2" y="1" width="2" height="14" fill="currentColor" />
      {/* Top edge */}
      <rect x="2" y="1" width="12" height="2" fill="currentColor" />
      {/* Bottom edge */}
      <rect x="2" y="13" width="12" height="2" fill="currentColor" />
      {/* Right edge */}
      <rect x="12" y="1" width="2" height="14" fill="currentColor" />
      {/* Text lines */}
      <rect x="4" y="4" width="8" height="1.5" fill="currentColor" />
      <rect x="4" y="7" width="6" height="1.5" fill="currentColor" />
      <rect x="4" y="10" width="7" height="1.5" fill="currentColor" />
    </svg>
  )
}
