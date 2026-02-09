'use client'

/**
 * Agent Progress View
 *
 * Shows extraction + analysis progress during the "analyze" step.
 * Subscribes to the existing upload analysis progress and overlays
 * agent status messaging.
 *
 * @module components/views/upload-view/agent/agent-progress-view
 */

import { cn } from '@/lib/cn'
import {
  IconSpinner,
  IconCheckCircle,
  IconFileText,
  IconBrain,
} from '@/components/brand/icons'

// ============================================================================
// Types
// ============================================================================

interface AgentProgressViewProps {
  /** Number of documents in this batch */
  documentCount: number
  /** Whether the agent engine is currently analyzing */
  isAnalyzing: boolean
  /** Extraction progress from useUploadAnalysis */
  extractionProgress: { completed: number; total: number; failed: number } | null
}

// ============================================================================
// Component
// ============================================================================

export function AgentProgressView({
  documentCount,
  isAnalyzing,
  extractionProgress,
}: AgentProgressViewProps) {
  const extractionDone = extractionProgress
    ? extractionProgress.completed + extractionProgress.failed >= extractionProgress.total
    : false
  const extractionPercent = extractionProgress && extractionProgress.total > 0
    ? Math.round(((extractionProgress.completed + extractionProgress.failed) / extractionProgress.total) * 100)
    : 0

  return (
    <div className="space-y-3">
      {/* Step 1: Extraction */}
      <ProgressStep
        icon={IconFileText}
        label={extractionDone ? 'Extraction complete' : 'Extracting transactions...'}
        description={
          extractionProgress
            ? `${extractionProgress.completed} of ${extractionProgress.total} documents processed${extractionProgress.failed > 0 ? ` (${extractionProgress.failed} failed)` : ''}`
            : `Processing ${documentCount} document${documentCount !== 1 ? 's' : ''}...`
        }
        progress={extractionPercent}
        isComplete={extractionDone}
        isActive={!extractionDone}
      />

      {/* Step 2: Intelligence analysis */}
      <ProgressStep
        icon={IconBrain}
        label={
          isAnalyzing
            ? 'Analyzing your documents...'
            : extractionDone
              ? 'Analysis starting...'
              : 'Waiting for extraction'
        }
        description={
          isAnalyzing
            ? 'Checking for gaps, duplicates, and cross-referencing cash vs accrual data'
            : 'Will begin after extraction completes'
        }
        isComplete={false}
        isActive={isAnalyzing || extractionDone}
      />
    </div>
  )
}

// ============================================================================
// Progress Step
// ============================================================================

function ProgressStep({
  icon: Icon,
  label,
  description,
  progress,
  isComplete,
  isActive,
}: {
  icon: typeof IconFileText
  label: string
  description: string
  progress?: number
  isComplete: boolean
  isActive: boolean
}) {
  return (
    <div
      className={cn(
        'flex gap-2',
        !isActive && !isComplete && 'opacity-40',
      )}
    >
      <div className="shrink-0 mt-0.5">
        {isComplete ? (
          <IconCheckCircle size={14} className="text-success" />
        ) : isActive ? (
          <IconSpinner size={14} className="text-foreground" />
        ) : (
          <Icon size={14} className="text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>

        {/* Progress bar */}
        {typeof progress === 'number' && !isComplete && (
          <div
            className="h-1 bg-secondary overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
          >
            <div
              className="h-full bg-foreground transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
