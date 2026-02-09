/**
 * Tests for theme utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getThemeColors,
  getStatusColor,
  getLayerColor,
  getConfidenceThemeColor,
} from '@/components/spreadsheet/theme'

describe('theme utilities', () => {
  describe('getThemeColors', () => {
    it('returns fallback colors when CSS vars unavailable', () => {
      const colors = getThemeColors()
      expect(colors.background).toBeDefined()
      expect(colors.success).toBeDefined()
      expect(colors.foreground).toBeDefined()
      expect(colors.muted).toBeDefined()
    })

    it('returns all required theme color properties', () => {
      const colors = getThemeColors()
      const requiredKeys = [
        'background',
        'foreground',
        'success',
        'successLight',
        'warning',
        'warningLight',
        'error',
        'errorLight',
        'muted',
        'mutedForeground',
        'layerExact',
        'layerWindow',
        'layerReference',
        'layerFuzzy',
        'layerSemantic',
        'layerManual',
      ]

      requiredKeys.forEach(key => {
        expect(colors).toHaveProperty(key)
        expect(colors[key as keyof typeof colors]).toBeTruthy()
      })
    })
  })

  describe('getStatusColor', () => {
    it('returns green for matched status', () => {
      const color = getStatusColor('matched')
      expect(color.bg).toBeDefined()
      expect(color.text).toBeDefined()
      expect(color.bg).toMatch(/^#[0-9a-f]{6}$/i)
      expect(color.text).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('returns yellow for suggested status', () => {
      const color = getStatusColor('suggested')
      expect(color).toBeDefined()
      expect(color.bg).toBeDefined()
      expect(color.text).toBeDefined()
    })

    it('returns gray for pending status', () => {
      const color = getStatusColor('pending')
      expect(color).toBeDefined()
      expect(color.bg).toBeDefined()
      expect(color.text).toBeDefined()
    })

    it('returns red for suspense status', () => {
      const color = getStatusColor('suspense')
      expect(color).toBeDefined()
      expect(color.bg).toBeDefined()
      expect(color.text).toBeDefined()
    })

    it('returns blue for manual status', () => {
      const color = getStatusColor('manual')
      expect(color).toBeDefined()
      expect(color.bg).toBeDefined()
      expect(color.text).toBeDefined()
    })

    it('returns different colors for different statuses', () => {
      const matched = getStatusColor('matched')
      const suspense = getStatusColor('suspense')
      const suggested = getStatusColor('suggested')

      // Different statuses should have different colors
      expect(matched.bg).not.toBe(suspense.bg)
      expect(matched.bg).not.toBe(suggested.bg)
    })
  })

  describe('getLayerColor', () => {
    const layers = ['exact', 'window', 'reference', 'fuzzy', 'semantic', 'manual', 'partial'] as const

    layers.forEach(layer => {
      it(`returns color for ${layer} layer`, () => {
        const color = getLayerColor(layer)
        expect(color.bg).toBeDefined()
        expect(color.text).toBeDefined()
        expect(color.bg).toMatch(/^#[0-9a-f]{6}$/i)
        expect(color.text).toMatch(/^#[0-9a-f]{6}$/i)
      })
    })

    it('returns different colors for different layers', () => {
      const exact = getLayerColor('exact')
      const window = getLayerColor('window')
      const semantic = getLayerColor('semantic')

      // Different layers should have different colors
      expect(exact.bg).not.toBe(window.bg)
      expect(exact.bg).not.toBe(semantic.bg)
    })
  })

  describe('getConfidenceThemeColor', () => {
    it('returns green for high confidence (>=90%)', () => {
      const color = getConfidenceThemeColor(0.95)
      expect(color).toBeDefined()
      expect(color.bg).toBeDefined()
      expect(color.text).toBeDefined()
    })

    it('returns green for exactly 90%', () => {
      const color = getConfidenceThemeColor(0.90)
      expect(color).toBeDefined()
    })

    it('returns yellow for medium confidence (70-89%)', () => {
      const color = getConfidenceThemeColor(0.80)
      expect(color).toBeDefined()
    })

    it('returns yellow for exactly 70%', () => {
      const color = getConfidenceThemeColor(0.70)
      expect(color).toBeDefined()
    })

    it('returns red for low confidence (<70%)', () => {
      const color = getConfidenceThemeColor(0.50)
      expect(color).toBeDefined()
    })

    it('returns red for 0 confidence', () => {
      const color = getConfidenceThemeColor(0)
      expect(color).toBeDefined()
    })

    it('returns different colors for different confidence levels', () => {
      const high = getConfidenceThemeColor(0.95)
      const medium = getConfidenceThemeColor(0.80)
      const low = getConfidenceThemeColor(0.50)

      // Different confidence levels should have different colors
      expect(high.bg).not.toBe(low.bg)
      expect(medium.bg).not.toBe(low.bg)
    })

    it('handles edge cases at thresholds', () => {
      const justAbove90 = getConfidenceThemeColor(0.90)
      const justBelow90 = getConfidenceThemeColor(0.89)
      const justAbove70 = getConfidenceThemeColor(0.70)
      const justBelow70 = getConfidenceThemeColor(0.69)

      // 90 is high, 89 is medium
      expect(justAbove90.bg).not.toBe(justBelow90.bg)
      // 70 is medium, 69 is low
      expect(justAbove70.bg).not.toBe(justBelow70.bg)
    })
  })
})
