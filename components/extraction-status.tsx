'use client'

/**
 * Extraction Status Component
 *
 * A beautifully designed component showing document extraction progress.
 * Features geometric animations matching the Reconciled brand aesthetic.
 * Now with enhanced phase stepper UI for native PDF extraction.
 *
 * @module components/extraction-status
 */

import React, { useEffect, useState, useMemo } from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { useWorkosUserId } from '@/lib/convex-hooks/shared'
import {
  IconCheckCircle,
  IconXCircle,
  IconClock,
  IconRefresh,
  IconFileText,
  IconWarning,
  IconArrowRight,
  IconUpload,
  IconImage,
  IconWand,
} from '@/components/brand/icons'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/brand'
import { useToast } from '@/components/ui/toast'

interface ExtractionStatusProps {
  documentId: Id<"documents">
  showDetails?: boolean
  className?: string
}

/** Phase definitions for the stepper */
const EXTRACTION_PHASES = [
  { key: 'uploading', label: 'Upload', icon: IconUpload },
  { key: 'converting', label: 'Convert', icon: IconImage },
  { key: 'extracting', label: 'Extract', icon: IconWand },
  { key: 'complete', label: 'Done', icon: IconCheckCircle },
] as const

type ExtractionPhase = typeof EXTRACTION_PHASES[number]['key'] | 'processing' | 'failed' | 'pending'

/**
 * Extraction Status Component
 *
 * Shows the current extraction status for a document with:
 * - Animated document scanner during "processing"
 * - Page-by-page progress visualization
 * - Error message with retry button on "failed"
 * - Confidence score and stats on "completed"
 */
