'use client'

import { cn } from '@/lib/utils'
import { LogoWordmarkAnimated } from './logo-wordmark'

interface LogoAnimatedProps {
  size?: number
  className?: string
  animate?: boolean
}

export function LogoAnimated({ size = 48, className, animate = true }: LogoAnimatedProps) {
  // Wrap SVG in a div to handle animations - animating the wrapper is more performant
  // than animating the SVG element directly (better compositor layer promotion)
  return (
    <div className={cn('inline-block', animate && 'animate-fade-in', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-foreground"
        role="img"
        aria-label="Reconcile logo"
      >
      {/* Vertical stem - slides in from left */}
      <rect
        x="8"
        y="8"
        width="8"
        height="32"
        fill="currentColor"
        className={animate ? 'animate-rectangle-reveal origin-left' : ''}
        style={animate ? { animationDelay: '0ms' } : {}}
      />
      {/* Top horizontal bar - expands right */}
      <rect
        x="16"
        y="8"
        width="16"
        height="8"
        fill="currentColor"
        className={animate ? 'animate-rectangle-reveal origin-left' : ''}
        style={animate ? { animationDelay: '80ms' } : {}}
      />
      {/* Right column - drops down */}
      <rect
        x="32"
        y="8"
        width="8"
        height="12"
        fill="currentColor"
        className={animate ? 'animate-rectangle-reveal origin-top' : ''}
        style={animate ? { animationDelay: '160ms' } : {}}
      />
      {/* Middle bar - expands */}
      <rect
        x="16"
        y="20"
        width="16"
        height="8"
        fill="currentColor"
        className={animate ? 'animate-rectangle-reveal origin-left' : ''}
        style={animate ? { animationDelay: '240ms' } : {}}
      />
      {/* Diagonal connector - fades in */}
      <rect
        x="24"
        y="28"
        width="8"
        height="4"
        fill="currentColor"
        className={animate ? 'animate-rectangle-reveal' : ''}
        style={animate ? { animationDelay: '320ms' } : {}}
      />
      {/* Leg/foot - snaps into place */}
      <rect
        x="32"
        y="32"
        width="8"
        height="8"
        fill="currentColor"
        className={animate ? 'animate-rectangle-reveal origin-top' : ''}
        style={animate ? { animationDelay: '400ms' } : {}}
      />
      </svg>
    </div>
  )
}

/**
 * Animated logo with geometric wordmark.
 * The R mark animates first (0-400ms), then wordmark follows (500ms+).
 * Both use same 48px canvas proportions for perfect alignment.
 */
export function LogoAnimatedWithText({
  size = 32,
  className,
  animate = true,
}: LogoAnimatedProps) {
  // R mark animation ends at ~400ms (6 rectangles × ~80ms stagger)
  // Wordmark starts at 500ms for smooth sequence
  const wordmarkStartDelay = 500

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      role="img"
      aria-label="Reconcile"
    >
      <LogoAnimated size={size} animate={animate} />
      <LogoWordmarkAnimated
        height={size} // Same size as R mark for perfect alignment
        animate={animate}
        startDelay={wordmarkStartDelay}
        className="text-foreground"
      />
    </div>
  )
}
