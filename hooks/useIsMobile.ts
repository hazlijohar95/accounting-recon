'use client'

/**
 * Mobile Detection Hook.
 *
 * Detects whether the current viewport is mobile-sized using matchMedia.
 * Listens for resize events and updates reactively.
 *
 * @module hooks/useIsMobile
 */

import { useState, useEffect } from 'react'

/** Mobile breakpoint in pixels (matches Tailwind's md breakpoint) */
const MOBILE_BREAKPOINT = 768

/**
 * Detects mobile viewport using matchMedia.
 *
 * Uses the CSS media query API for efficient detection and automatic
 * updates on viewport resize. Returns false during SSR for hydration safety.
 *
 * @returns true on mobile devices (width < 768px), false on desktop
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isMobile = useIsMobile()
 *
 *   return isMobile ? <MobileLayout /> : <DesktopLayout />
 * }
 * ```
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches)
    }

    onChange(mql)
    mql.addEventListener('change', onChange)

    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
