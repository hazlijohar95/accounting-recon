'use client'

import * as React from 'react'
import { UIMessage } from '@ai-sdk/react'
import { isToolUIPart, getToolName } from 'ai'
import { ChatMessage } from '../chat-message'
import { ConfirmationCard } from './tool-parts/confirmation-card'
import { TransactionTable } from './tool-parts/transaction-table'
import { SessionStats } from './tool-parts/session-stats'
import { MutationResult } from './tool-parts/mutation-result'
import { MatchExplanation } from './tool-parts/match-explanation'
import { MatchCandidates } from './tool-parts/match-candidates'
import { AnalysisResults } from './tool-parts/analysis-results'
import { ExpenseInsights } from './tool-parts/expense-insights'
import { SuspenseList } from './tool-parts/suspense-list'
import { MatchDetails } from './tool-parts/match-details'

// Narrow type for addToolOutput calls within our tool-part components
type AddToolOutputFn = (params: { tool: string; toolCallId: string; output: unknown }) => void

interface AgentMessageProps {
  message: UIMessage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addToolOutput: (...args: any[]) => any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ToolPartRenderer({ part, addToolOutput }: { part: any; addToolOutput: AddToolOutputFn }) {
  const toolName = getToolName(part)

  switch (toolName) {
    case 'askForConfirmation':
      return <ConfirmationCard part={part} addToolOutput={addToolOutput} />
    case 'listTransactions':
      return <TransactionTable part={part} />
    case 'getSessionStats':
      return <SessionStats part={part} />
    case 'approveMatch':
    case 'rejectMatch':
    case 'createManualMatch':
    case 'bulkApproveMatches':
      return <MutationResult part={part} toolName={toolName} />
    case 'getMatchExplanation':
      return <MatchExplanation part={part} />
    case 'findMatchForSuspense':
      return <MatchCandidates part={part} />
    case 'runMatchingAnalysis':
      return <AnalysisResults part={part} />
    case 'getExpenseInsights':
      return <ExpenseInsights part={part} />
    case 'listSuspenseItems':
      return <SuspenseList part={part} />
    case 'getMatchDetails':
      return <MatchDetails part={part} />
    default:
      if (part.state === 'output-error') {
        return (
          <div className="rounded-lg border border-red-200 dark:border-red-800 p-3 my-2 text-xs text-red-600 dark:text-red-400">
            Tool call failed: {toolName || 'unknown'}
          </div>
        )
      }
      if (part.state === 'input-streaming' || part.state === 'input-available') {
        return (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 my-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              Calling {toolName || 'tool'}...
            </div>
          </div>
        )
      }
      return null
  }
}

export function AgentMessage({ message, addToolOutput }: AgentMessageProps) {
  return (
    <div className="assistant-message-wrapper">
      {message.parts.map((part, index) => {
        if (part.type === 'text' && part.text) {
          return (
            <ChatMessage
              key={`text-${index}`}
              role={message.role as 'user' | 'assistant'}
              content={part.text}
            />
          )
        }

        if (isToolUIPart(part)) {
          return (
            <ToolPartRenderer
              key={`tool-${(part as { toolCallId: string }).toolCallId}`}
              part={part}
              addToolOutput={addToolOutput}
            />
          )
        }

        return null
      })}
    </div>
  )
}
