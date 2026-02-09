'use client'

/**
 * Agent Findings Banner (Read-Only)
 *
 * Displayed on the /reconcile page when the linked agent session has
 * unresolved findings from the upload analysis. Shows a collapsible
 * summary strip with severity-grouped findings underneath.
 *
 * This is a read-only view — no respond/retry/remove actions.
 * Users must go back to /upload to interact with findings.
 *
 * Design follows the existing banner patterns in reconcile-view:
 * - Full-width strip: px-4 py-3, bg-{color}/10, border-b border-{color}/20
 * - Collapsible content using Radix Collapsible
 * - Severity colors: error (critical), warning, info
 *
 * @module components/views/reconcile-view/agent-findings-banner
 */

import { useState, useMemo } from 'react'
import { cn } from '@/lib/cn'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  IconXCircle,
  IconWarningCircle,
  IconInfo,
  IconCaretDown,
  IconX,
} from '@/components/brand/icons'
import type { AgentFindingData, FindingSeverity } from '@/hooks/useAgentSession'

// ============================================================================
// Types
// ============================================================================

export interface AgentFindingsBannerProps {
  /** Unresolved findings from the agent session */
  findings: AgentFindingData[]
  /** Agent-generated summary text */
  summary?: string
  /** Count of findings by severity */
  findingCounts: {
    critical: number
    warning: number
    info: number
    total: number
  }
  /** Highest severity level among findings */
  highestSeverity: FindingSeverity | null
  /** Called when user dismisses the banner */
  onDismiss: () => void
}

// ============================================================================
// Severity Configuration
// ============================================================================

const SEVERITY_CONFIG = {
  critical: {
    icon: IconXCircle,
    borderColor: 'border-error/20',
    bgColor: 'bg-error/10',
    iconColor: 'text-error',
    textColor: 'text-error',
    /** Left border accent color for finding cards */
    leftBorderColor: 'border-l-error',
    label: 'Critical',
  },
  warning: {
    icon: IconWarningCircle,
    borderColor: 'border-warning/20',
    bgColor: 'bg-warning/10',
    iconColor: 'text-warning',
    textColor: 'text-warning',
    leftBorderColor: 'border-l-warning',
    label: 'Warning',
  },
  info: {
    icon: IconInfo,
    borderColor: 'border-info/20',
    bgColor: 'bg-info/10',
    iconColor: 'text-info',
    textColor: 'text-info',
    leftBorderColor: 'border-l-info',
    label: 'Info',
  },
} as const

// ============================================================================
// Component
// ============================================================================

export function AgentFindingsBanner({
  findings,
  summary,
  findingCounts,
  highestSeverity,
  onDismiss,
}: AgentFindingsBannerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Group findings by severity for the expanded view
  const grouped = useMemo(() => {
    const critical: AgentFindingData[] = []
    const warning: AgentFindingData[] = []
    const info: AgentFindingData[] = []

    for (const f of findings) {
      if (f.severity === 'critical') critical.push(f)
      else if (f.severity === 'warning') warning.push(f)
      else info.push(f)
    }

    return { critical, warning, info }
  }, [findings])

  // Don't render if no findings
  if (!highestSeverity || findingCounts.total === 0) return null

  const config = SEVERITY_CONFIG[highestSeverity]
  const Icon = config.icon

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn('border-b', config.borderColor, config.bgColor)} data-testid="agent-findings-banner">
        {/* Collapsed strip — always visible */}
        <div className="px-4 py-3 flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-3 flex-1 text-left group">
              <Icon size={16} className={config.iconColor} />
              <span className={cn('text-sm font-medium', config.textColor)}>
                Upload Agent
              </span>
              <span className="text-xs text-muted-foreground">
                {buildCountSummary(findingCounts)}
              </span>
              <IconCaretDown
                size={14}
                className={cn(
                  'text-muted-foreground transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
                  isOpen && 'rotate-180',
                )}
              />
            </button>
          </CollapsibleTrigger>
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Dismiss agent findings"
          >
            <IconX size={14} />
          </button>
        </div>

        {/* Expanded content — findings grouped by severity */}
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {/* Summary */}
            {summary && (
              <p className="text-xs text-muted-foreground leading-relaxed pl-7">
                {summary}
              </p>
            )}

            {/* Critical findings */}
            {grouped.critical.length > 0 && (
              <FindingGroup
                severity="critical"
                findings={grouped.critical}
              />
            )}

            {/* Warning findings */}
            {grouped.warning.length > 0 && (
              <FindingGroup
                severity="warning"
                findings={grouped.warning}
              />
            )}

            {/* Info findings */}
            {grouped.info.length > 0 && (
              <FindingGroup
                severity="info"
                findings={grouped.info}
              />
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Group of findings for a single severity level.
 */
function FindingGroup({
  severity,
  findings,
}: {
  severity: FindingSeverity
  findings: AgentFindingData[]
}) {
  const config = SEVERITY_CONFIG[severity]

  return (
    <div className="space-y-1 pl-7">
      <p className={cn('text-xs font-medium', config.textColor)}>
        {config.label} ({findings.length})
      </p>
      {findings.map((finding) => (
        <ReadOnlyFindingCard key={finding._id} finding={finding} />
      ))}
    </div>
  )
}

/**
 * Lightweight read-only finding card for the reconcile page.
 * No action buttons, no response input — just title + description.
 */
function ReadOnlyFindingCard({ finding }: { finding: AgentFindingData }) {
  const config = SEVERITY_CONFIG[finding.severity]
  const Icon = config.icon

  // Parse structured details if present
  const details = useMemo(() => {
    if (!finding.details) return null
    try {
      return JSON.parse(finding.details) as Record<string, unknown>
    } catch {
      return null
    }
  }, [finding.details])

  // Extract scalar details for display (skip arrays/objects)
  const scalarDetails = useMemo(() => {
    if (!details) return []
    return Object.entries(details)
      .filter(([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
      .slice(0, 4) // Cap at 4 detail items to keep it compact
      .map(([key, value]) => ({
        key: formatDetailKey(key),
        value: String(value),
      }))
  }, [details])

  return (
    <div
      className={cn(
        'border border-border border-l-2 rounded-sm px-3 py-2',
        config.leftBorderColor,
        'bg-background/50',
      )}
    >
      <div className="flex items-start gap-2">
        <Icon size={12} className={cn('mt-0.5 shrink-0', config.iconColor)} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground leading-tight">
            {finding.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {finding.description}
          </p>
          {scalarDetails.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
              {scalarDetails.map(({ key, value }) => (
                <span key={key} className="text-[10px] text-muted-foreground">
                  <span className="font-medium">{key}:</span> {value}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build a human-readable count summary like "2 critical, 1 warning".
 */
function buildCountSummary(counts: {
  critical: number
  warning: number
  info: number
  total: number
}): string {
  const parts: string[] = []

  if (counts.critical > 0) {
    parts.push(`${counts.critical} critical`)
  }
  if (counts.warning > 0) {
    parts.push(`${counts.warning} warning${counts.warning !== 1 ? 's' : ''}`)
  }
  if (counts.info > 0) {
    parts.push(`${counts.info} info`)
  }

  if (parts.length === 0) return 'No findings'

  return `${counts.total} finding${counts.total !== 1 ? 's' : ''}: ${parts.join(', ')}`
}

/**
 * Convert camelCase or snake_case key to Title Case label.
 */
function formatDetailKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
