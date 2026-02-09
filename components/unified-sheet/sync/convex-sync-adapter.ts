/**
 * Convex Sync Adapter for Univer Spreadsheet
 *
 * Handles bidirectional synchronization between Univer.js and Convex:
 * - Debounced cell value persistence
 * - Optimistic concurrency control
 * - Batch updates for rapid edits
 * - Conflict resolution
 *
 * @module components/unified-sheet/sync/convex-sync-adapter
 */

import type { CellChangeEvent } from '@/components/spreadsheet/use-univer-api'

/**
 * Configuration for the sync adapter
 */
export interface SyncConfig {
  /** Debounce delay in ms before saving (default: 500) */
  debounceMs: number
  /** Batch window in ms for aggregating rapid changes (default: 100) */
  batchWindowMs: number
  /** Force save immediately on blur/navigate (default: true) */
  forceSaveOnBlur: boolean
  /** Enable optimistic concurrency control (default: true) */
  useOptimisticConcurrency: boolean
  /** Max retries for failed saves (default: 3) */
  maxRetries: number
}

/**
 * Default sync configuration
 */
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  debounceMs: 500,
  batchWindowMs: 100,
  forceSaveOnBlur: true,
  useOptimisticConcurrency: true,
  maxRetries: 3,
}

/**
 * Pending change to be synced
 */
export interface PendingChange {
  sheetId: string
  sheetName: string
  row: number
  column: number
  value: unknown
  timestamp: number
  retryCount: number
}

/**
 * Row version tracking for optimistic concurrency
 */
interface RowVersions {
  [rowId: string]: number
}

/**
 * Callback to save a cell to Convex
 */
export type SaveCellFn = (
  worksheetId: string,
  rowNumber: number,
  columnKey: string,
  value: unknown,
  expectedVersion?: number
) => Promise<{ version?: number; error?: string }>

/**
 * Callback to get row ID from sheet coordinates
 */
export type GetRowIdFn = (
  worksheetId: string,
  rowNumber: number
) => Promise<string | null>

/**
 * Sync status
 */
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

/**
 * Sync event listener
 */
export type SyncEventListener = (event: {
  status: SyncStatus
  pendingCount: number
  lastError?: string
  lastSyncTime?: number
}) => void

/**
 * Convex Sync Adapter
 *
 * Manages synchronization between Univer spreadsheet and Convex database.
 * Uses debouncing to prevent excessive API calls during rapid editing.
 */
