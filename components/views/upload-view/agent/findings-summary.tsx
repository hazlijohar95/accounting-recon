'use client'

/**
 * Agent Findings Summary
 *
 * Groups findings by severity and shows a collapsible summary.
 * Used in the "validate" step to present all agent intelligence.
 *
 * @module components/views/upload-view/agent/findings-summary
 */

import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import { FindingCard } from './finding-card'
import type { AgentFindingData, FindingSeverity } from '@/hooks/useAgentSession'
import type { Id } from '@/convex/_generated/dataModel'

// ============================================================================
// Types
// ============================================================================

interface FindingsSummaryProps {
  findings: AgentFindingData[]
  summary?: string
  onRespond: (
    findingId: AgentFindingData['_id'],
    status: 'acknowledged' | 'resolved' | 'dismissed',
    userResponse?: string,
  ) => Promise<void>
  onRetryExtraction?: (documentIds: Id<'documents'>[]) => void
  onRemoveDocuments?: (documentIds: Id<'documents'>[]) => void
}

// ============================================================================
// Component
// ============================================================================

export function FindingsSummary({ findings, summary, onRespond, onRetryExtraction, onRemoveDocuments }: FindingsSummaryProps) {
  const { criticalFindings, warningFindings, infoFindings, openCount } = useMemo(() => {
    const critical: AgentFindingData[] = []
    const warning: AgentFindingData[] = []
    const info: AgentFindingData[] = []
    let open = 0

    for (const f of findings) {
      if (f.severity === 'critical') critical.push(f)
      else if (f.severity === 'warning') warning.push(f)
      else info.push(f)

      if (f.status === 'open' || f.status === 'acknowledged') open++
    }

    return {
      criticalFindings: critical,
      warningFindings: warning,
      infoFindings: info,
      openCount: open,
    }
  }, [findings])

  return (
    <div className="space-y-3">
      {/* Agent summary */}
      {summary && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {summary}
        </p>
      )}

      {/* Findings count bar */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{findings.length} finding{findings.length !== 1 ? 's' : ''}</span>
        {openCount > 0 && openCount < findings.length && (
          <span className="text-foreground/60">
            {openCount} to review
          </span>
        )}
        {openCount === 0 && findings.length > 0 && (
          <span className="text-success">All reviewed</span>
        )}
      </div>

      {/* Critical findings */}
      {criticalFindings.length > 0 && (
        <FindingGroup
          label="Must Address"
          severity="critical"
          findings={criticalFindings}
          onRespond={onRespond}
          onRetryExtraction={onRetryExtraction}
          onRemoveDocuments={onRemoveDocuments}
        />
      )}

      {/* Warning findings */}
      {warningFindings.length > 0 && (
        <FindingGroup
          label="Good to Know"
          severity="warning"
          findings={warningFindings}
          onRespond={onRespond}
          onRetryExtraction={onRetryExtraction}
          onRemoveDocuments={onRemoveDocuments}
        />
      )}

      {/* Info findings */}
      {infoFindings.length > 0 && (
        <FindingGroup
          label="For Your Information"
          severity="info"
          findings={infoFindings}
          onRespond={onRespond}
          onRetryExtraction={onRetryExtraction}
          onRemoveDocuments={onRemoveDocuments}
        />
      )}

      {/* Empty state */}
      {findings.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">
          No findings to report. Your documents look good.
        </p>
      )}
    </div>
  )
}

// ============================================================================
// Finding Group
// ============================================================================

const SEVERITY_COLORS: Record<FindingSeverity, string> = {
  critical: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
}

function FindingGroup({
  label,
  severity,
  findings,
  onRespond,
  onRetryExtraction,
  onRemoveDocuments,
}: {
  label: string
  severity: FindingSeverity
  findings: AgentFindingData[]
  onRespond: FindingsSummaryProps['onRespond']
  onRetryExtraction?: FindingsSummaryProps['onRetryExtraction']
  onRemoveDocuments?: FindingsSummaryProps['onRemoveDocuments']
}) {
  return (
    <div className="space-y-1.5">
      <h4 className={cn('text-xs font-medium', SEVERITY_COLORS[severity])}>
        {label} ({findings.length})
      </h4>
      <div className="space-y-1">
        {findings.map((finding) => (
          <FindingCard
            key={finding._id}
            finding={finding}
            onRespond={onRespond}
            onRetryExtraction={onRetryExtraction}
            onRemoveDocuments={onRemoveDocuments}
          />
        ))}
      </div>
    </div>
  )
}
