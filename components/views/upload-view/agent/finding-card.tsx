'use client'

/**
 * Agent Finding Card
 *
 * Displays a single agent finding with severity styling,
 * collapsible details, and user response actions.
 *
 * Severity determines the left border color:
 * - Critical: red (text-error border-error)
 * - Warning: amber (text-warning border-warning)
 * - Info: blue (text-info border-info)
 *
 * @module components/views/upload-view/agent/finding-card
 */

import { useState, useMemo, useId } from 'react'
import { cn } from '@/lib/cn'
import {
  IconXCircle,
  IconWarningCircle,
  IconInfo,
  IconCaretDown,
  IconCheck,
  IconX,
} from '@/components/brand/icons'
import type { AgentFindingData, FindingSeverity } from '@/hooks/useAgentSession'
import type { Id } from '@/convex/_generated/dataModel'

// ============================================================================
// Types
// ============================================================================

interface FindingCardProps {
  finding: AgentFindingData
  onRespond: (
    findingId: AgentFindingData['_id'],
    status: 'acknowledged' | 'resolved' | 'dismissed',
    userResponse?: string,
  ) => Promise<void>
  onRetryExtraction?: (documentIds: Id<'documents'>[]) => void
  onRemoveDocuments?: (documentIds: Id<'documents'>[]) => void
}

// ============================================================================
// Severity Config
// ============================================================================

const SEVERITY_CONFIG: Record<
  FindingSeverity,
  {
    icon: typeof IconXCircle
    borderClass: string
    iconClass: string
    labelClass: string
    bgClass: string
    label: string
  }
> = {
  critical: {
    icon: IconXCircle,
    borderClass: 'border-l-error',
    iconClass: 'text-error',
    labelClass: 'text-error',
    bgClass: 'bg-error/5',
    label: 'Critical',
  },
  warning: {
    icon: IconWarningCircle,
    borderClass: 'border-l-warning',
    iconClass: 'text-warning',
    labelClass: 'text-warning',
    bgClass: 'bg-warning/5',
    label: 'Warning',
  },
  info: {
    icon: IconInfo,
    borderClass: 'border-l-info',
    iconClass: 'text-info',
    labelClass: 'text-info',
    bgClass: 'bg-info/5',
    label: 'Info',
  },
}

// ============================================================================
// Component
// ============================================================================

