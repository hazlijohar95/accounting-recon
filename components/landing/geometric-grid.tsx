'use client'

import { cn } from '@/lib/utils'

interface GeometricGridProps {
  className?: string
}

/**
 * Refined geometric grid background with noise texture overlay.
 * Cleaner design - removed accent rectangles for minimal elegance.
 * Uses CSS-only implementation for maximum performance.
 */
export function GeometricGrid({ className }: GeometricGridProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden pointer-events-none noise-overlay',
        className
      )}
      aria-hidden="true"
    >
      {/* Grid pattern - reduced opacity for subtlety */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Soft vignette effect */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse 90% 70% at 50% 50%,
              transparent 0%,
              transparent 60%,
              hsl(var(--background)) 100%
            )
          `,
        }}
      />

      {/* Minimal corner accent marks - hidden on mobile */}
      <div className="hidden sm:block absolute top-8 left-8 w-6 h-[1px] bg-foreground/[0.08]" />
      <div className="hidden sm:block absolute top-8 left-8 w-[1px] h-6 bg-foreground/[0.08]" />
      <div className="hidden sm:block absolute bottom-8 right-8 w-6 h-[1px] bg-foreground/[0.08]" />
      <div className="hidden sm:block absolute bottom-8 right-8 w-[1px] h-6 bg-foreground/[0.08]" />
    </div>
  )
}
