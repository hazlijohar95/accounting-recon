'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { IconCheck, IconX } from '@/components/brand/icons'

interface AssistantActionButtonsProps {
  matchId: string
  recommendation: 'MATCH' | 'REVIEW'
  onApprove?: (matchId: string) => void
  onReject?: (matchId: string) => void
  className?: string
}

/**
 * Inline action buttons for LLM tool results in the assistant chat.
 * Allows users to approve or reject AI-suggested matches directly from the chat.
 */
export function AssistantActionButtons({
  matchId,
  recommendation,
  onApprove,
  onReject,
  className,
}: AssistantActionButtonsProps) {
  const [actionTaken, setActionTaken] = React.useState<'approved' | 'rejected' | null>(null)

  const handleApprove = () => {
    setActionTaken('approved')
    onApprove?.(matchId)
  }

  const handleReject = () => {
    setActionTaken('rejected')
    onReject?.(matchId)
  }

  // Show confirmation state after action
  if (actionTaken) {
    return (
      <div className={cn(
        'flex items-center gap-2 pt-2 mt-2 border-t border-border/50',
        className
      )}>
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-1 text-xs font-medium',
          actionTaken === 'approved' && 'text-success',
          actionTaken === 'rejected' && 'text-error'
        )}>
          {actionTaken === 'approved' ? (
            <>
              <IconCheck size={12} />
              <span>Match approved</span>
            </>
          ) : (
            <>
              <IconX size={12} />
              <span>Match rejected</span>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-center gap-2 pt-2 mt-2 border-t border-border/50',
      className
    )}>
      <button
        onClick={handleApprove}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1',
          'text-xs font-medium',
          'bg-success text-success-foreground',
          'hover:opacity-90',
          'transition-all duration-150'
        )}
      >
        <IconCheck size={12} />
        Approve
      </button>

      <button
        onClick={handleReject}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1',
          'text-xs font-medium',
          'bg-error text-error-foreground',
          'hover:opacity-90',
          'transition-all duration-150'
        )}
      >
        <IconX size={12} />
        Reject
      </button>

      {recommendation === 'MATCH' && (
        <span className="text-[10px] text-muted-foreground ml-auto">
          AI recommends approval
        </span>
      )}
    </div>
  )
}

/**
 * Action button for creating a manual match from the assistant.
 */
interface CreateMatchButtonProps {
  cashId: string
  accrualId: string
  confidence: 'high' | 'medium' | 'low'
  onCreateMatch?: (cashId: string, accrualId: string, confidence: string) => void
  className?: string
}

export function CreateMatchButton({
  cashId,
  accrualId,
  confidence,
  onCreateMatch,
  className,
}: CreateMatchButtonProps) {
  const [isCreated, setIsCreated] = React.useState(false)

  const handleCreate = () => {
    setIsCreated(true)
    onCreateMatch?.(cashId, accrualId, confidence)
  }

  if (isCreated) {
    return (
      <div className={cn('flex items-center gap-1.5 text-success text-xs', className)}>
        <IconCheck size={12} />
        <span>Manual match created</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleCreate}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1',
        'text-xs font-medium',
        'bg-foreground text-background',
        'hover:opacity-90',
        'transition-all duration-150',
        className
      )}
    >
      <IconCheck size={12} />
      Create Manual Match
    </button>
  )
}
