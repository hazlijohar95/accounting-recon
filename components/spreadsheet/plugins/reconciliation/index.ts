/**
 * Reconciliation Plugin for Generic Spreadsheet
 *
 * Provides reconciliation-specific features:
 * - Match status cell styling
 * - Confidence level styling
 * - Match layer badges
 * - Column presets for transactions/invoices
 * - Toolbar items for reconciliation actions
 */

import type {
  SpreadsheetPlugin,
  SpreadsheetAPI,
  ColumnPreset,
  CellStyle,
  CellReference,
  ColumnDef,
  SheetRow,
  CellValue,
  ToolbarItem,
  ContextMenuItem,
} from '../../core/types'
import { toA1Notation } from '../../core/types'
import type { ReconciliationPluginConfig, MatchStatus, MatchLayer } from './types'
import { DEFAULT_PLUGIN_CONFIG } from './types'
import { getStatusStyle, getConfidenceStyle, getLayerStyle, CONFIDENCE_THRESHOLDS } from './styling'
import { RECONCILIATION_PRESETS, COLUMN_INDICES } from './presets'

// Re-export types and utilities
export * from './types'
export * from './styling'
export * from './presets'

// =============================================================================
// PLUGIN IMPLEMENTATION
// =============================================================================

/**
 * Create a reconciliation plugin instance
 */
