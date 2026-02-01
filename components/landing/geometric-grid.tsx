'use client'

import { cn } from '@/lib/utils'

interface GeometricGridProps {
  className?: string
}

/**
 * Subtle geometric grid background that matches the brand aesthetic.
 * Uses CSS-only implementation for maximum performance.
 * Enhanced with vignette effect and slightly higher visibility.
 */
export function GeometricGrid({ className }: GeometricGridProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden pointer-events-none',
        className
      )}
      aria-hidden="true"
    >
      {/* Grid pattern - slightly increased opacity for better visibility */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Vignette effect - subtle gradient fade at edges */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse 80% 60% at 50% 50%,
              transparent 0%,
              transparent 50%,
              rgba(var(--background), 0.4) 100%
            )
          `,
        }}
      />

      {/* Accent rectangles - hidden on mobile, visible on larger screens */}
      <div
        className={cn(
          'absolute bg-foreground/[0.03]',
          'w-16 h-16 md:w-32 md:h-32',
          'top-[15%] left-[8%]',
          'hidden sm:block',
          'animate-fade-in'
        )}
        style={{ animationDelay: '800ms' }}
      />
      <div
        className={cn(
          'absolute bg-foreground/[0.025]',
          'w-24 h-8 md:w-48 md:h-16',
          'top-[25%] right-[5%]',
          'hidden sm:block',
          'animate-fade-in'
        )}
        style={{ animationDelay: '900ms' }}
      />
      <div
        className={cn(
          'absolute bg-foreground/[0.03]',
          'w-12 h-32 md:w-24 md:h-64',
          'bottom-[20%] left-[15%]',
          'hidden md:block',
          'animate-fade-in'
        )}
        style={{ animationDelay: '1000ms' }}
      />
      <div
        className={cn(
          'absolute bg-foreground/[0.025]',
          'w-20 h-20 md:w-40 md:h-40',
          'bottom-[10%] right-[12%]',
          'hidden md:block',
          'animate-fade-in'
        )}
        style={{ animationDelay: '1100ms' }}
      />

      {/* Corner accent marks - hidden on mobile */}
      <div className="hidden sm:block absolute top-6 left-6 w-8 h-[2px] bg-foreground/[0.12]" />
      <div className="hidden sm:block absolute top-6 left-6 w-[2px] h-8 bg-foreground/[0.12]" />
      <div className="hidden sm:block absolute bottom-6 right-6 w-8 h-[2px] bg-foreground/[0.12]" />
      <div className="hidden sm:block absolute bottom-6 right-6 w-[2px] h-8 bg-foreground/[0.12]" />
    </div>
  )
}
