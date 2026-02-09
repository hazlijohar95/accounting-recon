'use client'

import React, { useState } from 'react'
import {
  IconFileText,
  IconRefresh,
  IconTrash,
} from '@/components/brand/icons'
import { cn, formatFileSize } from '@/lib/utils'
import { LoadingSpinner, BrandedEmptyState } from '@/components/brand'
import { Id } from '@/convex/_generated/dataModel'
import { useDeleteDocument, useTriggerExtraction, useResetExtraction } from '@/lib/convex-hooks'
import { useToast } from '@/components/ui/toast'
import { Modal } from '@/components/ui/modal'
import { ExtractionStatus } from '@/components/extraction-status'
import type { DocumentItem, UploadedFile } from './types'
import { fileTypeLabels, statusColors } from './types'
import { DemoDocumentsList } from './demo-documents-list'

/**
 * Documents Section - displays uploaded documents list with management actions
 */
export function DocumentsSection({
  documents,
  companyId,
  isDemo,
}: {
  documents: DocumentItem[] | undefined
  companyId: Id<"companies"> | null
  isDemo: boolean
}) {
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [visibleCount, setVisibleCount] = useState(25)
  const deleteDocument = useDeleteDocument()
  const resetExtraction = useResetExtraction()
  const triggerExtraction = useTriggerExtraction()
  const toast = useToast()

  // Demo mode shows mock list
  if (isDemo) {
    return <DemoDocumentsList />
  }

  // Loading state
  if (documents === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  // No company selected
  if (!companyId) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">
          Select a company to view documents
        </p>
      </div>
    )
  }

  // Empty state
  if (documents.length === 0) {
    return (
      <BrandedEmptyState
        variant="upload"
        title="No documents yet"
        description="Upload bank statements, invoices, or receipts to get started with reconciliation."
      />
    )
  }

  // Filter documents by type
  const filteredDocuments =
    filterType === 'all'
      ? documents
      : documents.filter((d) => d.documentType === filterType)

  // Paginate: show up to visibleCount
  const visibleDocuments = filteredDocuments.slice(0, visibleCount)
  const hasMore = filteredDocuments.length > visibleCount

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteDocument(deleteTarget._id)
      toast.addToast({
        type: 'success',
        title: 'Document deleted',
        description: `${deleteTarget.fileName} and its extracted data have been removed`,
      })
      setDeleteTarget(null)
      // Close detail modal if it was showing this document
      if (selectedDoc?._id === deleteTarget._id) {
        setSelectedDoc(null)
      }
    } catch (error) {
      console.error('Failed to delete document:', error)
      toast.addToast({
        type: 'error',
        title: 'Failed to delete',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRetryExtraction = async (docId: Id<"documents">) => {
    try {
      // Reset the document status first
      await resetExtraction(docId)
      // Then trigger extraction again
      await triggerExtraction(docId)
      toast.addToast({
        type: 'info',
        title: 'Retrying extraction',
        description: 'Document has been queued for re-extraction',
      })
    } catch (error) {
      console.error('Failed to retry extraction:', error)
      toast.addToast({
        type: 'error',
        title: 'Retry failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter dropdown */}
      <div className="flex items-center gap-2">
        <label htmlFor="doc-type-filter" className="text-xs text-muted-foreground">
          Filter:
        </label>
        <select
          id="doc-type-filter"
          value={filterType}
          onChange={(e) => {
              setFilterType(e.target.value)
              setVisibleCount(25) // Reset pagination on filter change
            }}
          className="text-sm bg-background border border-border px-2 py-1 focus-ring"
        >
          <option value="all">All Types</option>
          <option value="bank_statement">Bank Statements</option>
          <option value="invoice">Invoices</option>
          <option value="receipt">Receipts</option>
          <option value="other">Other</option>
        </select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Document list */}
      <ul className="border border-border divide-y divide-border" role="list">
        {visibleDocuments.map((doc) => (
          <DocumentListItem
            key={doc._id}
            document={doc}
            onSelect={() => setSelectedDoc(doc)}
            onDelete={() => setDeleteTarget(doc)}
            onRetry={() => handleRetryExtraction(doc._id)}
          />
        ))}
      </ul>

      {/* Show more */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + 25)}
            className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-secondary transition-colors focus-ring"
          >
            Show more ({filteredDocuments.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* Detail modal */}
      {selectedDoc && (
        <DocumentDetailModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDelete={() => {
            setDeleteTarget(selectedDoc)
            setSelectedDoc(null)
          }}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <Modal
          isOpen
          onClose={() => !isDeleting && setDeleteTarget(null)}
          title="Delete Document"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm">
              Are you sure you want to delete{' '}
              <span className="font-medium">{deleteTarget.fileName}</span>?
            </p>
            <div className="bg-error/5 border border-error/20 px-3 py-2">
              <p className="text-xs text-error/90">
                This will permanently remove the document and all its extracted data,
                including transactions, matches, and accrual records. This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs border border-border hover:bg-secondary transition-colors focus-ring disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs bg-error text-white hover:bg-error/90 transition-colors focus-ring disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border border-white/40 border-t-white animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  'Delete Permanently'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/**
 * Document List Item - individual document row
 */
function DocumentListItem({
  document,
  onSelect,
  onDelete,
  onRetry,
}: {
  document: DocumentItem
  onSelect: () => void
  onDelete: () => void
  onRetry: () => void
}) {
  const canRetry = document.extractionStatus === 'processing' || document.extractionStatus === 'failed'

  return (
    <li className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-secondary/20 transition-colors">
      {/* File info - clickable */}
      <button
        onClick={onSelect}
        className="flex items-start gap-3 flex-1 text-left min-w-0 focus-ring"
      >
        <IconFileText size={20} className="text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" title={document.fileName}>
            {document.fileName}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(document.uploadedAt).toLocaleDateString()} · {formatFileSize(document.fileSize)}
            {document.extractedTransactionCount !== undefined && (
              <span className="ml-1">· {document.extractedTransactionCount} txns</span>
            )}
          </p>
        </div>
      </button>

      {/* Type badge */}
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {fileTypeLabels[document.documentType as UploadedFile['type']] || document.documentType}
      </span>

      {/* Status badge */}
      <span
        className={cn(
          'px-2 py-0.5 text-xs font-medium capitalize',
          statusColors[document.extractionStatus] || 'bg-secondary text-muted-foreground'
        )}
      >
        {document.extractionStatus}
      </span>

      {/* Retry button - show for stuck/failed documents */}
      {canRetry && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRetry()
          }}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-ring"
          aria-label={`Retry extraction for ${document.fileName}`}
          title="Retry extraction"
        >
          <IconRefresh size={16} />
        </button>
      )}

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="p-1.5 text-muted-foreground hover:text-error transition-colors focus-ring"
        aria-label={`Delete ${document.fileName}`}
      >
        <IconTrash size={16} />
      </button>
    </li>
  )
}

/**
 * Document Detail Modal - shows document details with retry/delete actions
 */
function DocumentDetailModal({
  document,
  onClose,
  onDelete,
}: {
  document: DocumentItem
  onClose: () => void
  onDelete: () => void
}) {
  return (
    <Modal isOpen onClose={onClose} title="Document Details" size="md">
      <div className="space-y-4">
        {/* File info */}
        <div>
          <h3 className="font-medium text-sm">{document.fileName}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {formatFileSize(document.fileSize)} · {fileTypeLabels[document.documentType as UploadedFile['type']] || document.documentType}
          </p>
          <p className="text-xs text-muted-foreground">
            Uploaded {new Date(document.uploadedAt).toLocaleString()}
          </p>
        </div>

        {/* Extraction status with full details */}
        <div className="pt-4 border-t border-border">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Extraction Status
          </h4>
          <ExtractionStatus documentId={document._id} showDetails />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-xs text-error border border-error/30 hover:bg-error/10 transition-colors focus-ring"
          >
            Delete Document
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs border border-border hover:bg-secondary transition-colors focus-ring"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
