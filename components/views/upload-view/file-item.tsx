'use client'

import React, { useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  IconFileText,
  IconWarningCircle,
  IconRefresh,
  IconX,
} from '@/components/brand/icons'
import { formatFileSize } from '@/lib/utils'
import { LoadingSpinner, SuccessCheckmark } from '@/components/brand'
import { useDocument } from '@/lib/convex-hooks'
import { useToast } from '@/components/ui/toast'
import type { UploadedFile } from './types'
import { fileTypeLabels } from './types'

/**
 * Individual file item component with real-time status updates
 */
export function FileItem({
  file,
  onUpload,
  onRetry,
  onCancel,
  onRemove,
}: {
  file: UploadedFile
  onUpload: () => void
  onRetry: () => void
  onCancel: () => void
  onRemove: () => void
}) {
  const toast = useToast()

  // Subscribe to document status updates (using wrapper hook for consistency)
  const document = useDocument(file.documentId)

  // Track previous extraction status to detect completion
  const prevStatusRef = useRef<string | null>(null)

  // Show toast when extraction completes
  useEffect(() => {
    const currentStatus = document?.extractionStatus
    const prevStatus = prevStatusRef.current

    // Detect transition to 'completed' status
    if (currentStatus === 'completed' && prevStatus !== 'completed' && prevStatus !== null) {
      const txCount = document?.extractedTransactionCount ?? 0
      toast.addToast({
        type: 'success',
        title: 'Extraction complete',
        description: `${file.name}: ${txCount} transactions extracted`,
        duration: 8000,
      })
    }

    // Detect transition to 'failed' status
    if (currentStatus === 'failed' && prevStatus !== 'failed' && prevStatus !== null) {
      toast.addToast({
        type: 'error',
        title: 'Extraction failed',
        description: document?.errorMessage || `${file.name} could not be processed`,
        duration: 10000,
      })
    }

    prevStatusRef.current = currentStatus || null
  }, [document?.extractionStatus, document?.extractedTransactionCount, document?.errorMessage, file.name, toast])

  // Update local status based on document status
  const displayStatus = document?.extractionStatus === 'completed'
    ? 'complete'
    : document?.extractionStatus === 'failed'
      ? 'failed'
      : file.status

  const errorMessage = document?.errorMessage || file.errorMessage

  return (
    <li className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/20 transition-colors">
      {/* File info */}
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <div className="flex-shrink-0 mt-0.5 sm:mt-0">
          <IconFileText size={20} className="text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" title={file.name}>
            {file.name}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>{formatFileSize(file.size)}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{fileTypeLabels[file.type]}</span>
            {document?.extractedTransactionCount !== undefined && (
              <>
                <span aria-hidden="true">&middot;</span>
                <span className="text-foreground font-medium">
                  {document.extractedTransactionCount} transactions
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status and actions */}
      <div className="flex items-center gap-3 sm:flex-shrink-0 pl-8 sm:pl-0">
        {displayStatus === 'idle' && (
          <div className="flex items-center gap-2">
            <button
              onClick={onUpload}
              className="px-3 py-1.5 text-xs border border-border hover:bg-secondary transition-colors focus-ring"
            >
              Process
            </button>
            <button
              onClick={onRemove}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-ring"
              aria-label={`Remove ${file.name}`}
            >
              <IconX size={16} />
            </button>
          </div>
        )}

        {displayStatus === 'uploading' && (
          <div className="flex items-center gap-3" role="status">
            <div className="w-24 h-1.5 bg-secondary overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-150"
                style={{ width: `${file.progress}%` }}
                role="progressbar"
                aria-valuenow={file.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Upload progress: ${file.progress}%`}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-9">
              {file.progress}%
            </span>
            <button
              onClick={onCancel}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors focus-ring"
              aria-label="Cancel upload"
            >
              <IconX size={16} />
            </button>
          </div>
        )}

        {displayStatus === 'processing' && (
          <div className="flex items-center gap-2" role="status" aria-label="Processing document">
            <LoadingSpinner size="sm" />
            <span className="text-xs text-muted-foreground">
              {file.progressMessage || document?.extractionProgress?.phaseMessage || 'Extracting...'}
            </span>
          </div>
        )}

        {displayStatus === 'complete' && (
          <div className="flex items-center gap-2" role="status">
            <SuccessCheckmark size={16} animate={true} />
            <span className="text-xs text-success font-medium">Complete</span>
            {document?.extractionConfidence !== undefined && (
              <span className="text-xs text-muted-foreground">
                {Math.round(document.extractionConfidence)}%
              </span>
            )}
            {file.documentId && (
              <Link
                href={file.type === 'bank_statement' ? '/reconcile' : '/upload?tab=documents'}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors ml-1"
              >
                View
              </Link>
            )}
          </div>
        )}

        {displayStatus === 'failed' && (
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
              aria-label={`Retry upload for ${file.name}`}
            >
              <IconRefresh size={16} />
            </button>
            <button
              onClick={onRemove}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-ring"
              aria-label={`Remove ${file.name}`}
            >
              <IconX size={16} />
            </button>
          </div>
        )}
      </div>
    </li>
  )
}
