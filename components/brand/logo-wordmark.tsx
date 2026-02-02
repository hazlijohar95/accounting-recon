'use client'

import { cn } from '@/lib/utils'

interface LogoWordmarkProps {
  height?: number
  className?: string
}

/**
 * Geometric lowercase "econcile" wordmark built from rectangles.
 * Designed to align and balance with the R mark.
 *
 * Design specs (matching R mark proportions):
 * - Canvas: 48px tall (same as R mark canvas)
 * - Content area: y=8 to y=40 (32px, same as R mark content)
 * - Stroke width: 6px (optically balanced with R's 8px - wordmark is denser)
 * - Counter space: 7px (readable)
 * - Letter width: 18px for full letters, 6px for i/l
 * - Letter spacing: 4px
 *
 * Vertical rhythm within 32px content area (y=8 to y=40):
 * - Top bar: y=8, h=6
 * - Top counter: 7px gap
 * - Mid bar: y=21, h=6 (for "e")
 * - Bottom counter: 7px gap
 * - Bottom bar: y=34, h=6
 */
export function LogoWordmark({ height = 48, className }: LogoWordmarkProps) {
  const scale = height / 48
  const viewWidth = 152 // 8 letters with spacing

  return (
    <svg
      width={viewWidth * scale}
      height={height}
      viewBox="0 0 152 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      aria-hidden="true"
    >
      {/* Letter "e" @ x=0, width=18 */}
      {/* Content from y=8 to y=40 (32px), stroke=6px, counters=7px */}
      <rect x="0" y="8" width="18" height="6" fill="currentColor" />
      <rect x="0" y="8" width="6" height="32" fill="currentColor" />
      <rect x="6" y="21" width="12" height="6" fill="currentColor" />
      <rect x="0" y="34" width="18" height="6" fill="currentColor" />

      {/* Letter "c" @ x=22 (18+4), width=18 */}
      <rect x="22" y="8" width="18" height="6" fill="currentColor" />
      <rect x="22" y="8" width="6" height="32" fill="currentColor" />
      <rect x="22" y="34" width="18" height="6" fill="currentColor" />

      {/* Letter "o" @ x=44 (22+18+4), width=18 */}
      <rect x="44" y="8" width="18" height="6" fill="currentColor" />
      <rect x="44" y="8" width="6" height="32" fill="currentColor" />
      <rect x="56" y="8" width="6" height="32" fill="currentColor" />
      <rect x="44" y="34" width="18" height="6" fill="currentColor" />

      {/* Letter "n" @ x=66 (44+18+4), width=18 */}
      <rect x="66" y="8" width="18" height="6" fill="currentColor" />
      <rect x="66" y="8" width="6" height="32" fill="currentColor" />
      <rect x="78" y="8" width="6" height="32" fill="currentColor" />

      {/* Letter "c" @ x=88 (66+18+4), width=18 */}
      <rect x="88" y="8" width="18" height="6" fill="currentColor" />
      <rect x="88" y="8" width="6" height="32" fill="currentColor" />
      <rect x="88" y="34" width="18" height="6" fill="currentColor" />

      {/* Letter "i" @ x=110 (88+18+4), width=6 */}
      <rect x="110" y="8" width="6" height="6" fill="currentColor" />
      <rect x="110" y="18" width="6" height="22" fill="currentColor" />

      {/* Letter "l" @ x=120 (110+6+4), width=6 */}
      <rect x="120" y="8" width="6" height="32" fill="currentColor" />

      {/* Letter "e" @ x=130 (120+6+4), width=18 */}
      <rect x="130" y="8" width="18" height="6" fill="currentColor" />
      <rect x="130" y="8" width="6" height="32" fill="currentColor" />
      <rect x="136" y="21" width="12" height="6" fill="currentColor" />
      <rect x="130" y="34" width="18" height="6" fill="currentColor" />

      {/* Total width: 130 + 18 + 4 padding = 152 */}
    </svg>
  )
}

interface LogoWordmarkAnimatedProps {
  height?: number
  className?: string
  animate?: boolean
  /** Delay before animation starts (ms), useful for sequencing after LogoMark */
  startDelay?: number
}

/**
 * Animated geometric wordmark with staggered rectangle reveal.
 */
export function LogoWordmarkAnimated({
  height = 48,
  className,
  animate = true,
  startDelay = 0,
}: LogoWordmarkAnimatedProps) {
  const scale = height / 48
  const viewWidth = 152

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
      viewBox="0 0 152 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      aria-hidden="true"
    >
      {/* Letter "e" @ x=0 */}
      <rect x="0" y="8" width="18" height="6" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="0" y="8" width="6" height="32" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="6" y="21" width="12" height="6" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="0" y="34" width="18" height="6" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />

      {/* Letter "c" @ x=22 */}
      <rect x="22" y="8" width="18" height="6" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="22" y="8" width="6" height="32" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="22" y="34" width="18" height="6" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />

      {/* Letter "o" @ x=44 */}
      <rect x="44" y="8" width="18" height="6" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="44" y="8" width="6" height="32" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="56" y="8" width="6" height="32" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="44" y="34" width="18" height="6" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />

      {/* Letter "n" @ x=66 */}
      <rect x="66" y="8" width="18" height="6" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="66" y="8" width="6" height="32" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="78" y="8" width="6" height="32" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />

      {/* Letter "c" @ x=88 */}
      <rect x="88" y="8" width="18" height="6" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="88" y="8" width="6" height="32" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="88" y="34" width="18" height="6" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />

      {/* Letter "i" @ x=110 */}
      <rect x="110" y="8" width="6" height="6" fill="currentColor"
        className={animate ? 'animate-rectangle-reveal' : ''} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="110" y="18" width="6" height="22" fill="currentColor"
        className={animate ? 'animate-rectangle-reveal origin-top' : ''} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />

      {/* Letter "l" @ x=120 */}
      <rect x="120" y="8" width="6" height="32" fill="currentColor"
        className={animate ? 'animate-rectangle-reveal origin-top' : ''} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />

      {/* Letter "e" @ x=130 */}
      <rect x="130" y="8" width="18" height="6" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="130" y="8" width="6" height="32" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="136" y="21" width="12" height="6" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
      <rect x="130" y="34" width="18" height="6" fill="currentColor"
        className={animationClass} style={animate ? { animationDelay: `${getDelay()}ms` } : {}} />
    </svg>
  )
}
