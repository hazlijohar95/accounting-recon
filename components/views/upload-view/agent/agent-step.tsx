'use client'

/**
 * Agent Step
 *
 * Collapsible accordion step in the 4-step agent flow.
 * Completed steps collapse to a single summary line.
 * Active step is always expanded. Future steps are greyed out.
 *
 * Uses CSS grid-template-rows for smooth height animation.
 *
 * @module components/views/upload-view/agent/agent-step
 */

import { useState, useId } from 'react'
import { cn } from '@/lib/cn'
import {
  IconCheckCircle,
  IconSpinner,
  IconCaretRight,
} from '@/components/brand/icons'
import type { AgentStep as AgentStepType } from '@/hooks/useAgentSession'

// ============================================================================
// Types
// ============================================================================

type StepState = 'completed' | 'active' | 'future'

interface AgentStepProps {
  step: AgentStepType
  label: string
  summary?: string
  state: StepState
  children: React.ReactNode
}

// ============================================================================
// Step Numbers
// ============================================================================

const STEP_NUMBERS: Record<AgentStepType, number> = {
  upload: 1,
  analyze: 2,
  validate: 3,
  proceed: 4,
}

// ============================================================================
// Component
// ============================================================================

export function AgentStep({ step, label, summary, state, children }: AgentStepProps) {
  const stepNumber = STEP_NUMBERS[step]
  const [isOpen, setIsOpen] = useState(false)
  const contentId = useId()

  if (state === 'completed') {
    return (
      <div className="group border border-border bg-background agent-step-wrapper" data-testid={`agent-step-${step}`} data-step-state="completed">
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 cursor-pointer focus-ring text-left"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={contentId}
        >
          <IconCheckCircle size={14} className="shrink-0 text-success" />
          <span className="text-sm text-muted-foreground flex-1 min-w-0 truncate">
            {summary || label}
          </span>
          <IconCaretRight
            size={12}
            className={cn(
              'shrink-0 text-muted-foreground transition-transform duration-150',
              isOpen && 'rotate-90',
            )}
          />
        </button>
        <div id={contentId} className="agent-step-content" data-expanded={isOpen}>
          <div>
            <div className="px-3 pb-3 border-t border-border">
              {children}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'future') {
    return (
      <div className="border border-border bg-background opacity-40 agent-step-wrapper" data-testid={`agent-step-${step}`} data-step-state="future">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="shrink-0 w-3.5 h-3.5 border border-border flex items-center justify-center text-[8px] text-muted-foreground tabular-nums">
            {stepNumber}
          </span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      </div>
    )
  }

  // Active state — always expanded
  return (
    <div className="border border-foreground/20 bg-background agent-step-wrapper" data-testid={`agent-step-${step}`} data-step-state="active">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <IconSpinner size={14} className="shrink-0 text-foreground" />
        <span className="text-sm text-foreground font-medium">{label}</span>
      </div>
      <div className="agent-step-content" data-expanded="true">
        <div>
          <div className="px-3 py-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