export function ExtractionStatus({
  documentId,
  showDetails = true,
  className,
}: ExtractionStatusProps) {
  const workosUserId = useWorkosUserId()
  const document = useQuery(api.documents.get, { id: documentId, workosUserId })
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
  // Use new extractionPhase if available, fall back to legacy status
  const phase = (document as { extractionPhase?: ExtractionPhase }).extractionPhase || mapStatusToPhase(status)

  const handleRetry = async () => {
    try {
      toast.addToast({
        type: 'info',
        title: 'Retrying extraction',
        description: 'Processing your document again...',
      })
      // Use force: true to override stuck "processing" status
      await triggerExtraction({ documentId, force: true })
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

  // Determine if we should show the new phase stepper (for native extraction)
  const showPhaseStepper = phase && ['uploading', 'converting', 'extracting', 'processing', 'complete'].includes(phase)

  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      role="region"
      aria-label={`Document extraction status: ${phaseLabels[phase] || statusLabels[status]}`}
    >
      {/* Phase Stepper (for native extraction with granular progress) */}
      {showPhaseStepper && showDetails && (
        <PhaseStepper
          currentPhase={phase}
          progress={document.extractionProgress}
        />
      )}

      {/* Status Badge (legacy fallback) */}
      {!showPhaseStepper && (
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <span className="text-sm font-medium tracking-tight" aria-live="polite">
            {statusLabels[status]}
          </span>
        </div>
      )}

      {/* Details */}
      {showDetails && (
        <div className="text-xs text-muted-foreground">
          {/* Pending */}
          {status === 'pending' && !showPhaseStepper && (
            <div className="flex items-center gap-2 py-2">
              <div className="w-1 h-1 bg-muted-foreground/40" />
              <span>Document is queued for extraction</span>
            </div>
          )}

          {/* Processing - Show enhanced visualization */}
          {status === 'processing' && (
            <ProcessingVisualization
              progress={document.extractionProgress}
              phase={phase}
              onForceRetry={handleRetry}
            />
          )}

          {/* Completed */}
          {status === 'completed' && (
            <CompletedState
              confidence={document.extractionConfidence}
              transactionCount={document.extractedTransactionCount}
              bankType={document.bankType}
              periodStart={document.periodStart}
              periodEnd={document.periodEnd}
              documentType={document.documentType}
            />
          )}

          {/* Failed */}
          {status === 'failed' && (
            <FailedState
              errorMessage={document.errorMessage}
              onRetry={handleRetry}
            />
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Map legacy extraction status to new phase
 */
function mapStatusToPhase(status: string): ExtractionPhase {
  switch (status) {
    case 'pending':
      return 'pending'
    case 'processing':
      return 'extracting' // Default to extracting phase
    case 'completed':
      return 'complete'
    case 'failed':
      return 'failed'
    default:
      return 'pending'
  }
}

/**
 * Phase labels for display
 */
const phaseLabels: Record<string, string> = {
  uploading: 'Uploading',
  converting: 'Converting',
  extracting: 'Extracting',
  processing: 'Processing',
  complete: 'Complete',
  failed: 'Failed',
  pending: 'Pending',
}

/**
 * Phase Stepper Component
 *
 * Visual progress indicator showing extraction phases:
 * Upload -> Convert -> Extract -> Done
 */
function PhaseStepper({
  currentPhase,
  progress,
}: {
  currentPhase: ExtractionPhase
  progress?: {
    currentPage?: number
    totalPages?: number
    pagesCompleted?: number
    streamedTransactionCount?: number
    phaseMessage?: string
  }
}) {
  // Get phase index for progress calculation
  const phaseIndex = EXTRACTION_PHASES.findIndex(p => p.key === currentPhase)
  const isComplete = currentPhase === 'complete'
  const isFailed = currentPhase === 'failed'

  return (
    <div className="space-y-3 py-2">
      {/* Phase Steps */}
      <div className="flex items-center justify-between gap-1" role="progressbar" aria-valuenow={phaseIndex + 1} aria-valuemax={EXTRACTION_PHASES.length}>
        {EXTRACTION_PHASES.map((phase, index) => {
          const isActive = phase.key === currentPhase || (currentPhase === 'processing' && phase.key === 'extracting')
          const isPast = index < phaseIndex || isComplete
          const Icon = phase.icon

          return (
            <React.Fragment key={phase.key}>
              {/* Step */}
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-sm transition-all duration-300',
                  isActive && 'bg-info/10 text-info',
                  isPast && 'text-success',
                  !isActive && !isPast && 'text-muted-foreground/50'
                )}
              >
                <Icon
                  size={14}
                  className={cn(
                    'transition-all duration-300',
                    isActive && 'animate-pulse'
                  )}
                  aria-hidden="true"
                />
                <span className="text-xs font-medium hidden sm:inline">
                  {phase.label}
                </span>
              </div>

              {/* Connector */}
              {index < EXTRACTION_PHASES.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-px transition-colors duration-500',
                    isPast ? 'bg-success' : 'bg-border'
                  )}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Progress Message */}
      {progress?.phaseMessage && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-1 h-1 bg-info animate-pulse rounded-full" />
          <span>{progress.phaseMessage}</span>
        </div>
      )}

      {/* Page Progress Bar (for multi-page documents) */}
      {progress && progress.totalPages && progress.totalPages > 1 && (
        <div className="space-y-1">
          <div className="relative h-1.5 bg-secondary overflow-hidden rounded-sm">
            <div
              className="absolute inset-y-0 left-0 bg-info transition-all duration-300 ease-out"
              style={{
                width: `${((progress.pagesCompleted ?? progress.currentPage ?? 0) / progress.totalPages) * 100}%`
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              {progress.streamedTransactionCount !== undefined && progress.streamedTransactionCount > 0
                ? `${progress.streamedTransactionCount} transactions found`
                : `Page ${progress.pagesCompleted ?? progress.currentPage ?? 0} of ${progress.totalPages}`
              }
            </span>
            <span className="tabular-nums">
              {Math.round(((progress.pagesCompleted ?? progress.currentPage ?? 0) / progress.totalPages) * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Beautiful processing visualization with animated document scanner
 * Now includes real-time streaming transaction count and phase awareness
 */
function ProcessingVisualization({
  progress,
  phase,
  onForceRetry,
}: {
  progress?: {
    currentPage: number;
    totalPages: number;
    pagesCompleted?: number;
    streamedTransactionCount?: number;
    phaseMessage?: string;
  }
  phase?: ExtractionPhase
  onForceRetry?: () => void
}) {
  const [scanPosition, setScanPosition] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [showStuckMessage, setShowStuckMessage] = useState(false)

  // Show "stuck" message after 30 seconds of no progress
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowStuckMessage(true)
    }, 30000) // 30 seconds
    return () => clearTimeout(timer)
  }, [progress]) // Reset timer when progress changes

  // ACCESSIBILITY: Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Animate the scan line (respects reduced motion preference)
  useEffect(() => {
    // Skip animation if user prefers reduced motion
    if (prefersReducedMotion) {
      setScanPosition(50) // Static position in middle
      return
    }

    const interval = setInterval(() => {
      setScanPosition(prev => (prev + 1) % 100)
    }, 30)
    return () => clearInterval(interval)
  }, [prefersReducedMotion])

  // Use pagesCompleted for parallel processing, fallback to currentPage
  const completedPages = progress?.pagesCompleted ?? progress?.currentPage ?? 0
  // QUALITY FIX: Prevent division by zero when totalPages is 0 or undefined
  const percentage = progress && progress.totalPages > 0
    ? Math.round((completedPages / progress.totalPages) * 100)
    : null

  return (
    <div className="space-y-4 py-2" role="status" aria-live="polite">
      {/* Document Scanner Animation */}
      <div className="relative w-full max-w-[200px]">
        {/* Document outline */}
        <div className="relative aspect-[3/4] w-24 border border-border bg-card overflow-hidden">
          {/* Document lines (content placeholder) */}
          <div className="absolute inset-2 space-y-1.5">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-1 bg-muted transition-all duration-300"
                style={{
                  width: `${60 + Math.sin(i * 0.8) * 30}%`,
                  opacity: scanPosition > (i * 12) ? 0.6 : 0.15,
                  transform: scanPosition > (i * 12) ? 'scaleX(1)' : 'scaleX(0.7)',
                  transformOrigin: 'left',
                }}
              />
            ))}
          </div>

          {/* Scanning line */}
          <div
            className="absolute left-0 right-0 h-0.5 bg-info transition-none"
            style={{
              top: `${scanPosition}%`,
              boxShadow: '0 0 8px var(--info), 0 0 16px var(--info)',
            }}
          />

          {/* Glow effect at scan position */}
          <div
            className="absolute left-0 right-0 h-8 pointer-events-none"
            style={{
              top: `${Math.max(0, scanPosition - 4)}%`,
              background: 'linear-gradient(180deg, transparent, rgba(2, 132, 199, 0.1), transparent)',
            }}
          />
        </div>

        {/* Status text beside document */}
        <div className="absolute left-28 top-1/2 -translate-y-1/2 space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 bg-info",
                    !prefersReducedMotion && "animate-pulse"
                  )}
                  style={prefersReducedMotion ? undefined : {
                    animationDelay: `${i * 200}ms`,
                    animationDuration: '1s',
                  }}
                />
              ))}
            </div>
            <span className="text-foreground font-medium">
              {progress
                ? `${completedPages}/${progress.totalPages} pages`
                : 'Analyzing'}
            </span>
          </div>

          {/* Streaming transaction count */}
          {progress?.streamedTransactionCount !== undefined && progress.streamedTransactionCount > 0 && (
            <div className="flex items-center gap-1.5 text-success animate-in fade-in duration-300">
              <IconFileText size={12} className="text-success" aria-hidden="true" />
              <span className="text-xs font-medium tabular-nums">
                {progress.streamedTransactionCount}
              </span>
              <span className="text-[10px] text-muted-foreground">
                found
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar for multi-page */}
      {progress && progress.totalPages > 1 && (
        <div className="space-y-2 max-w-[200px]">
          {/* Progress bar */}
          <div className="relative h-1 bg-secondary overflow-hidden">
            {/* Background segments */}
            <div className="absolute inset-0 flex gap-px">
              {[...Array(progress.totalPages)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 transition-colors duration-500"
                  style={{
                    backgroundColor: i < completedPages
                      ? 'var(--info)'
                      : 'var(--secondary)',
                  }}
                />
              ))}
            </div>
            {/* Animated fill */}
            <div
              className="absolute top-0 left-0 h-full bg-info transition-all duration-700 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Percentage and transaction count */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-wide uppercase text-muted-foreground">
              {progress.streamedTransactionCount !== undefined && progress.streamedTransactionCount > 0
                ? `${progress.streamedTransactionCount} transactions`
                : 'Extracting data'}
            </span>
            <span className="text-xs font-mono text-foreground tabular-nums">
              {percentage}%
            </span>
          </div>
        </div>
      )}

      {/* Single page / no progress info */}
      {!progress && (
        <span className="text-muted-foreground">
          Extracting data from document...
        </span>
      )}

      {/* Stuck message with force retry option */}
      {showStuckMessage && onForceRetry && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
          <p className="text-xs text-muted-foreground">
            Taking longer than expected?
          </p>
          <button
            onClick={onForceRetry}
            className={cn(
              "group flex items-center gap-2 px-3 py-1.5",
              "text-xs font-medium tracking-tight",
              "bg-card border border-border",
              "hover:bg-secondary hover:border-foreground/20",
              "active:scale-[0.98]",
              "transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <IconRefresh
              size={12}
              className="transition-transform duration-300 group-hover:rotate-180"
              aria-hidden="true"
            />
            Force Retry
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Completed state with stats and navigation
 */
function CompletedState({
  confidence,
  transactionCount,
  bankType,
  periodStart,
  periodEnd,
  documentType,
  onNavigate,
}: {
  confidence?: number
  transactionCount?: number
  bankType?: string
  periodStart?: string
  periodEnd?: string
  documentType?: string
  onNavigate?: (path: string) => void
}) {
  const router = useRouter()

  // Determine the appropriate label and navigation based on document type
  const isBankStatement = documentType === 'bank_statement'
  const itemLabel = isBankStatement ? 'transactions' : 'document'
  const navigationPath = isBankStatement ? '/reconcile' : '/upload?tab=documents'
  const navigationLabel = isBankStatement ? 'View in Reconcile' : 'View Document'

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate(navigationPath)
    } else {
      router.push(navigationPath)
    }
  }

  return (
    <div className="space-y-3 py-2 animate-fade-in">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Confidence */}
        {confidence !== undefined && (
          <div className="space-y-1">
            <div className="text-[10px] tracking-wide uppercase text-muted-foreground">
              Confidence
            </div>
            <div className="flex items-center gap-2">
              <ConfidenceIndicator confidence={confidence} />
              <span className="text-sm font-medium text-foreground tabular-nums">
                {Math.round(confidence)}%
              </span>
            </div>
          </div>
        )}

        {/* Transaction/Document count */}
        {transactionCount !== undefined && (
          <div className="space-y-1">
            <div className="text-[10px] tracking-wide uppercase text-muted-foreground">
              Extracted
            </div>
            <div className="flex items-center gap-1.5">
              <IconFileText size={14} className="text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground tabular-nums">
                {isBankStatement ? transactionCount : 1}
              </span>
              <span className="text-muted-foreground">
                {isBankStatement
                  ? `transaction${transactionCount !== 1 ? 's' : ''}`
                  : 'document'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Additional info */}
      {(bankType || (periodStart && periodEnd)) && (
        <div className="pt-2 border-t border-border/50 space-y-1">
          {bankType && (
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-muted-foreground/40" />
              <span>
                <span className="text-muted-foreground">Bank:</span>{' '}
                <span className="text-foreground">{formatBankType(bankType)}</span>
              </span>
            </div>
          )}

          {periodStart && periodEnd && (
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-muted-foreground/40" />
              <span>
                <span className="text-muted-foreground">Period:</span>{' '}
                <span className="font-mono text-foreground">{periodStart}</span>
                <span className="text-muted-foreground"> — </span>
                <span className="font-mono text-foreground">{periodEnd}</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Navigation link */}
      <button
        onClick={handleNavigate}
        className="flex items-center gap-1.5 text-xs font-medium text-info hover:text-info/80 transition-colors focus-ring group"
      >
        <span>{navigationLabel}</span>
        <IconArrowRight
          size={12}
          className="transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </button>
    </div>
  )
}

/**
 * Failed state with error and retry
 */
function FailedState({
  errorMessage,
  onRetry,
}: {
  errorMessage?: string
  onRetry: () => void
}) {
  return (
    <div className="space-y-3 py-2">
      {errorMessage && (
        <div className="flex items-start gap-2 p-2 bg-error/5 border border-error/20">
          <IconWarning size={14} className="mt-0.5 flex-shrink-0 text-error" aria-hidden="true" />
          <span className="break-words text-error/90">{errorMessage}</span>
        </div>
      )}
      <button
        onClick={onRetry}
        className={cn(
          "group flex items-center gap-2 px-3 py-2",
          "text-xs font-medium tracking-tight",
          "bg-card border border-border",
          "hover:bg-secondary hover:border-foreground/20",
          "active:scale-[0.98]",
          "transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <IconRefresh
          size={14}
          className="transition-transform duration-300 group-hover:rotate-180"
          aria-hidden="true"
        />
        Retry Extraction
      </button>
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
  const workosUserId = useWorkosUserId()
  const document = useQuery(api.documents.get, { id: documentId, workosUserId })

  if (!document) {
    return (
      <span className="text-xs text-muted-foreground" role="status">
        Loading...
      </span>
    )
  }

  const status = document.extractionStatus
  const progress = document.extractionProgress

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-2.5 py-1',
        'text-xs font-medium tracking-tight',
        'transition-colors duration-300',
        statusStyles[status]
      )}
      role="status"
      aria-label={`Extraction status: ${statusLabels[status]}`}
    >
      <StatusIcon status={status} size={12} />
      <span>
        {status === 'processing' && progress
          ? `${progress.currentPage}/${progress.totalPages}`
          : statusLabels[status]}
      </span>
      {status === 'completed' && document.extractionConfidence !== undefined && (
        <span className="opacity-60 tabular-nums">
          {Math.round(document.extractionConfidence)}%
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
        <div
          className="relative"
          style={{ width: size, height: size }}
        >
          {/* Pulsing squares animation */}
          <div className="absolute inset-0 grid grid-cols-2 gap-px">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-info animate-pulse"
                style={{
                  animationDelay: `${i * 150}ms`,
                  animationDuration: '1s',
                }}
              />
            ))}
          </div>
        </div>
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
 * Confidence indicator with geometric bar
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
      className="flex items-center gap-0.5"
      role="meter"
      aria-valuenow={confidence}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={getLabel()}
    >
      {/* Segmented bar */}
      {[0, 25, 50, 75].map((threshold) => (
        <div
          key={threshold}
          className={cn(
            'w-2 h-2 transition-all duration-500',
            confidence > threshold ? getColor() : 'bg-secondary'
          )}
          style={{
            transitionDelay: `${threshold}ms`,
          }}
        />
      ))}
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
  processing: 'bg-info/10 text-info border border-info/20',
  completed: 'bg-success/10 text-success border border-success/20',
  failed: 'bg-error/10 text-error border border-error/20',
}
