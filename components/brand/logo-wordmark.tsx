'use client'

import { cn } from '@/lib/utils'

interface LogoWordmarkProps {
  height?: number
  className?: string
}

/**
 * Geometric lowercase "econcile" wordmark with proper typographic proportions.
 *
 * Design specs:
 * - Canvas: 48px (matches R mark)
 * - Baseline: y=40 (same as R bottom)
 * - x-height: 24px (y=16 to y=40) - lowercase e, c, o, n
 * - Ascender: y=8 (same as R top) - for l and i's dot
 * - Stroke: 5px (lighter than R's 8px for optical balance)
 * - Counter: 5px (readable negative space)
 * - Letter width: 15px for x-height letters, 5px for i/l
 * - Letter spacing: 3px
 */
export function LogoWordmark({ height = 48, className }: LogoWordmarkProps) {
  const scale = height / 48
  const viewWidth = 124

  return (
    <svg
      width={viewWidth * scale}
      height={height}
      viewBox="0 0 124 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      aria-hidden="true"
    >
      {/*
        Lowercase letter structure (x-height = 24px, y=16 to y=40):
        - Top bar: y=16, h=5
        - Counter: 5px gap
        - Mid bar: y=26, h=5 (for "e")
        - Counter: 5px gap
        - Bottom bar: y=35, h=5
      */}

      {/* Letter "e" @ x=0, width=15, x-height */}
      <rect x="0" y="16" width="15" height="5" fill="currentColor" />
      <rect x="0" y="16" width="5" height="24" fill="currentColor" />
      <rect x="5" y="26" width="10" height="5" fill="currentColor" />
      <rect x="0" y="35" width="15" height="5" fill="currentColor" />

      {/* Letter "c" @ x=18, width=15, x-height */}
      <rect x="18" y="16" width="15" height="5" fill="currentColor" />
      <rect x="18" y="16" width="5" height="24" fill="currentColor" />
      <rect x="18" y="35" width="15" height="5" fill="currentColor" />

      {/* Letter "o" @ x=36, width=15, x-height */}
      <rect x="36" y="16" width="15" height="5" fill="currentColor" />
      <rect x="36" y="16" width="5" height="24" fill="currentColor" />
      <rect x="46" y="16" width="5" height="24" fill="currentColor" />
      <rect x="36" y="35" width="15" height="5" fill="currentColor" />

      {/* Letter "n" @ x=54, width=15, x-height */}
      <rect x="54" y="16" width="15" height="5" fill="currentColor" />
      <rect x="54" y="16" width="5" height="24" fill="currentColor" />
      <rect x="64" y="16" width="5" height="24" fill="currentColor" />

      {/* Letter "c" @ x=72, width=15, x-height */}
      <rect x="72" y="16" width="15" height="5" fill="currentColor" />
      <rect x="72" y="16" width="5" height="24" fill="currentColor" />
      <rect x="72" y="35" width="15" height="5" fill="currentColor" />

      {/* Letter "i" @ x=90, width=5, has tittle (dot) at ascender height */}
      <rect x="90" y="8" width="5" height="5" fill="currentColor" />
      <rect x="90" y="16" width="5" height="24" fill="currentColor" />

      {/* Letter "l" @ x=98, width=5, ascender (full height like R) */}
      <rect x="98" y="8" width="5" height="32" fill="currentColor" />

      {/* Letter "e" @ x=106, width=15, x-height */}
      <rect x="106" y="16" width="15" height="5" fill="currentColor" />
      <rect x="106" y="16" width="5" height="24" fill="currentColor" />
      <rect x="111" y="26" width="10" height="5" fill="currentColor" />
      <rect x="106" y="35" width="15" height="5" fill="currentColor" />
    </svg>
  )
}

interface LogoWordmarkAnimatedProps {
  height?: number
  className?: string
  animate?: boolean
  startDelay?: number
}

export function LogoWordmarkAnimated({
  height = 48,
  className,
  animate = true,
  startDelay = 0,
}: LogoWordmarkAnimatedProps) {
  const scale = height / 48
  const viewWidth = 124

  const stagger = 25
  let rectIndex = 0
  const getDelay = () => {
    const delay = startDelay + rectIndex * stagger
    rectIndex++
    return delay
  }

  const animationClass = animate ? 'animate-rectangle-reveal origin-left' : ''

  return (
    <svg
      width={viewWidth * scale}
      height={height}
      viewBox="0 0 124 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      aria-hidden="true"
    >
      {/* Letter "e" @ x=0 */}
      <rect x="0" y="16" width="15" height="5" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="0" y="16" width="5" height="24" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="5" y="26" width="10" height="5" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="0" y="35" width="15" height="5" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />

      {/* Letter "c" @ x=18 */}
      <rect x="18" y="16" width="15" height="5" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="18" y="16" width="5" height="24" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="18" y="35" width="15" height="5" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />

      {/* Letter "o" @ x=36 */}
      <rect x="36" y="16" width="15" height="5" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="36" y="16" width="5" height="24" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="46" y="16" width="5" height="24" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="36" y="35" width="15" height="5" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />

      {/* Letter "n" @ x=54 */}
      <rect x="54" y="16" width="15" height="5" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="54" y="16" width="5" height="24" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="64" y="16" width="5" height="24" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />

      {/* Letter "c" @ x=72 */}
      <rect x="72" y="16" width="15" height="5" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="72" y="16" width="5" height="24" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="72" y="35" width="15" height="5" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />

      {/* Letter "i" @ x=90 */}
      <rect x="90" y="8" width="5" height="5" fill="currentColor"
        className={animate ? 'animate-rectangle-reveal' : ''} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="90" y="16" width="5" height="24" fill="currentColor"
        className={animate ? 'animate-rectangle-reveal origin-top' : ''} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />

      {/* Letter "l" @ x=98 */}
      <rect x="98" y="8" width="5" height="32" fill="currentColor"
        className={animate ? 'animate-rectangle-reveal origin-top' : ''} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />

      {/* Letter "e" @ x=106 */}
      <rect x="106" y="16" width="15" height="5" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="106" y="16" width="5" height="24" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="111" y="26" width="10" height="5" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="106" y="35" width="15" height="5" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
    </svg>
  )
}
