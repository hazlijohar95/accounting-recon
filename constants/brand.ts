/**
 * Brand constants for Reconcile design system.
 * Centralized values for colors, animations, and thresholds.
 */

// ============================================================================
// Brand Colors
// ============================================================================

export const BRAND_COLORS = {
  /** Dark theme background */
  dark: '#0a0a0a',
  /** Light theme background */
  light: '#fafafa',
  /** White */
  white: '#ffffff',
  /** Neutral gray */
  neutral: '#737373',
} as const

// ============================================================================
// Confidence Thresholds
// ============================================================================

export const CONFIDENCE_THRESHOLDS = {
  /** Auto-match threshold (90%+) */
  autoMatch: 90,
  /** Suggestion threshold (70-89%) */
  suggest: 70,
  /** Below suggest = suspense */
  suspense: 0,
} as const

export type ConfidenceLevel = 'high' | 'medium' | 'low'

/**
 * Get confidence level based on score.
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.autoMatch) return 'high'
  if (score >= CONFIDENCE_THRESHOLDS.suggest) return 'medium'
  return 'low'
}

// ============================================================================
// Animation Timings
// ============================================================================

export const ANIMATION_TIMINGS = {
  /** Fast micro-interactions (150ms) */
  fast: 150,
  /** Standard transitions (300ms) */
  standard: 300,
  /** Medium animations (500ms) */
  medium: 500,
  /** Slow/emphasis animations (800ms) */
  slow: 800,
  /** Loading/progress animations (1000ms) */
  loading: 1000,
  /** Copy-to-clipboard reset delay (2000ms) */
  copyReset: 2000,
} as const

// ============================================================================
// Matching Layer Colors
// ============================================================================

export const MATCHING_LAYER_COLORS = {
  exact: 'text-foreground',
  window: 'text-foreground/80',
  reference: 'text-foreground/60',
  fuzzy: 'text-foreground/50',
  llm: 'text-foreground/40',
} as const

// ============================================================================
// Social Media Dimensions
// ============================================================================

export const SOCIAL_DIMENSIONS = {
  ogImage: { width: 1200, height: 630 },
  twitterCard: { width: 1200, height: 600 },
  banner: { width: 1920, height: 480 },
  instagramPoster: { width: 1080, height: 1350 },
  favicon: { width: 32, height: 32 },
} as const
