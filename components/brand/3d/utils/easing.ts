/**
 * Custom easing functions for smooth 3D animations.
 */

/**
 * Ease out cubic - decelerating to zero velocity.
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Ease in out cubic - acceleration until halfway, then deceleration.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Ease out back - overshoots then returns.
 */
export function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/**
 * Ease out elastic - exponential decay with bounce.
 */
export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

/**
 * Spring physics simulation for natural motion.
 */
export function spring(
  value: number,
  target: number,
  velocity: number,
  stiffness: number = 100,
  damping: number = 10
): { value: number; velocity: number } {
  const displacement = target - value
  const springForce = displacement * stiffness
  const dampingForce = -velocity * damping
  const acceleration = springForce + dampingForce
  const newVelocity = velocity + acceleration * 0.016 // ~60fps
  const newValue = value + newVelocity * 0.016
  return { value: newValue, velocity: newVelocity }
}

/**
 * Linear interpolation.
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Clamps a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
