/**
 * FileItemStatus - Status rendering for file upload items
 * Extracts complex nested ternaries into a config-based approach
 */

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  IconWarningCircle,
  IconRefresh,
  IconX,
  IconArrowRight,
} from '@/components/brand/icons'
import { LoadingSpinner, SuccessCheckmark } from '@/components/brand'
import { UPLOAD_CONFIG, BANK_TYPE_LABELS } from '@/lib/constants/upload'
import { formatCurrency } from '@/lib/fileUtils'
import type { FileStatus } from '@/lib/constants/upload'

interface ExtractionSummary {
  title: string
  description: string
  navigationPath: string
  navigationLabel: string
}

interface FileItemStatusProps {
  /** Current display status */
  status: FileStatus
  /** File name for aria labels */
  fileName: string
  /** Upload progress percentage (0-100) */
  progress?: number
  /** Error message if status is 'failed' */
  errorMessage?: string
  /** Extraction summary for completed files */
  extractionSummary?: ExtractionSummary | null
  /** Handler for upload button click */
  onUpload?: () => void
  /** Handler for retry button click */
  onRetry?: () => void
  /** Handler for cancel button click */
  onCancel?: () => void
  /** Handler for remove button click */
  onRemove?: () => void
}

/**
 * Get extraction summary based on document type and extraction results
 */
export function getExtractionSummary(
  documentType: string | undefined,
  transactionCount: number | undefined,
  bankType: string | undefined,
  periodStart: string | undefined,
  accrualDoc?: {
    docNumber?: string
    counterparty?: string
    amount?: number
  } | null
): ExtractionSummary {
  if (documentType === 'bank_statement') {
    const txCount = transactionCount ?? 0
    const bankName = bankType ? (BANK_TYPE_LABELS[bankType] || bankType) : 'Bank'
    const period = periodStart ? `(${periodStart})` : ''
    return {
      title: `${txCount} transactions extracted`,
      description: `From ${bankName} ${period}`.trim(),
      navigationPath: '/reconcile',
      navigationLabel: 'View in Reconcile',
    }
  }

  // For invoices/receipts
  const docLabel = documentType === 'invoice' ? 'Invoice' : 'Receipt'
  if (accrualDoc) {
    const docNum = accrualDoc.docNumber || 'Document'
    const counterparty = accrualDoc.counterparty || ''
    const amount = accrualDoc.amount ? formatCurrency(accrualDoc.amount) : ''
    const desc = counterparty && amount
      ? `${counterparty} - ${amount}`
      : counterparty || amount || ''
    return {
      title: `${docLabel} captured`,
      description: desc ? `${docNum} from ${desc}` : docNum,
      navigationPath: '/upload?tab=documents',
      navigationLabel: 'View Document',
    }
  }

  return {
    title: `${docLabel} processed`,
    description: 'Document captured successfully',
    navigationPath: '/upload?tab=documents',
    navigationLabel: 'View Document',
  }
}

/**
 * Idle status UI - Upload and remove buttons
 */
function IdleStatusUI({
  fileName,
  onUpload,
  onRemove,
}: {
  fileName: string
  onUpload?: () => void
  onRemove?: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onUpload}
        className="px-3 py-1.5 text-xs border border-border hover:bg-secondary transition-colors focus-ring"
      >
        Upload
      </button>
      <button
        onClick={onRemove}
        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-ring"
        aria-label={`Remove ${fileName}`}
      >
        <IconX size={16} />
      </button>
    </div>
  )
}

/**
 * Uploading status UI - Progress bar with cancel
 */