export class ConvexSyncAdapter {
  private config: SyncConfig
  private pendingChanges: Map<string, PendingChange> = new Map()
  private rowVersions: RowVersions = {}
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private batchTimer: ReturnType<typeof setTimeout> | null = null
  private status: SyncStatus = 'idle'
  private listeners: Set<SyncEventListener> = new Set()
  private lastSyncTime?: number
  private lastError?: string
  private saveCellFn?: SaveCellFn
  private getRowIdFn?: GetRowIdFn

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config }
  }

  /**
   * Initialize the adapter with Convex mutation functions
   */
  initialize(saveCellFn: SaveCellFn, getRowIdFn: GetRowIdFn): void {
    this.saveCellFn = saveCellFn
    this.getRowIdFn = getRowIdFn
  }

  /**
   * Add a sync event listener
   */
  addListener(listener: SyncEventListener): () => void {
    this.listeners.add(listener)
    // Immediately notify of current status
    listener({
      status: this.status,
      pendingCount: this.pendingChanges.size,
      lastError: this.lastError,
      lastSyncTime: this.lastSyncTime,
    })
    return () => this.listeners.delete(listener)
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(): void {
    const event = {
      status: this.status,
      pendingCount: this.pendingChanges.size,
      lastError: this.lastError,
      lastSyncTime: this.lastSyncTime,
    }
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Sync listener error:', error)
      }
    })
  }

  /**
   * Generate a unique key for a cell change
   */
  private getCellKey(sheetId: string, row: number, column: number): string {
    return `${sheetId}:${row}:${column}`
  }

  /**
   * Generate a column key from column number (e.g., 0 -> "col_0")
   */
  private getColumnKey(column: number): string {
    return `col_${column}`
  }

  /**
   * Handle a cell change from Univer
   */
  handleCellChange(event: CellChangeEvent): void {
    const key = this.getCellKey(event.sheetId, event.row, event.column)

    // Aggregate changes - newer values overwrite older ones for same cell
    this.pendingChanges.set(key, {
      sheetId: event.sheetId,
      sheetName: event.sheetName,
      row: event.row,
      column: event.column,
      value: event.value,
      timestamp: Date.now(),
      retryCount: 0,
    })

    // Start batch timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.batchTimer = null
        this.scheduleSave()
      }, this.config.batchWindowMs)
    }
  }

  /**
   * Schedule a debounced save
   */
  private scheduleSave(): void {
    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    // Set new debounce timer
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      this.flush()
    }, this.config.debounceMs)

    this.notifyListeners()
  }

  /**
   * Flush all pending changes immediately
   */
  async flush(): Promise<void> {
    if (this.pendingChanges.size === 0) {
      return
    }

    if (!this.saveCellFn || !this.getRowIdFn) {
      console.warn('[ConvexSyncAdapter] Not initialized - changes will be lost')
      return
    }

    // Clear timers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    this.status = 'syncing'
    this.notifyListeners()

    // Get all pending changes
    const changes = Array.from(this.pendingChanges.values())
    this.pendingChanges.clear()

    // Group changes by row for batch efficiency
    const changesByRow = new Map<string, PendingChange[]>()
    for (const change of changes) {
      const rowKey = `${change.sheetId}:${change.row}`
      if (!changesByRow.has(rowKey)) {
        changesByRow.set(rowKey, [])
      }
      changesByRow.get(rowKey)!.push(change)
    }

    // Process each row's changes
    const results: Array<{ success: boolean; change: PendingChange; error?: string }> = []

    for (const [rowKey, rowChanges] of changesByRow) {
      // For now, save each cell individually
      // Future optimization: batch update entire row
      for (const change of rowChanges) {
        try {
          const rowId = await this.getRowIdFn(change.sheetId, change.row)

          if (!rowId) {
            // Row doesn't exist yet - might need to create it
            console.warn(`[ConvexSyncAdapter] Row not found: sheet=${change.sheetId}, row=${change.row}`)
            results.push({
              success: false,
              change,
              error: 'Row not found',
            })
            continue
          }

          const columnKey = this.getColumnKey(change.column)
          const expectedVersion = this.config.useOptimisticConcurrency
            ? this.rowVersions[rowId]
            : undefined

          const result = await this.saveCellFn(
            change.sheetId,
            change.row,
            columnKey,
            change.value,
            expectedVersion
          )

          if (result.error) {
            results.push({
              success: false,
              change,
              error: result.error,
            })
          } else {
            // Update version tracking
            if (result.version !== undefined && this.config.useOptimisticConcurrency) {
              this.rowVersions[rowId] = result.version
            }
            results.push({ success: true, change })
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.push({
            success: false,
            change,
            error: errorMessage,
          })
        }
      }
    }

    // Handle failed saves
    const failures = results.filter(r => !r.success)
    if (failures.length > 0) {
      // Retry failed changes
      for (const { change, error } of failures) {
        if (change.retryCount < this.config.maxRetries) {
          change.retryCount++
          const key = this.getCellKey(change.sheetId, change.row, change.column)
          this.pendingChanges.set(key, change)
          console.warn(`[ConvexSyncAdapter] Retrying save (attempt ${change.retryCount}): ${error}`)
        } else {
          console.error(`[ConvexSyncAdapter] Max retries exceeded: ${error}`)
          this.lastError = error
        }
      }

      // Schedule retry if there are pending changes
      if (this.pendingChanges.size > 0) {
        this.scheduleSave()
        this.status = 'error'
      } else {
        this.status = failures.length === results.length ? 'error' : 'idle'
      }
    } else {
      this.status = 'idle'
      this.lastSyncTime = Date.now()
      this.lastError = undefined
    }

    this.notifyListeners()
  }

  /**
   * Force immediate save (for blur/navigate events)
   */
  async forceSave(): Promise<void> {
    await this.flush()
  }

  /**
   * Set row version (for initial load)
   */
  setRowVersion(rowId: string, version: number): void {
    this.rowVersions[rowId] = version
  }

  /**
   * Get pending change count
   */
  getPendingCount(): number {
    return this.pendingChanges.size
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return this.status
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.pendingChanges.size > 0 || this.status === 'syncing'
  }

  /**
   * Dispose of the adapter
   */
  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
    this.pendingChanges.clear()
    this.rowVersions = {}
    this.listeners.clear()
  }
}

/**
 * Create a new sync adapter instance.
 *
 * IMPORTANT: Each worksheet should have its own adapter instance.
 * The singleton pattern was removed because sharing adapters across
 * worksheets caused pending changes to mix between different worksheets.
 *
 * @param config - Optional configuration overrides
 * @returns A new ConvexSyncAdapter instance
 */
export function createSyncAdapter(config?: Partial<SyncConfig>): ConvexSyncAdapter {
  return new ConvexSyncAdapter(config)
}
