/**
 * Import Dialog Component
 *
 * Modal dialog for importing data from various sources into the spreadsheet.
 *
 * @module components/unified-sheet/data-sources/import-dialog
 */

'use client'

import { useState, useCallback } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { PremiumButton as Button } from '@/components/brand/premium-button'
import { Modal } from '@/components/ui/modal'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Loader2, FileSpreadsheet, Database, FileText } from 'lucide-react'
import { useImportReconciliation } from './use-import-reconciliation'
import { cn } from '@/lib/cn'

/**
 * Props for ImportDialog
 */
interface ImportDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Workspace ID to import into */
  workspaceId: Id<'workspaces'>
  /** Company ID for session queries */
  companyId: Id<'companies'>
  /** WorkOS user ID for authentication */
  workosUserId?: string
  /** Callback when import completes */
  onImportComplete?: (worksheetId: Id<'worksheets'>) => void
}

/**
 * Import Dialog Component
 */
export function ImportDialog({
  open,
  onOpenChange,
  workspaceId,
  companyId,
  workosUserId,
  onImportComplete,
}: ImportDialogProps) {
  const [activeTab, setActiveTab] = useState<string>('reconciliation')
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reconciliation tab state
  const [selectedSessionId, setSelectedSessionId] = useState<Id<'reconciliationSessions'> | undefined>()
  const [includeMatches, setIncludeMatches] = useState(true)
  const [includeSuspense, setIncludeSuspense] = useState(true)
  const [matchStatusFilter, setMatchStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [suspenseStatusFilter, setSuspenseStatusFilter] = useState<'all' | 'open' | 'queried' | 'resolved'>('all')
  const [worksheetName, setWorksheetName] = useState('')

  // Query company sessions
  const sessions = useQuery(
    api.sessions.listByCompany,
    companyId ? { companyId, workosUserId } : 'skip'
  )

  // Import reconciliation hook
  const {
    data: reconData,
    isLoading: isLoadingReconData,
    totalMatches,
    totalSuspense,
    sessionName,
    importToNewWorksheet,
  } = useImportReconciliation(selectedSessionId, {
    workosUserId,
    config: {
      includeMatches,
      includeSuspense,
      matchStatusFilter: matchStatusFilter === 'all' ? undefined : matchStatusFilter,
      suspenseStatusFilter: suspenseStatusFilter === 'all' ? undefined : suspenseStatusFilter,
    },
  })

  // Handle session selection
  const handleSessionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSessionId(e.target.value as Id<'reconciliationSessions'>)
    setError(null)
  }, [])

  // Handle import
  const handleImport = useCallback(async () => {
    setIsImporting(true)
    setError(null)

    try {
      if (activeTab === 'reconciliation') {
        if (!selectedSessionId) {
          throw new Error('Please select a reconciliation session')
        }

        const result = await importToNewWorksheet(
          workspaceId,
          worksheetName || `Recon - ${sessionName}`
        )

        onImportComplete?.(result.worksheetId)
        onOpenChange(false)
      } else if (activeTab === 'manual') {
        throw new Error('Manual entry not yet implemented')
      } else {
        throw new Error('CSV import not yet implemented')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }, [
    activeTab,
    selectedSessionId,
    worksheetName,
    sessionName,
    importToNewWorksheet,
    workspaceId,
    onImportComplete,
    onOpenChange,
  ])

  // Reset state when dialog closes
  const handleClose = useCallback(() => {
    setSelectedSessionId(undefined)
    setIncludeMatches(true)
    setIncludeSuspense(true)
    setMatchStatusFilter('all')
    setSuspenseStatusFilter('all')
    setWorksheetName('')
    setError(null)
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Import Data"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={
              isImporting ||
              (activeTab === 'reconciliation' && !selectedSessionId)
            }
            loading={isImporting}
          >
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Import data from reconciliation sessions, CSV files, or start with manual entry.
        </p>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 gap-1 bg-muted p-1 rounded-lg">
            <TabsTrigger
              value="reconciliation"
              className="flex items-center gap-2 px-3 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Reconciliation</span>
            </TabsTrigger>
            <TabsTrigger
              value="csv"
              className="flex items-center gap-2 px-3 py-2 rounded-md opacity-50 cursor-not-allowed"
              disabled
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">CSV/Excel</span>
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="flex items-center gap-2 px-3 py-2 rounded-md opacity-50 cursor-not-allowed"
              disabled
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Manual</span>
            </TabsTrigger>
          </TabsList>

          {/* Reconciliation Tab */}
          <TabsContent value="reconciliation" className="space-y-4 mt-4">
            {/* Session Selector */}
            <div className="space-y-2">
              <label htmlFor="session" className="text-sm font-medium">
                Reconciliation Session
              </label>
              <select
                id="session"
                value={selectedSessionId ?? ''}
                onChange={handleSessionChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a session...</option>
                {sessions?.map((session) => (
                  <option key={session._id} value={session._id}>
                    {session.name} ({session.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Data Type Checkboxes */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Data to Include</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMatches}
                    onChange={(e) => setIncludeMatches(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Include Matches</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSuspense}
                    onChange={(e) => setIncludeSuspense(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Include Suspense Items</span>
                </label>
              </div>
            </div>

            {/* Status Filters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="matchStatus" className="text-sm font-medium">
                  Match Status
                </label>
                <select
                  id="matchStatus"
                  value={matchStatusFilter}
                  onChange={(e) => setMatchStatusFilter(e.target.value as typeof matchStatusFilter)}
                  disabled={!includeMatches}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="suspenseStatus" className="text-sm font-medium">
                  Suspense Status
                </label>
                <select
                  id="suspenseStatus"
                  value={suspenseStatusFilter}
                  onChange={(e) => setSuspenseStatusFilter(e.target.value as typeof suspenseStatusFilter)}
                  disabled={!includeSuspense}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="queried">Queried</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* Worksheet Name */}
            <div className="space-y-2">
              <label htmlFor="worksheetName" className="text-sm font-medium">
                Worksheet Name (optional)
              </label>
              <input
                id="worksheetName"
                type="text"
                value={worksheetName}
                onChange={(e) => setWorksheetName(e.target.value)}
                placeholder={sessionName ? `Recon - ${sessionName}` : 'Enter name...'}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Preview */}
            {selectedSessionId && (
              <div className={cn(
                "rounded-md border p-4 space-y-2",
                isLoadingReconData ? "bg-muted/50" : "bg-muted"
              )}>
                <div className="text-sm font-medium">Preview</div>
                {isLoadingReconData ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading data...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>Matches: {includeMatches ? totalMatches : 0}</div>
                    <div>Suspense: {includeSuspense ? totalSuspense : 0}</div>
                    <div className="col-span-2">
                      Total rows: {(includeMatches ? totalMatches : 0) + (includeSuspense ? totalSuspense : 0)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* CSV Tab (Placeholder) */}
          <TabsContent value="csv" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              CSV/Excel import coming soon
            </div>
          </TabsContent>

          {/* Manual Tab (Placeholder) */}
          <TabsContent value="manual" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              Manual entry mode coming soon
            </div>
          </TabsContent>
        </Tabs>

        {/* Error Display */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}
