/**
 * Reconciliation plugin styling utilities
 *
 * Theme-aware colors for match status and confidence levels.
 */

import type { MatchStatus, MatchLayer } from './types'
import type { CellStyle } from '../../core/types'

// =============================================================================
// THEME DETECTION
// =============================================================================

/**
 * Check if dark mode is active
 */
function isDarkMode(): boolean {
  if (typeof window === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

// =============================================================================
// STATUS COLORS
// =============================================================================

/**
 * Status color definitions (light/dark mode)
 */
const STATUS_COLORS: Record<MatchStatus, { light: CellStyle; dark: CellStyle }> = {
  matched: {
    light: { backgroundColor: '#dcfce7', color: '#166534' },
    dark: { backgroundColor: '#064e3b', color: '#86efac' },
  },
  suggested: {
    light: { backgroundColor: '#fef9c3', color: '#854d0e' },
    dark: { backgroundColor: '#451a03', color: '#fde047' },
  },
  pending: {
    light: { backgroundColor: '#f3f4f6', color: '#374151' },
    dark: { backgroundColor: '#27272a', color: '#a1a1aa' },
  },
  suspense: {
    light: { backgroundColor: '#fee2e2', color: '#991b1b' },
    dark: { backgroundColor: '#450a0a', color: '#fca5a5' },
  },
  manual: {
    light: { backgroundColor: '#dbeafe', color: '#1e40af' },
    dark: { backgroundColor: '#1e3a8a', color: '#93c5fd' },
  },
}

/**
 * Get status color for a given match status
 */
export function getStatusStyle(status: MatchStatus): CellStyle {
  const dark = isDarkMode()
  const colors = STATUS_COLORS[status]
  return dark ? colors.dark : colors.light
}

// =============================================================================
// LAYER COLORS
// =============================================================================

/**
 * Layer color definitions (light/dark mode)
 */
const LAYER_COLORS: Record<MatchLayer, { light: CellStyle; dark: CellStyle }> = {
  exact: {
    light: { backgroundColor: '#dcfce7', color: '#166534' },
    dark: { backgroundColor: '#064e3b', color: '#86efac' },
  },
  window: {
    light: { backgroundColor: '#e0f2fe', color: '#0369a1' },
    dark: { backgroundColor: '#0c4a6e', color: '#7dd3fc' },
  },
  reference: {
    light: { backgroundColor: '#f3e8ff', color: '#7c3aed' },
    dark: { backgroundColor: '#3b0764', color: '#c4b5fd' },
  },
  fuzzy: {
    light: { backgroundColor: '#fef3c7', color: '#b45309' },
    dark: { backgroundColor: '#451a03', color: '#fcd34d' },
  },
  semantic: {
    light: { backgroundColor: '#fce7f3', color: '#be185d' },
    dark: { backgroundColor: '#500724', color: '#f9a8d4' },
  },
  manual: {
    light: { backgroundColor: '#dbeafe', color: '#1e40af' },
    dark: { backgroundColor: '#1e3a8a', color: '#93c5fd' },
  },
  partial: {
    light: { backgroundColor: '#fef3c7', color: '#b45309' },
    dark: { backgroundColor: '#451a03', color: '#fcd34d' },
  },
}

/**
 * Get layer color for a given match layer
 */
export function getLayerStyle(layer: MatchLayer): CellStyle {
  const dark = isDarkMode()
  const colors = LAYER_COLORS[layer]
  return dark ? colors.dark : colors.light
}

// =============================================================================
// CONFIDENCE COLORS
// =============================================================================

/**
 * Confidence threshold boundaries
 */
export const CONFIDENCE_THRESHOLDS = {
  high: 0.90,    // >= 90% = auto-match (green)
  medium: 0.70,  // 70-89% = suggestion (yellow)
  low: 0,        // < 70% = suspense (red)
} as const

/**
 * Confidence color definitions (light/dark mode)
 */
const CONFIDENCE_COLORS = {
  high: {
    light: { backgroundColor: '#dcfce7', color: '#166534' },
    dark: { backgroundColor: '#064e3b', color: '#86efac' },
  },
  medium: {
    light: { backgroundColor: '#fef9c3', color: '#854d0e' },
    dark: { backgroundColor: '#451a03', color: '#fde047' },
  },
  low: {
    light: { backgroundColor: '#fee2e2', color: '#991b1b' },
    dark: { backgroundColor: '#450a0a', color: '#fca5a5' },
  },
}

/**
 * Get confidence-based cell style
 * @param confidence - Value between 0 and 1
 */
export function getConfidenceStyle(confidence: number): CellStyle {
  const dark = isDarkMode()

  if (confidence >= CONFIDENCE_THRESHOLDS.high) {
    return dark ? CONFIDENCE_COLORS.high.dark : CONFIDENCE_COLORS.high.light
  }

  if (confidence >= CONFIDENCE_THRESHOLDS.medium) {
    return dark ? CONFIDENCE_COLORS.medium.dark : CONFIDENCE_COLORS.medium.light
  }

  return dark ? CONFIDENCE_COLORS.low.dark : CONFIDENCE_COLORS.low.light
}

/**
 * Format confidence as percentage string
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

/**
 * Get confidence level label
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= CONFIDENCE_THRESHOLDS.high) return 'high'
  if (confidence >= CONFIDENCE_THRESHOLDS.medium) return 'medium'
  return 'low'
}

// =============================================================================
// STATIC FALLBACK COLORS (for SSR)
// =============================================================================

/**
 * Static status colors for server-side rendering
 * @deprecated Use getStatusStyle() for theme-aware colors
 */
export const STATIC_STATUS_COLORS: Record<MatchStatus, { bg: string; text: string }> = {
  matched: { bg: '#dcfce7', text: '#166534' },
  suggested: { bg: '#fef9c3', text: '#854d0e' },
  pending: { bg: '#f3f4f6', text: '#374151' },
  suspense: { bg: '#fee2e2', text: '#991b1b' },
  manual: { bg: '#dbeafe', text: '#1e40af' },
}

/**
 * Static layer colors for server-side rendering
 * @deprecated Use getLayerStyle() for theme-aware colors
 */
export const STATIC_LAYER_COLORS: Record<MatchLayer, { bg: string; text: string }> = {
  exact: { bg: '#dcfce7', text: '#166534' },
  window: { bg: '#e0f2fe', text: '#0369a1' },
  reference: { bg: '#f3e8ff', text: '#7c3aed' },
  fuzzy: { bg: '#fef3c7', text: '#b45309' },
  semantic: { bg: '#fce7f3', text: '#be185d' },
  manual: { bg: '#dbeafe', text: '#1e40af' },
  partial: { bg: '#fef3c7', text: '#b45309' },
}
