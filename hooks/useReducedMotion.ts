'use client'

/**
 * Reduced Motion Preference Hook.
 *
 * Detects whether the user has enabled the "reduce motion" accessibility
 * setting in their operating system. Use this to disable animations for
 * users who are sensitive to motion.
 *
 * @module hooks/useReducedMotion
 */

import { useState, useEffect } from 'react'

/**
 * Detects user's reduced motion preference.
 *
 * Uses the CSS media query `prefers-reduced-motion: reduce` for detection.
 * Returns false during SSR for hydration safety.
 *
 * @returns true if the user prefers reduced motion, false otherwise
 *
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const prefersReducedMotion = useReducedMotion()
 *
 *   // Skip animation for accessibility
 *   if (prefersReducedMotion) {
 *     return <StaticContent />
 *   }
 *
 *   return <AnimatedContent />
 * }
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')

    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(e.matches)
    }

    onChange(mql)
    mql.addEventListener('change', onChange)

    return () => mql.removeEventListener('change', onChange)
  }, [])

  return prefersReducedMotion
}