export function createReconciliationPlugin(
  config: ReconciliationPluginConfig = {}
): SpreadsheetPlugin {
  const pluginConfig = { ...DEFAULT_PLUGIN_CONFIG, ...config }
  let apiRef: SpreadsheetAPI | null = null
  let isEnabled = true

  return {
    name: 'reconciliation',
    version: '1.0.0',

    /**
     * Initialize plugin with spreadsheet API
     */
    onInit: (api: SpreadsheetAPI) => {
      apiRef = api
    },

    /**
     * Cleanup on destroy
     */
    onDestroy: () => {
      apiRef = null
    },

    /**
     * Get column presets for reconciliation
     */
    getColumnPresets: (): ColumnPreset[] => {
      return RECONCILIATION_PRESETS
    },

    /**
     * Get cell styling based on reconciliation data
     */
    getCellStyle: (
      cell: CellReference,
      value: CellValue,
      row: SheetRow,
      column: ColumnDef
    ): CellStyle | null => {
      if (!isEnabled) return null

      // Check if this is a status column
      if (
        pluginConfig.enableStatusStyling &&
        column.name.toLowerCase().includes('status')
      ) {
        const status = value as MatchStatus
        if (isValidStatus(status)) {
          return getStatusStyle(status)
        }
      }

      // Check if this is a confidence column
      if (
        pluginConfig.enableConfidenceStyling &&
        column.name.toLowerCase().includes('confidence')
      ) {
        const confidence = typeof value === 'number' ? value : parseFloat(String(value))
        if (!isNaN(confidence)) {
          // Normalize confidence to 0-1 if it's a percentage
          const normalizedConfidence = confidence > 1 ? confidence / 100 : confidence
          return getConfidenceStyle(normalizedConfidence)
        }
      }

      // Check if row has matchedBy layer for layer styling
      if (pluginConfig.enableLayerStyling) {
        const matchedBy = row.matchedBy as MatchLayer | undefined
        if (matchedBy && isValidLayer(matchedBy)) {
          // Apply lighter styling to entire row for matched items
          if (row.matchStatus === 'matched' || row.matchStatus === 'suggested') {
            const style = getLayerStyle(matchedBy)
            return {
              backgroundColor: style.backgroundColor + '40', // Add transparency
            }
          }
        }
      }

      return null
    },

    /**
     * Get toolbar items for reconciliation
     */
    getToolbarItems: (): ToolbarItem[] => {
      return [
        {
          id: 'reconciliation-toggle',
          label: isEnabled ? 'Hide Styling' : 'Show Styling',
          tooltip: 'Toggle reconciliation styling',
          onClick: () => {
            isEnabled = !isEnabled
            // Re-apply styling by triggering a refresh
            if (apiRef) {
              const data = apiRef.getData()
              apiRef.setData(data.columns, data.rows)
            }
          },
        },
        {
          id: 'reconciliation-separator',
          type: 'separator',
          label: '',
          onClick: () => {},
        },
        {
          id: 'import-transactions',
          label: 'Import',
          icon: 'upload',
          tooltip: 'Import bank transactions',
          onClick: () => {
            // This would be wired up to actual import logic
            console.log('Import transactions clicked')
          },
        },
        {
          id: 'run-matching',
          label: 'Match',
          icon: 'link',
          tooltip: 'Run automatic matching',
          onClick: () => {
            console.log('Run matching clicked')
          },
        },
      ]
    },

    /**
     * Get context menu items for reconciliation
     */
    getContextMenuItems: (): ContextMenuItem[] => {
      return [
        {
          id: 'set-status-matched',
          label: 'Mark as Matched',
          icon: 'check',
          showOn: ['cell', 'row-header'],
          onClick: (selection) => {
            console.log('Mark as matched:', selection)
          },
        },
        {
          id: 'set-status-suspense',
          label: 'Mark as Suspense',
          icon: 'alert',
          showOn: ['cell', 'row-header'],
          onClick: (selection) => {
            console.log('Mark as suspense:', selection)
          },
        },
        {
          id: 'clear-match',
          label: 'Clear Match',
          icon: 'x',
          showOn: ['cell', 'row-header'],
          onClick: (selection) => {
            console.log('Clear match:', selection)
          },
        },
      ]
    },
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Type guard for valid match status
 */
function isValidStatus(status: unknown): status is MatchStatus {
  return (
    typeof status === 'string' &&
    ['matched', 'suggested', 'pending', 'suspense', 'manual'].includes(status)
  )
}

/**
 * Type guard for valid match layer
 */
function isValidLayer(layer: unknown): layer is MatchLayer {
  return (
    typeof layer === 'string' &&
    ['exact', 'window', 'reference', 'fuzzy', 'semantic', 'manual', 'partial'].includes(layer)
  )
}

/**
 * Apply reconciliation styling to a range of cells
 */
export function applyReconciliationStyling(
  api: SpreadsheetAPI,
  rows: SheetRow[],
  sheetType: 'transactions' | 'invoices'
): void {
  const indices = COLUMN_INDICES[sheetType]

  rows.forEach((row, rowIndex) => {
    // Style status cell
    const status = row.matchStatus as MatchStatus
    if (isValidStatus(status)) {
      const style = getStatusStyle(status)
      api.setCellStyle({ row: rowIndex, col: indices.status }, style)
    }

    // Style confidence cell
    const confidence = row.matchConfidence as number | undefined
    if (typeof confidence === 'number') {
      const normalizedConfidence = confidence > 1 ? confidence / 100 : confidence
      const style = getConfidenceStyle(normalizedConfidence)
      api.setCellStyle({ row: rowIndex, col: indices.confidence }, style)
    }
  })
}

/**
 * Determine match status from confidence score
 */
export function getStatusFromConfidence(confidence: number): MatchStatus {
  if (confidence >= CONFIDENCE_THRESHOLDS.high) return 'matched'
  if (confidence >= CONFIDENCE_THRESHOLDS.medium) return 'suggested'
  return 'suspense'
}

/**
 * Layer number to name mapping
 */
export const LAYER_MAP: Record<number, MatchLayer> = {
  1: 'exact',
  2: 'window',
  3: 'reference',
  4: 'fuzzy',
  5: 'semantic',
  6: 'manual',
  7: 'partial',
}

/**
 * Convert layer number to layer name
 */
export function getLayerName(layerNumber: number): MatchLayer {
  return LAYER_MAP[layerNumber] || 'manual'
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Default reconciliation plugin instance
 */
export const reconciliationPlugin = createReconciliationPlugin()
