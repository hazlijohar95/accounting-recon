'use client'

import { useState, useEffect, useRef } from 'react'
import { useReducedMotion } from './useReducedMotion'

interface UseValueAnimationOptions {
  /** Target value to animate to */
  value: number
  /** Whether to animate (default: true) */
  animate?: boolean
  /** Animation duration in ms (default: 800) */
  duration?: number
  /** Starting value (default: 0) */
  startValue?: number
  /** Easing function type (default: 'easeOutCubic') */
  easing?: 'linear' | 'easeOutCubic' | 'easeInOutCubic'
  /** Only animate once, on first render (default: true) */
  animateOnce?: boolean
}

interface UseValueAnimationReturn {
  /** Current animated value */
  displayValue: number
  /** Whether animation is currently running */
  isAnimating: boolean
}

/**
 * Easing functions for smooth animations
 */
const easingFunctions = {
  linear: (t: number) => t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
}

/**
 * Hook for animating numeric values with easing.
 * Respects user's reduced motion preferences.
 *
 * @example
 * ```tsx
 * function Counter({ value }: { value: number }) {
 *   const { displayValue } = useValueAnimation({ value, duration: 800 })
 *   return <span>{Math.round(displayValue).toLocaleString()}</span>
 * }
 * ```
 */
export function useValueAnimation({
  value,
  animate = true,
  duration = 800,
  startValue = 0,
  easing = 'easeOutCubic',
  animateOnce = true,
}: UseValueAnimationOptions): UseValueAnimationReturn {
  const prefersReducedMotion = useReducedMotion()
  const [displayValue, setDisplayValue] = useState(
    prefersReducedMotion || !animate ? value : startValue
  )
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<number | null>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    // Skip animation if reduced motion preference or disabled
    if (prefersReducedMotion || !animate) {
      setDisplayValue(value)
      return
    }

    // Skip if already animated and animateOnce is true
    if (animateOnce && hasAnimated.current) {
      setDisplayValue(value)
      return
    }

    hasAnimated.current = true
    setIsAnimating(true)
    const startTime = performance.now()
    const easingFn = easingFunctions[easing]

    const animateValue = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = easingFn(progress)
      const current = startValue + (value - startValue) * eased

      setDisplayValue(current)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateValue)
      } else {
        setIsAnimating(false)
      }
    }

    animationRef.current = requestAnimationFrame(animateValue)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, animate, duration, startValue, easing, prefersReducedMotion, animateOnce])

  return { displayValue, isAnimating }
}