function UploadingStatusUI({
  progress,
  onCancel,
}: {
  progress: number
  onCancel?: () => void
}) {
  return (
    <div className="flex items-center gap-3" role="status">
      <div className="w-24 h-1.5 bg-secondary overflow-hidden">
        <div
          className="h-full bg-foreground transition-all"
          style={{
            width: `${progress}%`,
            transitionDuration: `${UPLOAD_CONFIG.PROGRESS_ANIMATION_MS}ms`,
          }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Upload progress: ${progress}%`}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-9">
        {progress}%
      </span>
      <button
        onClick={onCancel}
        className="p-1 text-muted-foreground hover:text-foreground transition-colors focus-ring"
        aria-label="Cancel upload"
      >
        <IconX size={16} />
      </button>
    </div>
  )
}

/**
 * Processing status UI - Loading spinner
 */
function ProcessingStatusUI() {
  return (
    <div className="flex items-center gap-2" role="status" aria-label="Processing document">
      <LoadingSpinner size="sm" />
      <span className="text-xs text-muted-foreground">Extracting...</span>
    </div>
  )
}

/**
 * Complete status UI - Success checkmark with navigation
 */
function CompleteStatusUI({
  fileName,
  summary,
  onRemove,
}: {
  fileName: string
  summary: ExtractionSummary
  onRemove?: () => void
}) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-3" role="status">
      <SuccessCheckmark size={16} animate={true} />
      <div className="flex flex-col">
        <span className="text-xs text-success font-medium">{summary.title}</span>
        {summary.description && (
          <span className="text-[10px] text-muted-foreground">{summary.description}</span>
        )}
      </div>
      <button
        onClick={() => router.push(summary.navigationPath)}
        className="flex items-center gap-1 text-xs text-info hover:text-info/80 font-medium transition-colors focus-ring group"
      >
        <span>{summary.navigationLabel}</span>
        <IconArrowRight
          size={12}
          className="transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </button>
      <button
        onClick={onRemove}
        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-ring"
        aria-label={`Remove ${fileName}`}
      >
        <IconX size={16} />
      </button>
    </div>
  )
}

/**
 * Failed status UI - Error message with retry and remove
 */
function FailedStatusUI({
  fileName,
  errorMessage,
  onRetry,
  onRemove,
}: {
  fileName: string
  errorMessage?: string
  onRetry?: () => void
  onRemove?: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-error">
        <IconWarningCircle size={16} aria-hidden="true" />
        <span className="max-w-[150px] truncate" title={errorMessage}>
          {errorMessage || 'Failed'}
        </span>
      </div>
      <button
        onClick={onRetry}
        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-ring"
        aria-label={`Retry upload for ${fileName}`}
      >
        <IconRefresh size={16} />
      </button>
      <button
        onClick={onRemove}
        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-ring"
        aria-label={`Remove ${fileName}`}
      >
        <IconX size={16} />
      </button>
    </div>
  )
}

/**
 * Main FileItemStatus component
 * Renders the appropriate status UI based on the file's current status
 */
export function FileItemStatus({
  status,
  fileName,
  progress = 0,
  errorMessage,
  extractionSummary,
  onUpload,
  onRetry,
  onCancel,
  onRemove,
}: FileItemStatusProps) {
  switch (status) {
    case 'idle':
      return (
        <IdleStatusUI
          fileName={fileName}
          onUpload={onUpload}
          onRemove={onRemove}
        />
      )

    case 'uploading':
      return (
        <UploadingStatusUI
          progress={progress}
          onCancel={onCancel}
        />
      )

    case 'processing':
      return <ProcessingStatusUI />

    case 'complete':
      if (!extractionSummary) {
        // Fallback if no summary provided
        return (
          <div className="flex items-center gap-2" role="status">
            <SuccessCheckmark size={16} animate={true} />
            <span className="text-xs text-success font-medium">Complete</span>
          </div>
        )
      }
      return (
        <CompleteStatusUI
          fileName={fileName}
          summary={extractionSummary}
          onRemove={onRemove}
        />
      )

    case 'failed':
      return (
        <FailedStatusUI
          fileName={fileName}
          errorMessage={errorMessage}
          onRetry={onRetry}
          onRemove={onRemove}
        />
      )

    default:
      return null
  }
}
