'use client'

/**
 * Dead Letter Queue (DLQ) Management View
 *
 * Displays and manages failed extraction items that have exceeded
 * their retry limit. Supports individual and bulk retry operations.
 *
 * @module components/views/dlq-view
 */

import React, { useState, useMemo, useCallback } from 'react'
import { Id } from '@/convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import {
  useSelectedCompanyId,
  useIsDemo,
  useSetShowPaywall,
} from '@/lib/store'
import {
  useFailedItems,
  useRetryFailedItem,
  useBulkRetryDLQ,
  useDeleteDLQItem,
} from '@/lib/convex-hooks'
import { useToast } from '@/components/ui/toast'
import { Modal } from '@/components/ui/modal'
import {
  RetryFailedDialog,
  DeleteConfirmationDialog,
  useConfirmation,
} from '@/components/ui/confirmation-dialog'
import { LoadingSpinner, BrandedEmptyState } from '@/components/brand'
import {
  IconRefresh,
  IconTrash,
  IconWarningCircle,
  IconFileText,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClock,
} from '@/components/brand/icons'

// ============================================================================
// Type Definitions
// ============================================================================

interface FailedItem {
  _id: Id<"extractionQueueItems">
  documentId: Id<"documents">
  documentName: string
  queueId: Id<"extractionQueue">
  queueName?: string
  priority: number
  retryCount: number
  maxRetries: number
  lastError?: string
  failedAt: number
  createdAt: number
}

interface DLQItemRowProps {
  item: FailedItem
  isSelected: boolean
  isExpanded: boolean
  onSelect: (id: Id<"extractionQueueItems">) => void
  onToggleExpand: (id: Id<"extractionQueueItems">) => void
  onRetry: (item: FailedItem) => void
  onDelete: (item: FailedItem) => void
}

// ============================================================================
// Helper Components
// ============================================================================

