'use client'

import { useState, useEffect, useRef, RefObject } from 'react'
import { useReducedMotion } from './useReducedMotion'

interface UseIntersectionAnimationOptions {
  /** Whether to animate (default: true) */
  animate?: boolean
  /** Intersection threshold (0-1, default: 0.1) */
  threshold?: number
  /** Only trigger animation once (default: true) */
  triggerOnce?: boolean
  /** Root margin for intersection observer */
  rootMargin?: string
}

interface UseIntersectionAnimationReturn<T extends HTMLElement> {
  /** Ref to attach to the element to observe */
  ref: RefObject<T | null>
  /** Whether the element is visible (for triggering animations) */
  isVisible: boolean
  /** Whether animation has been triggered */
  hasAnimated: boolean
}

/**
 * Hook for triggering animations when an element enters the viewport.
 * Uses IntersectionObserver for efficient scroll-based detection.
 * Respects user's reduced motion preferences.
 *
 * @example
 * ```tsx
 * function AnimatedChart({ data }: { data: number[] }) {
 *   const { ref, isVisible } = useIntersectionAnimation<HTMLDivElement>()
 *
 *   return (
 *     <div
 *       ref={ref}
 *       className={cn(
 *         'transition-opacity duration-500',
 *         isVisible ? 'opacity-100' : 'opacity-0'
 *       )}
 *     >
 *       <Chart data={data} animate={isVisible} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useIntersectionAnimation<T extends HTMLElement = HTMLDivElement>({
  animate = true,
  threshold = 0.1,
  triggerOnce = true,
  rootMargin = '0px',
}: UseIntersectionAnimationOptions = {}): UseIntersectionAnimationReturn<T> {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = animate && !prefersReducedMotion
  const [isVisible, setIsVisible] = useState(!shouldAnimate)
  const [hasAnimated, setHasAnimated] = useState(false)
  const [element, setElement] = useState<T | null>(null)
  const ref = useRef<T>(null)

  // Sync ref to state so the effect re-runs when the DOM element attaches
  useEffect(() => {
    setElement(ref.current)
  })

  useEffect(() => {
    // If animation is disabled or reduced motion is preferred, show immediately
    if (!shouldAnimate) {
      setIsVisible(true)
      setHasAnimated(true)
      return
    }

    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          setHasAnimated(true)
          if (triggerOnce) {
            observer.disconnect()
          }
        } else if (!triggerOnce) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [shouldAnimate, threshold, rootMargin, triggerOnce, element])

  return { ref, isVisible, hasAnimated }
}