export function FindingCard({ finding, onRespond, onRetryExtraction, onRemoveDocuments }: FindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(finding.severity === 'critical')
  const [isResponding, setIsResponding] = useState(false)
  const [responseText, setResponseText] = useState('')

  const bodyId = useId()
  const config = SEVERITY_CONFIG[finding.severity]
  const SeverityIcon = config.icon
  const isResolved = finding.status === 'resolved' || finding.status === 'dismissed'
  const isAcknowledged = finding.status === 'acknowledged'

  const parsedDetails = useMemo(
    () => (finding.details ? tryParseDetails(finding.details) : null),
    [finding.details],
  )

  async function handleRespond(status: 'acknowledged' | 'resolved' | 'dismissed', overrideResponse?: string) {
    setIsResponding(true)
    try {
      await onRespond(finding._id, status, overrideResponse || responseText || undefined)
      setResponseText('')
    } catch {
      // Error handling is delegated to the onRespond caller (e.g. toast).
      // We just reset local state here.
    } finally {
      setIsResponding(false)
    }
  }

  return (
    <div
      className={cn(
        'border border-border border-l-2 transition-colors duration-150 agent-finding-enter',
        config.borderClass,
        isResolved && 'opacity-60',
        !isResolved && config.bgClass,
      )}
    >
      {/* Header — always visible */}
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2 text-left focus-ring"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={bodyId}
      >
        <SeverityIcon size={14} className={cn('shrink-0', config.iconClass)} />

        <span className="text-sm text-foreground flex-1 min-w-0 truncate">
          {finding.title}
        </span>

        {isResolved && (
          <span className="text-xs text-muted-foreground shrink-0">
            {finding.status === 'resolved' ? 'Resolved' : 'Dismissed'}
          </span>
        )}
        {isAcknowledged && (
          <span className="text-xs text-muted-foreground shrink-0">
            Noted
          </span>
        )}

        <IconCaretDown
          size={12}
          className={cn(
            'shrink-0 text-muted-foreground transition-transform duration-150',
            isExpanded && 'rotate-180',
          )}
        />
      </button>

      {/* Expandable content — uses CSS grid for smooth height animation */}
      <div id={bodyId} className="agent-finding-body" data-expanded={isExpanded}>
        <div>
          <div className="px-3 pb-3 space-y-2">
            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed pl-5">
              {finding.description}
            </p>

            {/* Structured details */}
            {parsedDetails && (
              <div className="pl-5 space-y-1">
                {/* Scalar key-value pairs */}
                {parsedDetails.scalars && Object.entries(parsedDetails.scalars).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-xs">
                    <span className="text-muted-foreground shrink-0">
                      {formatDetailKey(key)}:
                    </span>
                    <span className="text-foreground tabular-nums">
                      {String(value)}
                    </span>
                  </div>
                ))}

                {/* Mismatched documents list (accrual_company_mismatch) */}
                {parsedDetails.mismatched && parsedDetails.mismatched.length > 0 && (
                  <div className="space-y-1 mt-1.5">
                    {parsedDetails.mismatched.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-xs border-l border-border pl-2 ml-1 space-y-0.5"
                      >
                        {item.sourceFileName && (
                          <span className="text-foreground/80">{String(item.sourceFileName)}</span>
                        )}
                        {item.docNumber && (
                          <span className="text-muted-foreground ml-2">#{String(item.docNumber)}</span>
                        )}
                        {(item.issuerName || item.counterpartyName) && (
                          <div className="text-muted-foreground">
                            {item.issuerName && <span>From: {String(item.issuerName)}</span>}
                            {item.issuerName && item.counterpartyName && <span> / </span>}
                            {item.counterpartyName && <span>To: {String(item.counterpartyName)}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* User response display */}
            {finding.userResponse && (
              <div className="pl-5 text-xs text-muted-foreground italic border-l border-border ml-1 pl-2">
                You: {finding.userResponse}
              </div>
            )}

            {/* Action buttons — only for open/acknowledged findings */}
            {!isResolved && (
              <div className="pl-5 flex items-center gap-2 pt-1 flex-wrap">
                {finding.type === 'extraction_errors' || finding.type === 'low_confidence_extractions' ? (
                  /* Specialized actions for extraction issues */
                  <>
                    {onRetryExtraction && finding.relatedDocumentIds && finding.relatedDocumentIds.length > 0 && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs border border-border bg-background hover:bg-secondary transition-colors focus-ring disabled:opacity-50"
                        onClick={() => {
                          onRetryExtraction(finding.relatedDocumentIds!)
                          handleRespond('resolved', 'Retrying extraction')
                        }}
                        disabled={isResponding}
                      >
                        Retry Extraction
                      </button>
                    )}
                    {onRemoveDocuments && finding.relatedDocumentIds && finding.relatedDocumentIds.length > 0 && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring disabled:opacity-50"
                        onClick={() => {
                          onRemoveDocuments(finding.relatedDocumentIds!)
                          handleRespond('dismissed', 'Removed from session')
                        }}
                        disabled={isResponding}
                      >
                        <IconX size={10} />
                        Remove
                      </button>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring disabled:opacity-50"
                      onClick={() => handleRespond(finding.severity === 'critical' ? 'resolved' : 'acknowledged', 'Ignoring extraction issue')}
                      disabled={isResponding}
                    >
                      <IconCheck size={10} />
                      Skip
                    </button>
                  </>
                ) : finding.severity === 'critical' ? (
                  <>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs border border-border bg-background hover:bg-secondary transition-colors focus-ring disabled:opacity-50"
                      onClick={() => handleRespond('resolved')}
                      disabled={isResponding}
                    >
                      <IconCheck size={10} />
                      Resolve
                    </button>
                    <input
                      type="text"
                      className="flex-1 min-w-0 px-2 py-1 text-xs border border-border bg-background placeholder:text-muted-foreground focus-ring"
                      placeholder="Add a note (optional)..."
                      aria-label="Add a note for this finding"
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      maxLength={500}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRespond('resolved')
                      }}
                    />
                  </>
                ) : finding.type === 'accrual_company_mismatch' ? (
                  /* Specialized actions for accrual company mismatch */
                  <>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs border border-border bg-background hover:bg-secondary transition-colors focus-ring disabled:opacity-50"
                      onClick={() => handleRespond('acknowledged', 'Keeping documents as-is')}
                      disabled={isResponding}
                    >
                      <IconCheck size={10} />
                      Keep Anyway
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring disabled:opacity-50"
                      onClick={() => handleRespond('dismissed', 'User chose to ignore mismatch')}
                      disabled={isResponding}
                    >
                      <IconX size={10} />
                      Dismiss
                    </button>
                  </>
                ) : finding.severity === 'warning' ? (
                  <>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs border border-border bg-background hover:bg-secondary transition-colors focus-ring disabled:opacity-50"
                      onClick={() => handleRespond('acknowledged')}
                      disabled={isResponding}
                    >
                      <IconCheck size={10} />
                      Got it
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring disabled:opacity-50"
                      onClick={() => handleRespond('dismissed')}
                      disabled={isResponding}
                    >
                      <IconX size={10} />
                      Dismiss
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring disabled:opacity-50"
                    onClick={() => handleRespond('acknowledged')}
                    disabled={isResponding}
                  >
                    <IconCheck size={10} />
                    Noted
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

interface ParsedDetails {
  scalars: Record<string, string | number | boolean>
  mismatched?: Array<Record<string, string | number | boolean | undefined>>
}

function tryParseDetails(details: string): ParsedDetails | null {
  try {
    const parsed = JSON.parse(details)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const scalars: Record<string, string | number | boolean> = {}
      let mismatched: Array<Record<string, string | number | boolean | undefined>> | undefined

      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          scalars[key] = value
        } else if (key === 'mismatched' && Array.isArray(value)) {
          // Special handling for accrual_company_mismatch findings
          mismatched = value.slice(0, 5).map((item: Record<string, unknown>) => {
            const flat: Record<string, string | number | boolean | undefined> = {}
            for (const [k, v] of Object.entries(item)) {
              if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
                flat[k] = v
              }
            }
            return flat
          })
        }
      }

      if (Object.keys(scalars).length > 0 || mismatched) {
        return { scalars, mismatched }
      }
    }
  } catch {
    // Not valid JSON, skip
  }
  return null
}

function formatDetailKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim()
}