function DLQItemRow({
  item,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onRetry,
  onDelete,
}: DLQItemRowProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const timeSinceFailure = useMemo(() => {
    const now = Date.now()
    const diff = now - item.failedAt
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Just now'
  }, [item.failedAt])

  return (
    <div
      className={cn(
        'border border-border bg-background',
        isSelected && 'ring-2 ring-primary ring-offset-1'
      )}
    >
      {/* Main Row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Selection Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(item._id)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />

        {/* Document Icon */}
        <div className="flex-shrink-0">
          <IconFileText size={20} className="text-muted-foreground" />
        </div>

        {/* Document Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{item.documentName}</span>
            <span className="text-xs text-error bg-error/10 px-2 py-0.5 rounded">
              Failed
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
            <span>Queue: {item.queueName || 'Unknown'}</span>
            <span>•</span>
            <span>Retries: {item.retryCount}/{item.maxRetries}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <IconClock size={12} />
              {timeSinceFailure}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRetry(item)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-ring"
            title="Retry extraction"
          >
            <IconRefresh size={16} />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-2 text-muted-foreground hover:text-error hover:bg-error/10 transition-colors focus-ring"
            title="Delete from queue"
          >
            <IconTrash size={16} />
          </button>
          <button
            onClick={() => onToggleExpand(item._id)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-ring"
            title={isExpanded ? 'Hide details' : 'Show details'}
          >
            {isExpanded ? (
              <IconChevronUp size={16} />
            ) : (
              <IconChevronDown size={16} />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Error Details */}
      {isExpanded && item.lastError && (
        <div className="px-4 pb-4 pt-0">
          <div className="bg-error/5 border border-error/20 p-3 text-sm">
            <div className="font-medium text-error mb-1 flex items-center gap-2">
              <IconWarningCircle size={14} />
              Error Details
            </div>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto font-mono">
              {item.lastError}
            </pre>
            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-error/10">
              Failed at: {formatDate(item.failedAt)} | Created:{' '}
              {formatDate(item.createdAt)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function DLQView() {
  // Store hooks
  const selectedCompanyId = useSelectedCompanyId()
  const isDemo = useIsDemo()
  const setShowPaywall = useSetShowPaywall()
  const { addToast } = useToast()

  // Data hooks
  const failedItems = useFailedItems(selectedCompanyId)
  const retryFailedItem = useRetryFailedItem()
  const bulkRetryDLQ = useBulkRetryDLQ()
  const deleteDLQItem = useDeleteDLQItem()

  // Local state
  const [selectedItems, setSelectedItems] = useState<Set<Id<"extractionQueueItems">>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<Id<"extractionQueueItems">>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)

  // Confirmation dialogs
  const retryConfirm = useConfirmation<FailedItem | 'bulk'>()
  const deleteConfirm = useConfirmation<FailedItem>()

  // Selection handlers
  const handleSelectItem = useCallback((id: Id<"extractionQueueItems">) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (!failedItems) return

    if (selectedItems.size === failedItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(failedItems.map((item: { _id: Id<"extractionQueueItems"> }) => item._id)))
    }
  }, [failedItems, selectedItems.size])

  // Expand handlers
  const handleToggleExpand = useCallback((id: Id<"extractionQueueItems">) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Retry handlers
  const handleRetryItem = useCallback((item: FailedItem) => {
    if (isDemo) {
      setShowPaywall(true)
      return
    }
    retryConfirm.open(item)
  }, [isDemo, setShowPaywall, retryConfirm])

  const handleBulkRetry = useCallback(() => {
    if (isDemo) {
      setShowPaywall(true)
      return
    }
    if (selectedItems.size === 0) {
      addToast({
        type: 'warning',
        title: 'No items selected',
        description: 'Please select items to retry.',
      })
      return
    }
    retryConfirm.open('bulk')
  }, [isDemo, setShowPaywall, selectedItems.size, addToast, retryConfirm])

  const handleConfirmRetry = useCallback(async () => {
    setIsProcessing(true)
    try {
      if (retryConfirm.data === 'bulk') {
        await bulkRetryDLQ(Array.from(selectedItems))
        addToast({
          type: 'success',
          title: 'Items queued for retry',
          description: `${selectedItems.size} item(s) have been queued for re-extraction.`,
        })
        setSelectedItems(new Set())
      } else if (retryConfirm.data) {
        await retryFailedItem(retryConfirm.data._id)
        addToast({
          type: 'success',
          title: 'Item queued for retry',
          description: `"${retryConfirm.data.documentName}" has been queued for re-extraction.`,
        })
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Retry failed',
        description: error instanceof Error ? error.message : 'An error occurred.',
      })
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [retryConfirm.data, bulkRetryDLQ, retryFailedItem, selectedItems, addToast])

  // Delete handlers
  const handleDeleteItem = useCallback((item: FailedItem) => {
    if (isDemo) {
      setShowPaywall(true)
      return
    }
    deleteConfirm.open(item)
  }, [isDemo, setShowPaywall, deleteConfirm])

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm.data) return

    setIsProcessing(true)
    try {
      await deleteDLQItem(deleteConfirm.data._id)
      addToast({
        type: 'success',
        title: 'Item deleted',
        description: `"${deleteConfirm.data.documentName}" has been removed from the queue.`,
      })
      // Remove from selection if selected
      setSelectedItems((prev) => {
        const next = new Set(prev)
        next.delete(deleteConfirm.data!._id)
        return next
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'An error occurred.',
      })
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [deleteConfirm.data, deleteDLQItem, addToast])

  // Export handler
  const handleExport = useCallback(() => {
    if (!failedItems || failedItems.length === 0) {
      addToast({
        type: 'warning',
        title: 'Nothing to export',
        description: 'There are no failed items to export.',
      })
      return
    }

    const csvContent = [
      ['Document Name', 'Queue Name', 'Retry Count', 'Max Retries', 'Error', 'Failed At', 'Created At'].join(','),
      ...failedItems.map((item: NonNullable<typeof failedItems>[number]) =>
        [
          `"${item.documentName.replace(/"/g, '""')}"`,
          `"${(item.queueName || 'Unknown').replace(/"/g, '""')}"`,
          item.retryCount,
          item.maxRetries,
          `"${(item.lastError || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          new Date(item.failedAt).toISOString(),
          new Date(item.createdAt).toISOString(),
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `failed-extractions-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    addToast({
      type: 'success',
      title: 'Export complete',
      description: `Exported ${failedItems.length} failed item(s) to CSV.`,
    })
  }, [failedItems, addToast])

  // Loading state
  if (failedItems === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Empty state
  if (failedItems.length === 0) {
    return (
      <BrandedEmptyState
        variant="reconcile"
        title="No Failed Extractions"
        description="All documents have been processed successfully. Failed extractions will appear here."
      />
    )
  }

  const allSelected = selectedItems.size === failedItems.length
  const someSelected = selectedItems.size > 0

  return (
    <div className="space-y-4">
      {/* Header with stats and actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Failed Extractions</h2>
          <p className="text-sm text-muted-foreground">
            {failedItems.length} document(s) failed after maximum retries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 text-sm border border-border hover:bg-secondary transition-colors focus-ring"
          >
            Export CSV
          </button>
          {someSelected && (
            <button
              onClick={handleBulkRetry}
              disabled={isProcessing}
              className={cn(
                'px-3 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-ring',
                'flex items-center gap-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isProcessing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <IconRefresh size={16} />
              )}
              Retry {selectedItems.size} Selected
            </button>
          )}
        </div>
      </div>

      {/* Selection bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-secondary/30 border border-border">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm">
            {allSelected ? 'Deselect all' : 'Select all'}
          </span>
        </label>
        {someSelected && (
          <span className="text-sm text-muted-foreground">
            {selectedItems.size} of {failedItems.length} selected
          </span>
        )}
      </div>

      {/* Item list */}
      <div className="space-y-2">
        {failedItems.map((item: NonNullable<typeof failedItems>[number]) => (
          <DLQItemRow
            key={item._id}
            item={item}
            isSelected={selectedItems.has(item._id)}
            isExpanded={expandedItems.has(item._id)}
            onSelect={handleSelectItem}
            onToggleExpand={handleToggleExpand}
            onRetry={handleRetryItem}
            onDelete={handleDeleteItem}
          />
        ))}
      </div>

      {/* Retry Confirmation Dialog */}
      <RetryFailedDialog
        isOpen={retryConfirm.isOpen}
        count={retryConfirm.data === 'bulk' ? selectedItems.size : 1}
        onConfirm={handleConfirmRetry}
        onCancel={retryConfirm.close}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        itemName="failed item"
        onConfirm={handleConfirmDelete}
        onCancel={deleteConfirm.close}
      />
    </div>
  )
}

export default DLQView
