'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/cn'

interface Sheet {
  id: string
  name: string
  order: number
}

interface SheetTabsProps {
  /** Array of sheets */
  sheets: Sheet[]
  /** Currently active sheet ID */
  activeSheetId: string
  /** Called when a sheet is selected */
  onSheetSelect: (sheetId: string) => void
  /** Called when a new sheet is added */
  onSheetAdd: () => void
  /** Called when a sheet is renamed */
  onSheetRename: (sheetId: string, newName: string) => void
  /** Called when a sheet is deleted */
  onSheetDelete: (sheetId: string) => void
  /** Called when a sheet is duplicated */
  onSheetDuplicate: (sheetId: string) => void
  /** Called when sheets are reordered */
  onSheetReorder?: (sheetIds: string[]) => void
  /** Whether tabs are read-only */
  readOnly?: boolean
  /** Custom class name */
  className?: string
}

/**
 * SheetTabs - Excel-like sheet tab bar for multi-sheet navigation
 */
export function SheetTabs({
  sheets,
  activeSheetId,
  onSheetSelect,
  onSheetAdd,
  onSheetRename,
  onSheetDelete,
  onSheetDuplicate,
  onSheetReorder,
  readOnly = false,
  className,
}: SheetTabsProps) {
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [contextMenuSheetId, setContextMenuSheetId] = useState<string | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const editInputRef = useRef<HTMLInputElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sort sheets by order
  const sortedSheets = [...sheets].sort((a, b) => a.order - b.order)

  // Start editing sheet name
  const startEditing = useCallback((sheet: Sheet) => {
    if (readOnly) return
    setEditingSheetId(sheet.id)
    setEditingName(sheet.name)
  }, [readOnly])

  // Finish editing
  const finishEditing = useCallback(() => {
    if (editingSheetId && editingName.trim()) {
      onSheetRename(editingSheetId, editingName.trim())
    }
    setEditingSheetId(null)
    setEditingName('')
  }, [editingSheetId, editingName, onSheetRename])

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingSheetId(null)
    setEditingName('')
  }, [])

  // Handle double-click to edit
  const handleDoubleClick = useCallback((sheet: Sheet) => {
    startEditing(sheet)
  }, [startEditing])

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, sheetId: string) => {
    if (readOnly) return
    e.preventDefault()
    setContextMenuSheetId(sheetId)
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
  }, [readOnly])

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuSheetId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when editing starts
  useEffect(() => {
    if (editingSheetId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingSheetId])

  // Handle keyboard in edit mode
  const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      finishEditing()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }, [finishEditing, cancelEditing])

  // Context menu actions
  const handleRename = useCallback(() => {
    const sheet = sheets.find((s) => s.id === contextMenuSheetId)
    if (sheet) {
      startEditing(sheet)
    }
    setContextMenuSheetId(null)
  }, [contextMenuSheetId, sheets, startEditing])

  const handleDuplicate = useCallback(() => {
    if (contextMenuSheetId) {
      onSheetDuplicate(contextMenuSheetId)
    }
    setContextMenuSheetId(null)
  }, [contextMenuSheetId, onSheetDuplicate])

  const handleDelete = useCallback(() => {
    if (contextMenuSheetId && sheets.length > 1) {
      onSheetDelete(contextMenuSheetId)
    }
    setContextMenuSheetId(null)
  }, [contextMenuSheetId, sheets.length, onSheetDelete])

  // Scroll active tab into view
  useEffect(() => {
    if (containerRef.current) {
      const activeTab = containerRef.current.querySelector(`[data-sheet-id="${activeSheetId}"]`)
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'nearest' })
      }
    }
  }, [activeSheetId])

  return (
    <div className={cn('flex items-center border-t border-border bg-muted/30', className)}>
      {/* Navigation buttons */}
      <div className="flex items-center px-1 border-r border-border">
        <button
          onClick={() => {
            if (containerRef.current) {
              containerRef.current.scrollBy({ left: -100, behavior: 'smooth' })
            }
          }}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Scroll left"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => {
            if (containerRef.current) {
              containerRef.current.scrollBy({ left: 100, behavior: 'smooth' })
            }
          }}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Scroll right"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Sheet tabs */}
      <div
        ref={containerRef}
        className="flex-1 flex items-end gap-0.5 overflow-x-auto scrollbar-none px-1"
      >
        {sortedSheets.map((sheet) => (
          <button
            key={sheet.id}
            data-sheet-id={sheet.id}
            onClick={() => onSheetSelect(sheet.id)}
            onDoubleClick={() => handleDoubleClick(sheet)}
            onContextMenu={(e) => handleContextMenu(e, sheet.id)}
            className={cn(
              'group relative flex items-center gap-1 px-3 py-1.5 text-sm whitespace-nowrap',
              'border border-b-0 rounded-t transition-colors',
              activeSheetId === sheet.id
                ? 'bg-background border-border text-foreground font-medium'
                : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {editingSheetId === sheet.id ? (
              <input
                ref={editInputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={finishEditing}
                onKeyDown={handleEditKeyDown}
                className="w-24 px-1 py-0 text-sm bg-transparent border-b border-primary focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span>{sheet.name}</span>
                {!readOnly && activeSheetId === sheet.id && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      handleContextMenu(e as unknown as React.MouseEvent, sheet.id)
                    }}
                    className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Add sheet button */}
      {!readOnly && (
        <div className="flex items-center px-1 border-l border-border">
          <button
            onClick={onSheetAdd}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Add sheet"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      )}

      {/* Context menu */}
      {contextMenuSheetId && (
        <div
          ref={contextMenuRef}
          className={cn(
            'fixed z-50 min-w-[160px] py-1',
            'bg-background border border-border rounded-md shadow-lg'
          )}
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
        >
          <button
            onClick={handleRename}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Rename
          </button>
          <button
            onClick={handleDuplicate}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Duplicate
          </button>
          <div className="my-1 border-t border-border" />
          <button
            onClick={handleDelete}
            disabled={sheets.length <= 1}
            className={cn(
              'w-full px-3 py-1.5 text-sm text-left flex items-center gap-2',
              sheets.length <= 1
                ? 'text-muted-foreground cursor-not-allowed'
                : 'hover:bg-muted text-destructive'
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default SheetTabs
