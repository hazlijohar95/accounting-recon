'use client'

/**
 * Confirmation Dialog Component
 *
 * Reusable dialog for confirming destructive or batch actions.
 * Supports single and bulk operations with customizable messaging.
 *
 * @module components/ui/confirmation-dialog
 */

import React, { useState, useCallback } from 'react'
import { Modal } from './modal'
import { LoadingSpinner } from '@/components/brand'
import { IconWarningCircle, IconTrash } from '@/components/brand/icons'
import { cn } from '@/lib/utils'

// ============================================================================
// Type Definitions
// ============================================================================

export interface ConfirmationDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Dialog title */
  title: string
  /** Dialog message/description */
  message: string
  /** Number of items being affected (for bulk operations) */
  itemCount?: number
  /** Whether this is a destructive action (shows red styling) */
  destructive?: boolean
  /** Label for the confirm button (default: "Confirm" or "Delete" if destructive) */
  confirmLabel?: string
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: string
  /** Async handler for confirm action */
  onConfirm: () => Promise<void>
  /** Handler for cancel/close action */
  onCancel: () => void
  /** Additional details to show (e.g., list of affected items) */
  details?: string[]
}

// ============================================================================
// Main Component
// ============================================================================

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  itemCount,
  destructive = false,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  details,
}: ConfirmationDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      await onConfirm()
      onCancel() // Close on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [onConfirm, onCancel])

  // Default confirm label based on destructive flag
  const resolvedConfirmLabel =
    confirmLabel ?? (destructive ? 'Delete' : 'Confirm')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
    >
      <div className="space-y-4">
        {/* Icon and message */}
        <div className="flex gap-3">
          {destructive && (
            <div className="flex-shrink-0 mt-0.5">
              <IconWarningCircle
                size={20}
                className="text-error"
                aria-hidden="true"
              />
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm text-foreground">{message}</p>

            {itemCount !== undefined && itemCount > 1 && (
              <p className="text-sm text-muted-foreground">
                This will affect{' '}
                <span className="font-medium text-foreground">
                  {itemCount} items
                </span>
                .
              </p>
            )}
          </div>
        </div>

        {/* Details list (optional) */}
        {details && details.length > 0 && (
          <div className="max-h-32 overflow-y-auto border border-border bg-secondary/20 p-2">
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {details.slice(0, 10).map((detail, index) => (
                <li key={index} className="truncate">
                  • {detail}
                </li>
              ))}
              {details.length > 10 && (
                <li className="text-muted-foreground italic">
                  ...and {details.length - 10} more
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-2 bg-error/10 border border-error/20 text-error text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 text-sm border border-border',
              'hover:bg-secondary transition-colors focus-ring',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors focus-ring',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center gap-2',
              destructive
                ? 'bg-error text-white hover:bg-error/90'
                : 'bg-foreground text-background hover:bg-foreground/90'
            )}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                {destructive && <IconTrash size={16} />}
                <span>{resolvedConfirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ============================================================================
// Preset Dialogs
// ============================================================================

/**
 * Delete Confirmation Dialog
 */
export function DeleteConfirmationDialog({
  isOpen,
  itemName,
  itemCount,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  itemName: string
  itemCount?: number
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  const title =
    itemCount && itemCount > 1 ? `Delete ${itemCount} ${itemName}s?` : `Delete ${itemName}?`

  const message =
    itemCount && itemCount > 1
      ? `Are you sure you want to delete these ${itemCount} ${itemName}s? This action cannot be undone.`
      : `Are you sure you want to delete this ${itemName}? This action cannot be undone.`

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      title={title}
      message={message}
      itemCount={itemCount}
      destructive
      confirmLabel="Delete"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}

/**
 * Bulk Approve Confirmation Dialog
 */
export function BulkApproveDialog({
  isOpen,
  count,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  count: number
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      title={`Approve ${count} Matches?`}
      message={`This will approve ${count} matches. Approved matches will be marked as reconciled.`}
      itemCount={count}
      confirmLabel={`Approve ${count} Matches`}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}

/**
 * Bulk Reject Confirmation Dialog
 */
export function BulkRejectDialog({
  isOpen,
  count,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  count: number
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      title={`Reject ${count} Matches?`}
      message={`This will reject ${count} matches. Rejected matches will need to be re-matched or manually resolved.`}
      itemCount={count}
      destructive
      confirmLabel={`Reject ${count} Matches`}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}

/**
 * Clear All Confirmation Dialog
 */
export function ClearAllDialog({
  isOpen,
  itemType,
  count,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  itemType: string
  count: number
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      title={`Clear All ${itemType}?`}
      message={`This will remove all ${count} ${itemType.toLowerCase()} from the list. This action cannot be undone.`}
      itemCount={count}
      destructive
      confirmLabel="Clear All"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}

/**
 * Cancel Queue Confirmation Dialog
 */
export function CancelQueueDialog({
  isOpen,
  queueName,
  remainingCount,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  queueName?: string
  remainingCount: number
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  const title = queueName ? `Cancel "${queueName}"?` : 'Cancel Queue?'

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      title={title}
      message={`This will cancel the extraction queue. ${remainingCount} documents that haven't been processed yet will be skipped.`}
      itemCount={remainingCount}
      destructive
      confirmLabel="Cancel Queue"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}

/**
 * Retry Failed Items Confirmation Dialog
 */
export function RetryFailedDialog({
  isOpen,
  count,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  count: number
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      title={`Retry ${count} Failed Items?`}
      message={`This will queue ${count} failed items for re-extraction. Processing will begin automatically.`}
      itemCount={count}
      confirmLabel={`Retry ${count} Items`}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}

// ============================================================================
// Hook for Confirmation State
// ============================================================================

export interface UseConfirmationState<T = void> {
  isOpen: boolean
  data: T | null
  open: (data: T) => void
  close: () => void
}

/**
 * Hook for managing confirmation dialog state
 *
 * @example
 * ```tsx
 * const deleteConfirm = useConfirmation<string>();
 *
 * // Open with data
 * deleteConfirm.open(documentId);
 *
 * // In dialog
 * <DeleteConfirmationDialog
 *   isOpen={deleteConfirm.isOpen}
 *   onConfirm={() => deleteDocument(deleteConfirm.data!)}
 *   onCancel={deleteConfirm.close}
 * />
 * ```
 */
export function useConfirmation<T = void>(): UseConfirmationState<T> {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<T | null>(null)

  const open = useCallback((d: T) => {
    setData(d)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // Delay clearing data to allow animation
    setTimeout(() => setData(null), 200)
  }, [])

  return { isOpen, data, open, close }
}
