'use client'

import { FolderOpen, ChevronDown } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

/**
 * Export icon using geometric design language
 */
function ExportIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="text-current"
      aria-hidden="true"
    >
      {/* Document */}
      <rect x="3" y="1" width="10" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {/* Arrow stem */}
      <rect x="7" y="4" width="2" height="6" />
      {/* Arrow head */}
      <polygon points="8,3 5,6 11,6" />
    </svg>
  )
}

/**
 * Workspace Selector Component
 * Allows users to select a workspace for import functionality
 */
function WorkspaceSelector({
  companyId,
  workosUserId,
  selectedWorkspaceId,
  onSelect,
}: {
  companyId: Id<'companies'> | null
  workosUserId?: string
  selectedWorkspaceId: Id<'workspaces'> | null
  onSelect: (id: Id<'workspaces'> | null) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  // Query workspaces for the company
  const workspaces = useQuery(
    api.workspaces.listWorkspaces,
    companyId ? { companyId, workosUserId } : 'skip'
  )

  // Type for workspace from query
  type Workspace = NonNullable<typeof workspaces>[number]

  const selectedWorkspace = useMemo(
    () => workspaces?.find((ws: Workspace) => ws._id === selectedWorkspaceId),
    [workspaces, selectedWorkspaceId]
  )

  if (!companyId || !workspaces || workspaces.length === 0) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border hover:bg-secondary transition-colors"
      >
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <span className="max-w-32 truncate">
          {selectedWorkspace?.name || 'Select Workspace'}
        </span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-48 bg-background border border-border shadow-lg z-20">
            <div className="py-1">
              {workspaces.map((ws: Workspace) => (
                <button
                  key={ws._id}
                  onClick={() => {
                    onSelect(ws._id)
                    setIsOpen(false)
                  }}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-secondary transition-colors ${
                    ws._id === selectedWorkspaceId ? 'bg-secondary/50 font-medium' : ''
                  }`}
                >
                  {ws.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export interface SpreadsheetToolbarProps {
  /** Whether data exists to display stats */
  hasData: boolean
  /** Count of matched items */
  matchedCount: number
  /** Count of unmatched items */
  unmatchedCount: number
  /** Whether in demo mode */
  isDemo?: boolean
  /** Whether using unified sheet mode */
  isUnifiedSheet?: boolean
  /** Export loading state */
  exportLoading: boolean
  /** Export error message */
  exportError?: string | null
  /** Export handler */
  onExport: () => void
  /** Workspace selector props (only for non-demo mode with unified sheet) */
  workspaceSelector?: {
    companyId: Id<'companies'> | null
    workosUserId?: string
    selectedWorkspaceId: Id<'workspaces'> | null
    onSelect: (id: Id<'workspaces'> | null) => void
  }
}

/**
 * Reusable toolbar component for spreadsheet views
 * Displays match statistics, mode badges, and export functionality
 */
export function SpreadsheetToolbar({
  hasData,
  matchedCount,
  unmatchedCount,
  isDemo = false,
  isUnifiedSheet = false,
  exportLoading,
  exportError,
  onExport,
  workspaceSelector,
}: SpreadsheetToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      {/* Left side: Statistics and mode badges */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {hasData ? (
          <>
            <span>
              <strong className="text-foreground">{matchedCount}</strong> matches
            </span>
            <span className="text-border">|</span>
            <span>
              <strong className="text-foreground">{unmatchedCount}</strong> unmatched
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">
            Empty spreadsheet - start typing or import data
          </span>
        )}
        {isDemo && (
          <>
            <span className="text-border">|</span>
            <span className="text-warning text-xs font-medium px-2 py-0.5 bg-warning/10 rounded">
              Demo Mode
            </span>
          </>
        )}
        {isUnifiedSheet && (
          <>
            <span className="text-border">|</span>
            <span className="text-blue-500 text-xs font-medium px-2 py-0.5 bg-blue-500/10 rounded">
              Unified Sheet
            </span>
          </>
        )}
      </div>

      {/* Right side: Workspace selector and export button */}
      <div className="flex items-center gap-2">
        {/* Workspace Selector - only for non-demo mode with unified sheet */}
        {workspaceSelector && !isDemo && (
          <WorkspaceSelector
            companyId={workspaceSelector.companyId}
            workosUserId={workspaceSelector.workosUserId}
            selectedWorkspaceId={workspaceSelector.selectedWorkspaceId}
            onSelect={workspaceSelector.onSelect}
          />
        )}
        {exportError && (
          <span className="text-xs text-destructive mr-2">
            {exportError}
          </span>
        )}
        <button
          onClick={onExport}
          disabled={exportLoading || !hasData}
          title={!hasData ? 'No data to export' : undefined}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exportLoading ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <ExportIcon />
              <span>Export Excel</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
