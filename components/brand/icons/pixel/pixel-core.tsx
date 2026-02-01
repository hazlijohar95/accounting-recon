'use client'

import { cn } from '@/lib/utils'

/**
 * Pixel Icon Props
 * Compatible with the existing BrandIcon interface for easy migration
 */
export interface PixelIconProps {
  size?: number
  className?: string
  /** @deprecated Use className with animation instead */
  spin?: boolean
}

/**
 * Base SVG wrapper for pixel icons
 * All icons use 16x16 viewBox with rectangle-only composition
 */
export function PixelIconBase({
  size = 16,
  className,
  spin = false,
  children,
}: PixelIconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(spin && 'animate-spin', className)}
    >
      {children}
    </svg>
  )
}
