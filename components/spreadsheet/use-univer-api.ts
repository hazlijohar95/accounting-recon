'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import type {
  FUniver,
  FWorkbook,
  FWorksheet,
  FRange,
  CellMatchMetadata,
  CellNote,
  EnrichedCellValue,
  MatchLayer,
  MatchStatus,
  TransactionRow,
  InvoiceRow,
} from './types'

/**
 * Cell change event payload
 */
export interface CellChangeEvent {
  sheetId: string
  sheetName: string
  row: number
  column: number
  value: unknown
  previousValue?: unknown
  source: 'edit' | 'command' | 'paste' | 'delete'
}

/**
 * Callback type for cell change listeners
 */
export type CellChangeCallback = (event: CellChangeEvent) => void
import {
  formatConfidence,
  getConfidenceColor,
  STATUS_COLORS,
  LAYER_COLORS,
} from './constants'
import { getThemeColors } from './theme'

/**
 * Hook for programmatic Univer spreadsheet manipulation
 * Used for AI integration to inject match suggestions and metadata
 */
export function useUniverAPI() {
  const univerAPIRef = useRef<FUniver | null>(null)
  const [isReady, setIsReady] = useState(false)
  const mountedRef = useRef(true)

  // Track mount state to prevent state updates after unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  /**
   * Initialize the API reference
   */
  const setAPI = useCallback((api: FUniver) => {
    univerAPIRef.current = api
    // Only update state if component is still mounted
    if (mountedRef.current) {
      setIsReady(true)
    }
  }, [])

  /**
   * Get the active workbook
   */
  const getWorkbook = useCallback((): FWorkbook | null => {
    return univerAPIRef.current?.getActiveWorkbook() ?? null
  }, [])

  /**
   * Get the active sheet
   */
  const getActiveSheet = useCallback((): FWorksheet | null => {
    return getWorkbook()?.getActiveSheet() ?? null
  }, [getWorkbook])

  /**
   * Get a range from the active sheet
   */
  const getRange = useCallback((rangeStr: string): FRange | null => {
    return getActiveSheet()?.getRange(rangeStr) ?? null
  }, [getActiveSheet])

  /**
   * Set a single cell value
   */
  const setCellValue = useCallback((cell: string, value: string | number | boolean) => {
    const range = getRange(cell)
    if (range) {
      range.setValue(value)
    }
  }, [getRange])

  /**
   * Set a cell value with custom metadata (for AI matches)
   */
  const setCellWithMetadata = useCallback((
    cell: string,
    value: string | number,
    metadata: CellMatchMetadata
  ) => {
    const range = getRange(cell)
    if (range) {
      const enrichedValue: EnrichedCellValue = {
        v: value,
        custom: metadata,
      }
      range.setValue(enrichedValue as unknown as string | number)
    }
  }, [getRange])

  /**
   * Set multiple cell values at once (batch update)
   */
  const setRangeValues = useCallback((
    rangeStr: string,
    values: (string | number | boolean | null)[][]
  ) => {
    const range = getRange(rangeStr)
    if (range) {
      range.setValues(values)
    }
  }, [getRange])

  /**
   * Add or update a note/annotation on a cell (for AI explanations)
   */
  const setCellNote = useCallback((cell: string, noteConfig: CellNote) => {
    const range = getRange(cell)
    if (range) {
      // Note: API may vary based on Univer version
      try {
        ;(range as unknown as { createOrUpdateNote: (config: CellNote) => void }).createOrUpdateNote({
          note: noteConfig.note,
          width: noteConfig.width ?? 200,
          height: noteConfig.height ?? 80,
          show: noteConfig.show ?? false,
        })
      } catch {
        console.warn('Note API not available in this Univer version')
      }
    }
  }, [getRange])

  /**
   * Set a formula in a cell
   */
  const setFormula = useCallback((cell: string, formula: string) => {
    const range = getRange(cell)
    if (range) {
      range.setValue(formula)
    }
  }, [getRange])

  /**
   * Apply background color to a cell
   */
  const setCellBackground = useCallback((cell: string, color: string) => {
    const range = getRange(cell)
    if (range) {
      try {
        ;(range as unknown as { setBackground: (color: string) => void }).setBackground(color)
      } catch {
        console.warn('Background API not available')
      }
    }
  }, [getRange])

  /**
   * Highlight a cell based on match status
   */
  const highlightByStatus = useCallback((cell: string, status: MatchStatus) => {
    const colors = STATUS_COLORS[status]
    setCellBackground(cell, colors.bg)
  }, [setCellBackground])

  /**
   * Highlight a cell based on match layer
   */
  const highlightByLayer = useCallback((cell: string, layer: MatchLayer) => {
    const colors = LAYER_COLORS[layer]
    setCellBackground(cell, colors.bg)
  }, [setCellBackground])

  /**
   * Highlight a cell based on confidence score
   */
  const highlightByConfidence = useCallback((cell: string, confidence: number) => {
    const colors = getConfidenceColor(confidence)
    setCellBackground(cell, colors.bg)
  }, [setCellBackground])

  /**
   * Populate a row with transaction data
   */
  const populateTransactionRow = useCallback((
    rowIndex: number,
    transaction: TransactionRow,
    startCol: string = 'A'
  ) => {
    const row = rowIndex + 1 // 1-indexed
    const values: (string | number | null)[] = [
      transaction.date,
      transaction.description,
      transaction.amount,
      transaction.reference ?? '',
      transaction.matchStatus,
      transaction.matchConfidence ? formatConfidence(transaction.matchConfidence) : '',
    ]

    // Set values
    setRangeValues(`${startCol}${row}:F${row}`, [values])

    // Highlight status cell
    if (transaction.matchStatus) {
      highlightByStatus(`E${row}`, transaction.matchStatus)
    }

    // Highlight confidence cell
    if (transaction.matchConfidence) {
      highlightByConfidence(`F${row}`, transaction.matchConfidence)
    }

    // Add note with match details
    if (transaction.matchedBy && transaction.matchConfidence) {
      setCellNote(`E${row}`, {
        note: `Matched by: ${transaction.matchedBy}\nConfidence: ${formatConfidence(transaction.matchConfidence)}`,
        width: 180,
        height: 60,
      })
    }
  }, [setRangeValues, highlightByStatus, highlightByConfidence, setCellNote])

  /**
   * Populate a row with invoice data
   */
  const populateInvoiceRow = useCallback((
    rowIndex: number,
    invoice: InvoiceRow,
    startCol: string = 'A'
  ) => {
    const row = rowIndex + 1 // 1-indexed
    const values: (string | number | null)[] = [
      invoice.invoiceNumber,
      invoice.date,
      invoice.description,
      invoice.amount,
      invoice.dueDate ?? '',
      invoice.matchStatus,
      invoice.matchConfidence ? formatConfidence(invoice.matchConfidence) : '',
    ]

    // Set values
    setRangeValues(`${startCol}${row}:G${row}`, [values])

    // Highlight status cell
    if (invoice.matchStatus) {
      highlightByStatus(`F${row}`, invoice.matchStatus)
    }

    // Highlight confidence cell
    if (invoice.matchConfidence) {
      highlightByConfidence(`G${row}`, invoice.matchConfidence)
    }

    // Add note with match details
    if (invoice.matchedBy && invoice.matchConfidence) {
      setCellNote(`F${row}`, {
        note: `Matched by: ${invoice.matchedBy}\nConfidence: ${formatConfidence(invoice.matchConfidence)}`,
        width: 180,
        height: 60,
      })
    }
  }, [setRangeValues, highlightByStatus, highlightByConfidence, setCellNote])

  /**
   * Inject AI match suggestion into a cell
   */
  const injectMatchSuggestion = useCallback((
    cell: string,
    confidence: number,
    layer: MatchLayer,
    reasoning?: string
  ) => {
    // Set cell background based on confidence
    highlightByConfidence(cell, confidence)

    // Add explanatory note
    const noteText = reasoning
      ? `AI Match Confidence: ${formatConfidence(confidence)}\nMatched via: ${layer}\n\n${reasoning}`
      : `AI Match Confidence: ${formatConfidence(confidence)}\nMatched via: ${layer}`

    setCellNote(cell, {
      note: noteText,
      width: 250,
      height: reasoning ? 120 : 80,
      show: true,
    })
  }, [highlightByConfidence, setCellNote])

  /**
   * Clear all AI highlights from a range (theme-aware)
   */
  const clearHighlights = useCallback((rangeStr: string) => {
    const range = getRange(rangeStr)
    if (range) {
      try {
        const theme = getThemeColors()
        ;(range as unknown as { setBackground: (color: string) => void }).setBackground(theme.background)
      } catch {
        console.warn('Clear highlights failed')
      }
    }
  }, [getRange])

  /**
   * Get cell value
   */
  const getCellValue = useCallback((cell: string): unknown => {
    const range = getRange(cell)
    if (range) {
      return range.getValue()
    }
    return null
  }, [getRange])

  /**
   * Store for cell change listeners
   */
  const cellChangeListenersRef = useRef<Set<CellChangeCallback>>(new Set())
  const eventDisposablesRef = useRef<Array<{ dispose: () => void }>>([])

  /**
   * Subscribe to cell changes
   * Returns an unsubscribe function
   */
  const onCellChange = useCallback((callback: CellChangeCallback): (() => void) => {
    cellChangeListenersRef.current.add(callback)
    return () => {
      cellChangeListenersRef.current.delete(callback)
    }
  }, [])

  /**
   * Emit cell change event to all listeners
   */
  const emitCellChange = useCallback((event: CellChangeEvent) => {
    cellChangeListenersRef.current.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('Cell change listener error:', error)
      }
    })
  }, [])

  /**
   * Setup event listeners when API is ready
   */
  const setupEventListeners = useCallback(() => {
    const api = univerAPIRef.current
    if (!api) return

    // Clean up previous listeners
    eventDisposablesRef.current.forEach(d => d.dispose())
    eventDisposablesRef.current = []

    try {
      // Listen to cell edit end events
      const editEndDisposable = api.addEvent(
        (api as unknown as { Event: { SheetEditEnded: string } }).Event.SheetEditEnded,
        (params: {
          worksheet: FWorksheet
          workbook: FWorkbook
          row: number
          column: number
          eventType?: string
          keycode?: string
          isZenEditor?: boolean
          isConfirm?: boolean
        } | undefined) => {
          try {
            // Guard against undefined params (can happen during Univer initialization)
            if (!params || !params.worksheet) {
              return
            }

            const sheet = params.worksheet
            const sheetId = (sheet as unknown as { getSheetId: () => string }).getSheetId?.() || ''
            const sheetName = sheet.getSheetName?.() || ''

            // Get the current value from the cell
            const range = sheet.getRange(params.row, params.column, 1, 1)
            const value = range?.getValue()

            emitCellChange({
              sheetId,
              sheetName,
              row: params.row,
              column: params.column,
              value,
              source: 'edit',
            })
          } catch {
            // Silently ignore errors during event handling (Univer timing issues)
          }
        }
      )
      eventDisposablesRef.current.push(editEndDisposable)

      // Listen to command executions for programmatic changes (paste, delete, etc.)
      const commandDisposable = api.onCommandExecuted((command: { id: string; params?: unknown }) => {
        try {
          // Track cell value changes from commands
          if (command.id === 'sheet.command.set-range-values' ||
              command.id === 'sheet.mutation.set-range-values') {
            const params = command.params as {
              unitId?: string
              subUnitId?: string
              range?: { startRow: number; startColumn: number; endRow: number; endColumn: number }
              value?: unknown
            } | undefined

            if (params?.range) {
              const workbook = getWorkbook()
              const sheet = workbook?.getActiveSheet()
              const sheetId = params.subUnitId || ''
              const sheetName = sheet?.getSheetName?.() || ''

              // For single cell changes
              if (params.range.startRow === params.range.endRow &&
                  params.range.startColumn === params.range.endColumn) {
                emitCellChange({
                  sheetId,
                  sheetName,
                  row: params.range.startRow,
                  column: params.range.startColumn,
                  value: params.value,
                  source: 'command',
                })
              } else {
                // For range changes, emit for each cell
                // This could be optimized with a batch event if needed
                for (let r = params.range.startRow; r <= params.range.endRow; r++) {
                  for (let c = params.range.startColumn; c <= params.range.endColumn; c++) {
                    emitCellChange({
                      sheetId,
                      sheetName,
                      row: r,
                      column: c,
                      value: params.value,
                      source: 'command',
                    })
                  }
                }
              }
            }
          }
        } catch {
          // Silently ignore errors during command handling (Univer timing issues)
        }
      })
      eventDisposablesRef.current.push(commandDisposable)

      console.debug('[Univer] Event listeners setup complete')
    } catch (error) {
      console.warn('Failed to setup Univer event listeners:', error)
    }
  }, [emitCellChange, getWorkbook])

  /**
   * Clean up event listeners
   */
  const cleanupEventListeners = useCallback(() => {
    eventDisposablesRef.current.forEach(d => {
      try {
        d.dispose()
      } catch {
        // Ignore disposal errors
      }
    })
    eventDisposablesRef.current = []
  }, [])

  /**
   * Setup event listeners when API becomes ready
   * Delayed to ensure Univer's internal services are fully initialized
   */
  useEffect(() => {
    if (!isReady || !univerAPIRef.current) return

    // Delay event listener setup to give Univer time to fully initialize
    // Using RAF + timeout for more reliable timing
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const rafId = requestAnimationFrame(() => {
      timeoutId = setTimeout(() => {
        if (mountedRef.current && univerAPIRef.current) {
          setupEventListeners()
        }
      }, 300) // Increased delay for stability
    })

    return () => {
      cancelAnimationFrame(rafId)
      if (timeoutId) clearTimeout(timeoutId)
      cleanupEventListeners()
    }
  }, [isReady, setupEventListeners, cleanupEventListeners])

  // ============================================================================
  // Sheet Management
  // ============================================================================

  /**
   * Get all sheets in the workbook
   */
  const getSheets = useCallback((): Array<{ id: string; name: string }> => {
    const workbook = getWorkbook()
    if (!workbook) return []

    try {
      const sheets = workbook.getSheets()
      if (!Array.isArray(sheets)) return []

      return sheets.map((sheet: FWorksheet) => ({
        id: (sheet as unknown as { getSheetId: () => string }).getSheetId?.() || '',
        name: sheet.getSheetName?.() || '',
      }))
    } catch (error) {
      console.warn('Failed to get sheets:', error)
      return []
    }
  }, [getWorkbook])

  /**
   * Create a new sheet
   */
  const createSheet = useCallback((name: string, options?: {
    rowCount?: number
    columnCount?: number
    activate?: boolean
  }): string | null => {
    const workbook = getWorkbook()
    if (!workbook) return null

    try {
      const newSheet = (workbook as unknown as {
        createSheet: (config: { name: string; rowCount?: number; columnCount?: number }) => FWorksheet
      }).createSheet({
        name,
        rowCount: options?.rowCount ?? 1000,
        columnCount: options?.columnCount ?? 26,
      })

      const sheetId = (newSheet as unknown as { getSheetId: () => string }).getSheetId?.() || ''

      if (options?.activate !== false) {
        workbook.setActiveSheet(newSheet)
      }

      return sheetId
    } catch (error) {
      console.warn('Failed to create sheet:', error)
      return null
    }
  }, [getWorkbook])

  /**
   * Rename a sheet
   */
  const renameSheet = useCallback((sheetId: string, newName: string): boolean => {
    const workbook = getWorkbook()
    if (!workbook) return false

    try {
      const sheets = workbook.getSheets()
      if (!Array.isArray(sheets)) return false

      const sheet = sheets.find((s: FWorksheet) => {
        const id = (s as unknown as { getSheetId: () => string }).getSheetId?.()
        return id === sheetId
      })

      if (!sheet) return false

      ;(sheet as unknown as { setName: (name: string) => void }).setName(newName)
      return true
    } catch (error) {
      console.warn('Failed to rename sheet:', error)
      return false
    }
  }, [getWorkbook])

  /**
   * Delete a sheet
   */
  const deleteSheet = useCallback((sheetId: string): boolean => {
    const workbook = getWorkbook()
    if (!workbook) return false

    try {
      const sheets = workbook.getSheets()
      if (!Array.isArray(sheets)) return false

      // Don't allow deleting the last sheet
      if (sheets.length <= 1) {
        console.warn('Cannot delete the last sheet')
        return false
      }

      const sheet = sheets.find((s: FWorksheet) => {
        const id = (s as unknown as { getSheetId: () => string }).getSheetId?.()
        return id === sheetId
      })

      if (!sheet) return false

      ;(workbook as unknown as { removeSheet: (sheet: FWorksheet) => void }).removeSheet(sheet)
      return true
    } catch (error) {
      console.warn('Failed to delete sheet:', error)
      return false
    }
  }, [getWorkbook])

  /**
   * Set active sheet by ID
   */
  const setActiveSheetById = useCallback((sheetId: string): boolean => {
    const workbook = getWorkbook()
    if (!workbook) return false

    try {
      const sheets = workbook.getSheets()
      if (!Array.isArray(sheets)) return false

      const sheet = sheets.find((s: FWorksheet) => {
        const id = (s as unknown as { getSheetId: () => string }).getSheetId?.()
        return id === sheetId
      })

      if (!sheet) return false

      workbook.setActiveSheet(sheet)
      return true
    } catch (error) {
      console.warn('Failed to set active sheet:', error)
      return false
    }
  }, [getWorkbook])

  /**
   * Get active sheet ID
   */
  const getActiveSheetId = useCallback((): string | null => {
    const sheet = getActiveSheet()
    if (!sheet) return null

    try {
      return (sheet as unknown as { getSheetId: () => string }).getSheetId?.() || null
    } catch {
      return null
    }
  }, [getActiveSheet])

  /**
   * Freeze rows (header rows)
   */
  const freezeRows = useCallback((count: number): boolean => {
    const sheet = getActiveSheet()
    if (!sheet) return false

    try {
      ;(sheet as unknown as { setFrozenRowCount: (count: number) => void }).setFrozenRowCount(count)
      return true
    } catch (error) {
      console.warn('Failed to freeze rows:', error)
      return false
    }
  }, [getActiveSheet])

  /**
   * Freeze columns
   */
  const freezeColumns = useCallback((count: number): boolean => {
    const sheet = getActiveSheet()
    if (!sheet) return false

    try {
      ;(sheet as unknown as { setFrozenColumnCount: (count: number) => void }).setFrozenColumnCount(count)
      return true
    } catch (error) {
      console.warn('Failed to freeze columns:', error)
      return false
    }
  }, [getActiveSheet])

  /**
   * Dispose of the Univer instance
   */
  const dispose = useCallback(() => {
    cleanupEventListeners()
    if (univerAPIRef.current) {
      univerAPIRef.current.dispose()
      univerAPIRef.current = null
      // Only update state if component is still mounted
      if (mountedRef.current) {
        setIsReady(false)
      }
    }
  }, [cleanupEventListeners])

  return {
    // Setup
    setAPI,
    dispose,
    isReady,

    // Core operations
    getWorkbook,
    getActiveSheet,
    getRange,
    getCellValue,

    // Cell manipulation
    setCellValue,
    setCellWithMetadata,
    setRangeValues,
    setFormula,
    setCellNote,
    setCellBackground,

    // Highlighting
    highlightByStatus,
    highlightByLayer,
    highlightByConfidence,
    clearHighlights,

    // Data population
    populateTransactionRow,
    populateInvoiceRow,

    // AI integration
    injectMatchSuggestion,

    // Event subscriptions
    onCellChange,
    setupEventListeners,
    cleanupEventListeners,

    // Sheet management
    getSheets,
    createSheet,
    renameSheet,
    deleteSheet,
    setActiveSheetById,
    getActiveSheetId,
    freezeRows,
    freezeColumns,
  }
}

export type UniverAPIHook = ReturnType<typeof useUniverAPI>
