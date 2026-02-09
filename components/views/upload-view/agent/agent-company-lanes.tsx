'use client'

/**
 * Agent Company Lanes
 *
 * Displays detected multi-company lanes when the agent engine
 * determines that uploaded documents belong to different companies.
 *
 * Each lane shows:
 * - Company name (detected from documents)
 * - Document count
 * - Selection checkbox (primary company auto-selected)
 * - Visual indicator if it matches the selected company
 *
 * @module components/views/upload-view/agent/agent-company-lanes
 */

import { cn } from '@/lib/cn'
import {
  IconCheck,
  IconBuilding,
  IconFile,
} from '@/components/brand/icons'
import type { Id } from '@/convex/_generated/dataModel'

// ============================================================================
// Types
// ============================================================================

export interface CompanyLane {
  detectedCompanyName: string
  companyId?: Id<'companies'>
  documentIds: Id<'documents'>[]
  isSelected: boolean
}

interface AgentCompanyLanesProps {
  lanes: CompanyLane[]
  onToggleLane: (laneIndex: number, isSelected: boolean) => Promise<void>
  onSetAllLanes: (mode: 'all' | 'primary_only') => Promise<void>
}

// ============================================================================
// Component
// ============================================================================

export function AgentCompanyLanes({ lanes, onToggleLane, onSetAllLanes }: AgentCompanyLanesProps) {
  if (lanes.length < 2) return null

  const selectedCount = lanes.filter((l) => l.isSelected).length

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-relaxed">
        I found documents that seem to belong to different companies.
        Select which ones you'd like to process:
      </p>

      <div className="space-y-2">
        {lanes.map((lane, idx) => (
          <LaneCard
            key={`${lane.detectedCompanyName}-${idx}`}
            lane={lane}
            index={idx}
            onToggle={onToggleLane}
          />
        ))}
      </div>

      {selectedCount === 0 && (
        <p className="text-xs text-warning">
          Select at least one company to proceed.
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring"
          onClick={() => onSetAllLanes('all')}
        >
          Select All
        </button>
        <span className="text-xs text-border">|</span>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring"
          onClick={() => onSetAllLanes('primary_only')}
        >
          Selected Company Only
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Lane Card
// ============================================================================

function LaneCard({
  lane,
  index,
  onToggle,
}: {
  lane: CompanyLane
  index: number
  onToggle: (laneIndex: number, isSelected: boolean) => Promise<void>
}) {
  const isPrimary = !!lane.companyId
  const docCount = lane.documentIds.length

  return (
    <button
      type="button"
      className={cn(
        'w-full text-left border px-3 py-2.5 transition-all duration-150 focus-ring',
        lane.isSelected
          ? 'border-foreground/30 bg-secondary/30'
          : 'border-border bg-background hover:border-muted-foreground/50',
      )}
      onClick={() => onToggle(index, !lane.isSelected)}
      aria-pressed={lane.isSelected}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox indicator */}
        <div
          className={cn(
            'w-4 h-4 border flex items-center justify-center shrink-0 transition-colors',
            lane.isSelected
              ? 'border-foreground bg-foreground'
              : 'border-border',
          )}
        >
          {lane.isSelected && (
            <IconCheck size={10} className="text-background" />
          )}
        </div>

        {/* Company info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <IconBuilding size={12} className="text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">
              {lane.detectedCompanyName}
            </span>
            {isPrimary && (
              <span className="text-[10px] px-1.5 py-0.5 bg-foreground/10 text-foreground/70 shrink-0">
                Selected Company
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5 pl-5">
            <IconFile size={10} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {docCount} document{docCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
