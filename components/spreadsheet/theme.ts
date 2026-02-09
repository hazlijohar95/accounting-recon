/**
 * Theme utilities for Univer spreadsheet
 *
 * Provides CSS variable-based theming for dark mode support.
 * Colors are resolved at runtime from CSS custom properties.
 */

export interface ThemeColors {
  background: string
  foreground: string
  success: string
  successLight: string
  warning: string
  warningLight: string
  error: string
  errorLight: string
  muted: string
  mutedForeground: string
  layerExact: string
  layerWindow: string
  layerReference: string
  layerFuzzy: string
  layerSemantic: string
  layerManual: string
}

// Fallback colors for when CSS variables aren't available (SSR)
const FALLBACK_COLORS: ThemeColors = {
  background: '#ffffff',
  foreground: '#0a0a0a',
  success: '#059669',
  successLight: '#dcfce7',
  warning: '#d97706',
  warningLight: '#fef9c3',
  error: '#dc2626',
  errorLight: '#fee2e2',
  muted: '#f4f4f5',
  mutedForeground: '#71717a',
  layerExact: '#dcfce7',
  layerWindow: '#e0f2fe',
  layerReference: '#f3e8ff',
  layerFuzzy: '#fef3c7',
  layerSemantic: '#fce7f3',
  layerManual: '#dbeafe',
}

// Dark mode fallback colors
const DARK_FALLBACK_COLORS: ThemeColors = {
  background: '#0a0a0a',
  foreground: '#fafafa',
  success: '#10b981',
  successLight: '#064e3b',
  warning: '#f59e0b',
  warningLight: '#451a03',
  error: '#ef4444',
  errorLight: '#450a0a',
  muted: '#27272a',
  mutedForeground: '#a1a1aa',
  layerExact: '#064e3b',
  layerWindow: '#0c4a6e',
  layerReference: '#3b0764',
  layerFuzzy: '#451a03',
  layerSemantic: '#500724',
  layerManual: '#1e3a8a',
}

/**
 * Get computed CSS variable value with fallback
 */
function getCSSVariable(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback

  try {
    const style = getComputedStyle(document.documentElement)
    const value = style.getPropertyValue(name).trim()

    // Handle HSL format from Tailwind v4 (e.g., "240 3.7% 15.9%")
    if (value && !value.startsWith('#') && !value.startsWith('rgb')) {
      // If value looks like HSL components, convert to valid CSS
      if (/^\d/.test(value)) {
        return `hsl(${value})`
      }
    }

    return value || fallback
  } catch {
    return fallback
  }
}

/**
 * Check if dark mode is active
 */
function isDarkMode(): boolean {
  if (typeof window === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

/**
 * Get theme colors from CSS variables with proper dark mode support
 *
 * @returns Theme colors resolved from CSS custom properties
 */
export function getThemeColors(): ThemeColors {
  const dark = isDarkMode()
  const fallback = dark ? DARK_FALLBACK_COLORS : FALLBACK_COLORS

  return {
    background: getCSSVariable('--background', fallback.background),
    foreground: getCSSVariable('--foreground', fallback.foreground),
    success: getCSSVariable('--success', fallback.success),
    successLight: getCSSVariable('--credit-light', fallback.successLight),
    warning: getCSSVariable('--warning', fallback.warning),
    warningLight: getCSSVariable('--warning-light', fallback.warningLight),
    error: getCSSVariable('--error', fallback.error),
    errorLight: getCSSVariable('--debit-light', fallback.errorLight),
    muted: getCSSVariable('--muted', fallback.muted),
    mutedForeground: getCSSVariable('--muted-foreground', fallback.mutedForeground),
    layerExact: getCSSVariable('--layer-exact', fallback.layerExact),
    layerWindow: getCSSVariable('--layer-window', fallback.layerWindow),
    layerReference: getCSSVariable('--layer-reference', fallback.layerReference),
    layerFuzzy: getCSSVariable('--layer-fuzzy', fallback.layerFuzzy),
    layerSemantic: getCSSVariable('--layer-semantic', fallback.layerSemantic),
    layerManual: getCSSVariable('--layer-manual', fallback.layerManual),
  }
}

/**
 * Get status color for a given match status with dark mode support
 */
export function getStatusColor(status: 'matched' | 'suggested' | 'pending' | 'suspense' | 'manual'): { bg: string; text: string } {
  const dark = isDarkMode()

  const colors = {
    matched: {
      bg: dark ? '#064e3b' : '#dcfce7',
      text: dark ? '#86efac' : '#166534',
    },
    suggested: {
      bg: dark ? '#451a03' : '#fef9c3',
      text: dark ? '#fde047' : '#854d0e',
    },
    pending: {
      bg: dark ? '#27272a' : '#f3f4f6',
      text: dark ? '#a1a1aa' : '#374151',
    },
    suspense: {
      bg: dark ? '#450a0a' : '#fee2e2',
      text: dark ? '#fca5a5' : '#991b1b',
    },
    manual: {
      bg: dark ? '#1e3a8a' : '#dbeafe',
      text: dark ? '#93c5fd' : '#1e40af',
    },
  }

  return colors[status]
}

/**
 * Get layer color for a given match layer with dark mode support
 */
export function getLayerColor(layer: 'exact' | 'window' | 'reference' | 'fuzzy' | 'semantic' | 'manual' | 'partial'): { bg: string; text: string } {
  const dark = isDarkMode()

  const colors = {
    exact: {
      bg: dark ? '#064e3b' : '#dcfce7',
      text: dark ? '#86efac' : '#166534',
    },
    window: {
      bg: dark ? '#0c4a6e' : '#e0f2fe',
      text: dark ? '#7dd3fc' : '#0369a1',
    },
    reference: {
      bg: dark ? '#3b0764' : '#f3e8ff',
      text: dark ? '#c4b5fd' : '#7c3aed',
    },
    fuzzy: {
      bg: dark ? '#451a03' : '#fef3c7',
      text: dark ? '#fcd34d' : '#b45309',
    },
    semantic: {
      bg: dark ? '#500724' : '#fce7f3',
      text: dark ? '#f9a8d4' : '#be185d',
    },
    manual: {
      bg: dark ? '#1e3a8a' : '#dbeafe',
      text: dark ? '#93c5fd' : '#1e40af',
    },
    partial: {
      bg: dark ? '#451a03' : '#fef3c7',
      text: dark ? '#fcd34d' : '#b45309',
    },
  }

  return colors[layer]
}

/**
 * Get confidence-based color with dark mode support
 */
export function getConfidenceThemeColor(confidence: number): { bg: string; text: string } {
  const dark = isDarkMode()

  if (confidence >= 0.90) {
    // High confidence (auto-match) - green
    return {
      bg: dark ? '#064e3b' : '#dcfce7',
      text: dark ? '#86efac' : '#166534',
    }
  }

  if (confidence >= 0.70) {
    // Medium confidence (suggest) - yellow
    return {
      bg: dark ? '#451a03' : '#fef9c3',
      text: dark ? '#fde047' : '#854d0e',
    }
  }

  // Low confidence (suspense) - red
  return {
    bg: dark ? '#450a0a' : '#fee2e2',
    text: dark ? '#fca5a5' : '#991b1b',
  }
}
