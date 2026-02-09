'use client'

/**
 * Agent Flow — Main Orchestrator Component
 *
 * Renders the 4-step agent flow above the existing upload tabs.
 * Subscribes to agent session state and renders the appropriate
 * step content based on session status.
 *
 * Flow: Upload → Analyze → Validate → Proceed
 *
 * @module components/views/upload-view/agent/agent-flow
 */

import { useState } from 'react'
import { cn } from '@/lib/cn'
import { IconBrain, IconX, IconArrowRight } from '@/components/brand/icons'
import { useToast } from '@/components/ui/toast'
import { AgentStep } from './agent-step'
import { AgentUploadAck } from './agent-upload-ack'
import { AgentProgressView } from './agent-progress-view'
import { FindingsSummary } from './findings-summary'
import type { UseAgentSessionReturn } from '@/hooks/useAgentSession'
import type { UploadedFile } from '@/hooks/useFileUploadState'

// ============================================================================
// Types
// ============================================================================

interface AgentFlowProps {
  agent: UseAgentSessionReturn
  files: UploadedFile[]
  extractionProgress: { completed: number; total: number; failed: number } | null
  onProceed: (reconciliationSessionId: string) => void
}

// ============================================================================
// Step State Resolution
// ============================================================================

type StepState = 'completed' | 'active' | 'future'

const STEP_ORDER = ['upload', 'analyze', 'validate', 'proceed'] as const

function resolveStepState(
  step: (typeof STEP_ORDER)[number],
  currentStep: (typeof STEP_ORDER)[number],
): StepState {
  const currentIdx = STEP_ORDER.indexOf(currentStep)
  const stepIdx = STEP_ORDER.indexOf(step)
  if (stepIdx < currentIdx) return 'completed'
  if (stepIdx === currentIdx) return 'active'
  return 'future'
}

// ============================================================================
// Component
// ============================================================================

export function AgentFlow({ agent, files, extractionProgress, onProceed }: AgentFlowProps) {
  const toast = useToast()
  const [isProceeding, setIsProceeding] = useState(false)

  // Don't render if no active agent session
  if (!agent.session) return null

  const currentStep = agent.session.currentStep
  const documentCount = agent.session.documentIds.length

  // Build step summaries for collapsed state
  const uploadSummary = `${documentCount} file${documentCount !== 1 ? 's' : ''} uploaded`
  const analyzeSummary = agent.isReady
    ? `${agent.findings.length} finding${agent.findings.length !== 1 ? 's' : ''}`
    : 'Analyzing...'

  async function handleProceed() {
    if (agent.hasUnresolvedCritical) {
      toast.addToast({
        type: 'error',
        title: 'Resolve critical findings first',
        description: 'There are critical issues that need to be addressed before proceeding.',
      })
      return
    }

    setIsProceeding(true)
    try {
      const reconciliationSessionId = await agent.proceed()
      onProceed(reconciliationSessionId)
    } catch (err) {
      toast.addToast({
        type: 'error',
        title: 'Could not proceed',
        description: err instanceof Error ? err.message : 'An error occurred',
      })
    } finally {
      setIsProceeding(false)
    }
  }

  return (
    <div className="space-y-1 mb-4 agent-flow-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-2">
          <IconBrain size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Upload Assistant
          </span>
        </div>
        {!agent.hasProceeded && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring p-0.5"
            onClick={() => {
              agent.dismiss().catch(() => {
                toast.addToast({
                  type: 'error',
                  title: 'Could not dismiss',
                  description: 'The assistant could not be dismissed. Try again.',
                })
              })
            }}
            aria-label="Dismiss assistant"
          >
            <IconX size={10} />
          </button>
        )}
      </div>

      {/* Step 1: Upload */}
      <AgentStep
        step="upload"
        label="Upload"
        summary={uploadSummary}
        state={resolveStepState('upload', currentStep)}
      >
        <AgentUploadAck files={files} />
      </AgentStep>

      {/* Step 2: Analyze */}
      <AgentStep
        step="analyze"
        label="Analyze"
        summary={analyzeSummary}
        state={resolveStepState('analyze', currentStep)}
      >
        <AgentProgressView
          documentCount={documentCount}
          isAnalyzing={agent.isAnalyzing}
          extractionProgress={extractionProgress}
        />
      </AgentStep>

      {/* Step 3: Validate */}
      <AgentStep
        step="validate"
        label="Review Findings"
        summary={
          agent.findingCounts.total === 0
            ? 'All clear'
            : `${agent.findingCounts.total} finding${agent.findingCounts.total !== 1 ? 's' : ''} reviewed`
        }
        state={resolveStepState('validate', currentStep)}
      >
        <FindingsSummary
          findings={agent.findings}
          summary={agent.session.summary}
          onRespond={agent.respondToFinding}
        />
      </AgentStep>

      {/* Step 4: Proceed */}
      <AgentStep
        step="proceed"
        label="Proceed to Reconciliation"
        state={resolveStepState('proceed', currentStep)}
      >
        <div className="space-y-3">
          {agent.session.summary && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {agent.session.summary}
            </p>
          )}

          {agent.hasUnresolvedCritical && (
            <p className="text-xs text-error">
              Resolve all critical findings before proceeding.
            </p>
          )}

          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 text-sm',
              'border border-foreground bg-foreground text-background',
              'hover:bg-foreground/90 transition-colors focus-ring',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            onClick={handleProceed}
            disabled={isProceeding || agent.hasUnresolvedCritical}
          >
            {isProceeding ? (
              <>
                <div className="w-3 h-3 border border-background/20 border-t-background animate-spin" />
                Creating session...
              </>
            ) : (
              <>
                <IconArrowRight size={14} />
                Proceed to Reconciliation
              </>
            )}
          </button>
        </div>
      </AgentStep>
    </div>
  )
}
