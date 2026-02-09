'use client'

/**
 * Bulk Actions Bar
 *
 * Floating action bar for bulk operations on selected items.
 * Features:
 * - Bulk approve/reject
 * - Bulk categorize
 * - Bulk delete
 * - Export selected
 *
 * @module components/bulk-actions-bar
 */

import React, { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useWorkosUserId } from '@/lib/convex-hooks/shared'
import { cn } from '@/lib/utils'
import {
  IconCheck,
  IconX,
  IconTrash,
  IconDownload,
  IconFolder,
  IconWarning,
} from '@/components/brand/icons'
import { LoadingSpinner } from '@/components/brand'
import { useToast } from '@/components/ui/toast'
import { Modal } from '@/components/ui/modal'

// ============================================================================
// Types
// ============================================================================

interface BulkActionsBarProps {
  /** Selected item IDs */
  selectedIds: Id<"transactions">[]
  /** Callback to clear selection */
  onClearSelection: () => void
  /** Available categories for bulk categorize */
  categories?: string[]
  /** Additional class name */
  className?: string
}

// ============================================================================
// Bulk Actions Bar Component
// ============================================================================

/**
 * Floating action bar for bulk operations
 */
export function BulkActionsBar({
  selectedIds,
  onClearSelection,
  categories = ['Revenue', 'Operating Expenses', 'Payroll', 'Taxes', 'Other'],
  className,
}: BulkActionsBarProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const toast = useToast()

  // Auth fallback
  const workosUserId = useWorkosUserId()

  // Mutations
  const bulkUpdateStatus = useMutation(api.transactions.bulkUpdateStatus)
  const bulkDelete = useMutation(api.transactions.bulkDelete)
  const bulkUpdateCategory = useMutation(api.transactions.bulkUpdateCategory)

  const count = selectedIds.length

  // Don't render if nothing selected
  if (count === 0) return null

  const handleBulkApprove = async () => {
    setIsProcessing(true)
    try {
      const result = await bulkUpdateStatus({
        ids: selectedIds,
        status: 'matched',
        workosUserId,
      })
      toast.addToast({
        type: 'success',
        title: 'Bulk approve complete',
        description: `${result.updated} transactions approved${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
      })
      onClearSelection()
    } catch (error) {
      console.error('Bulk approve failed:', error)
      toast.addToast({
        type: 'error',
        title: 'Bulk approve failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkReject = async () => {
    setIsProcessing(true)
    try {
      const result = await bulkUpdateStatus({
        ids: selectedIds,
        status: 'suspense',
        workosUserId,
      })
      toast.addToast({
        type: 'success',
        title: 'Bulk reject complete',
        description: `${result.updated} transactions marked as suspense${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
      })
      onClearSelection()
    } catch (error) {
      console.error('Bulk reject failed:', error)
      toast.addToast({
        type: 'error',
        title: 'Bulk reject failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
    setIsProcessing(true)
    try {
      const result = await bulkDelete({ ids: selectedIds, workosUserId })
      toast.addToast({
        type: 'success',
        title: 'Bulk delete complete',
        description: `${result.deleted} transactions deleted${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
      })
      onClearSelection()
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Bulk delete failed:', error)
      toast.addToast({
        type: 'error',
        title: 'Bulk delete failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkCategorize = async (category: string) => {
    setIsProcessing(true)
    try {
      const result = await bulkUpdateCategory({
        ids: selectedIds,
        category,
        workosUserId,
      })
      toast.addToast({
        type: 'success',
        title: 'Bulk categorize complete',
        description: `${result.updated} transactions categorized${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
      })
      onClearSelection()
      setShowCategoryModal(false)
    } catch (error) {
      console.error('Bulk categorize failed:', error)
      toast.addToast({
        type: 'error',
        title: 'Bulk categorize failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      {/* Floating bar */}
      <div
        className={cn(
          'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
          'flex items-center gap-3',
          'px-4 py-3 bg-foreground text-background',
          'shadow-xl rounded-lg',
          'animate-in slide-in-from-bottom-4 fade-in',
          className
        )}
      >
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-3 border-r border-background/20">
          <span className="text-sm font-medium tabular-nums">{count}</span>
          <span className="text-sm opacity-70">selected</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Approve */}
          <ActionButton
            onClick={handleBulkApprove}
            icon={<IconCheck size={16} />}
            label="Approve"
            disabled={isProcessing}
          />

          {/* Reject */}
          <ActionButton
            onClick={handleBulkReject}
            icon={<IconX size={16} />}
            label="Reject"
            disabled={isProcessing}
          />

          {/* Categorize */}
          <ActionButton
            onClick={() => setShowCategoryModal(true)}
            icon={<IconFolder size={16} />}
            label="Categorize"
            disabled={isProcessing}
          />

          {/* Export - feature not yet implemented */}
          <ActionButton
            onClick={() => {}}
            icon={<IconDownload size={16} />}
            label="Export"
            disabled={true}
            title="Export feature coming soon"
          />

          {/* Delete */}
          <ActionButton
            onClick={() => setShowDeleteConfirm(true)}
            icon={<IconTrash size={16} />}
            label="Delete"
            variant="danger"
            disabled={isProcessing}
          />
        </div>

        {/* Clear selection */}
        <button
          onClick={onClearSelection}
          className="ml-2 p-1.5 hover:bg-background/10 rounded transition-colors"
          aria-label="Clear selection"
        >
          <IconX size={16} />
        </button>

        {/* Loading overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground rounded-lg">
            <LoadingSpinner size="sm" className="text-background" />
          </div>
        )}
      </div>

      {/* Category selection modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Categorize Transactions"
        size="sm"
      >
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-4">
            Select a category for {count} transaction{count !== 1 ? 's' : ''}:
          </p>
          <div className="grid gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleBulkCategorize(category)}
                disabled={isProcessing}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm',
                  'border border-border hover:bg-secondary',
                  'transition-colors focus-ring',
                  'disabled:opacity-50'
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Transactions"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-error/10 border border-error/20 rounded">
            <IconWarning size={20} className="text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-error">
                This action cannot be undone
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {count} transaction{count !== 1 ? 's' : ''} will be permanently deleted.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 text-sm border border-border hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className={cn(
                'px-4 py-2 text-sm',
                'bg-error text-white hover:bg-error/90',
                'transition-colors',
                'disabled:opacity-50'
              )}
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Action button for bulk actions bar
 */
function ActionButton({
  onClick,
  icon,
  label,
  variant = 'default',
  disabled = false,
  title,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  variant?: 'default' | 'danger'
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5',
        'text-sm font-medium',
        'rounded transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'default' && 'hover:bg-background/10',
        variant === 'danger' && 'text-error hover:bg-error/10'
      )}
      title={title || label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

// ============================================================================
// Hook for Selection Management
// ============================================================================

/**
 * Hook to manage multi-select state
 */
export function useMultiSelect<T extends string>() {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set())

  const toggleSelection = (id: T) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = (ids: T[]) => {
    setSelectedIds(new Set(ids))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const isSelected = (id: T) => selectedIds.has(id)

  const toggleAll = (ids: T[]) => {
    if (selectedIds.size === ids.length) {
      clearSelection()
    } else {
      selectAll(ids)
    }
  }

  return {
    selectedIds: Array.from(selectedIds) as T[],
    selectedCount: selectedIds.size,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    toggleAll,
    isAllSelected: (ids: T[]) => ids.length > 0 && selectedIds.size === ids.length,
    isSomeSelected: selectedIds.size > 0,
  }
}

// ============================================================================
// Exports
// ============================================================================

export type { BulkActionsBarProps }
