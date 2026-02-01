'use client'

import React from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import {
  IconCheckCircle,
  IconXCircle,
  IconClock,
  IconRefresh,
  IconFileText,
  IconWarning,
  IconLoader,
} from '@/components/brand/icons'
import { LoadingSpinner } from '@/components/brand'
import { useToast } from '@/components/ui/toast'

interface ExtractionStatusProps {
  documentId: Id<"documents">
  showDetails?: boolean
  className?: string
}

/**
 * Extraction Status Component
 *
 * Shows the current extraction status for a document with:
 * - Progress spinner during "processing"
 * - Error message with retry button on "failed"
 * - Confidence score on "completed"
 * - Count of extracted transactions
 *
 * Uses semantic color tokens for consistency.
 */
export function ExtractionStatus({
  documentId,
  showDetails = true,
  className,
}: ExtractionStatusProps) {
  const document = useQuery(api.documents.get, { id: documentId })
  const triggerExtraction = useAction(api.extraction.triggerExtraction)
  const toast = useToast()

  if (!document) {
    return (
      <div role="status" aria-label="Loading document status">
        <LoadingSpinner size="sm" />
      </div>
    )
  }

  const status = document.extractionStatus

  const handleRetry = async () => {
    try {
      toast.addToast({
        type: 'info',
        title: 'Retrying extraction',
        description: 'Processing your document again...',
      })
      await triggerExtraction({ documentId })
      toast.addToast({
        type: 'success',
        title: 'Extraction started',
        description: 'Your document is being processed',
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
    <div
      className={cn('flex flex-col gap-2', className)}
      role="region"
      aria-label={`Document extraction status: ${statusLabels[status]}`}
    >
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <StatusIcon status={status} />
        <span className="text-sm font-medium" aria-live="polite">
          {statusLabels[status]}
        </span>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="text-xs text-muted-foreground space-y-1.5">
          {/* Pending */}
          {status === 'pending' && (
            <p>Document is queued for extraction</p>
          )}

          {/* Processing */}
          {status === 'processing' && (
            <div className="flex items-center gap-2" role="status" aria-live="polite">
              <IconLoader size={12} className="animate-spin text-info" aria-hidden="true" />
              <span>Extracting data from document...</span>
            </div>
          )}

          {/* Completed */}
          {status === 'completed' && (
            <div className="space-y-1.5">
              {document.extractionConfidence !== undefined && (
                <div className="flex items-center gap-2">
                  <ConfidenceIndicator confidence={document.extractionConfidence} />
                  <span>
                    <span className="font-medium text-foreground">
                      {Math.round(document.extractionConfidence)}%
                    </span>
                    {' '}confidence
                  </span>
                </div>
              )}

              {document.extractedTransactionCount !== undefined && (
                <div className="flex items-center gap-2">
                  <IconFileText size={12} aria-hidden="true" />
                  <span>
                    <span className="font-medium text-foreground">
                      {document.extractedTransactionCount}
                    </span>
                    {' '}transaction{document.extractedTransactionCount !== 1 ? 's' : ''} extracted
                  </span>
                </div>
              )}

              {document.bankType && (
                <div className="flex items-center gap-2">
                  <span>
                    Bank: <span className="font-medium text-foreground">{formatBankType(document.bankType)}</span>
                  </span>
                </div>
              )}

              {document.periodStart && document.periodEnd && (
                <div className="flex items-center gap-2">
                  <span>
                    Period: <span className="font-mono">{document.periodStart}</span> to{' '}
                    <span className="font-mono">{document.periodEnd}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Failed */}
          {status === 'failed' && (
            <div className="space-y-2">
              {document.errorMessage && (
                <div className="flex items-start gap-2 text-error">
                  <IconWarning size={12} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="break-words">{document.errorMessage}</span>
                </div>
              )}
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border hover:bg-secondary transition-colors focus-ring"
              >
                <IconRefresh size={12} aria-hidden="true" />
                Retry Extraction
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Compact version for inline use
 */
export function ExtractionStatusBadge({
  documentId,
}: {
  documentId: Id<"documents">
}) {
  const document = useQuery(api.documents.get, { id: documentId })

  if (!document) {
    return (
      <span className="text-xs text-muted-foreground" role="status">
        Loading...
      </span>
    )
  }

  const status = document.extractionStatus

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium',
        statusStyles[status]
      )}
      role="status"
      aria-label={`Extraction status: ${statusLabels[status]}`}
    >
      <StatusIcon status={status} size={12} />
      {statusLabels[status]}
      {status === 'completed' && document.extractionConfidence !== undefined && (
        <span className="opacity-75">
          ({Math.round(document.extractionConfidence)}%)
        </span>
      )}
    </span>
  )
}

/**
 * Status icon component using semantic colors
 */
function StatusIcon({
  status,
  size = 16,
}: {
  status: string
  size?: number
}) {
  switch (status) {
    case 'pending':
      return (
        <IconClock
          size={size}
          className="text-muted-foreground"
          aria-hidden="true"
        />
      )
    case 'processing':
      return (
        <IconLoader
          size={size}
          className="text-info animate-spin"
          aria-hidden="true"
        />
      )
    case 'completed':
      return (
        <IconCheckCircle
          size={size}
          className="text-success"
          aria-hidden="true"
        />
      )
    case 'failed':
      return (
        <IconXCircle
          size={size}
          className="text-error"
          aria-hidden="true"
        />
      )
    default:
      return null
  }
}

/**
 * Confidence indicator with semantic color gradient
 */
function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const getColor = () => {
    if (confidence >= 90) return 'bg-success'
    if (confidence >= 70) return 'bg-warning'
    return 'bg-error'
  }

  const getLabel = () => {
    if (confidence >= 90) return 'High confidence'
    if (confidence >= 70) return 'Medium confidence'
    return 'Low confidence'
  }

  return (
    <div
      className="flex items-center gap-1"
      role="meter"
      aria-valuenow={confidence}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={getLabel()}
    >
      <div className="w-16 h-1.5 bg-secondary overflow-hidden">
        <div
          className={cn('h-full transition-all', getColor())}
          style={{ width: `${confidence}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Format bank type for display
 */
function formatBankType(bankType: string): string {
  const mapping: Record<string, string> = {
    maybank: 'Maybank',
    cimb: 'CIMB',
    public_bank: 'Public Bank',
    rhb: 'RHB',
    hong_leong: 'Hong Leong',
    ambank: 'AmBank',
    bank_islam: 'Bank Islam',
    ocbc: 'OCBC',
    uob: 'UOB',
    hsbc: 'HSBC',
    unknown: 'Unknown',
  }
  return mapping[bankType] || bankType
}

// Status labels for display
const statusLabels: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
}

// Status styles using semantic color tokens
const statusStyles: Record<string, string> = {
  pending: 'bg-secondary text-muted-foreground',
  processing: 'bg-info-light text-info',
  completed: 'bg-success-light text-success',
  failed: 'bg-error-light text-error',
}
