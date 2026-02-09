'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, isToolUIPart } from 'ai'

interface UseReconcileAgentOptions {
  sessionId: string
  companyName?: string
  /** Agent-generated summary from pre-upload analysis */
  agentSummary?: string
}

/**
 * Core hook wrapping AI SDK useChat for the agentic reconciliation assistant.
 *
 * Key features:
 * - Multi-step tool calling via agentModel (Opus 4.5)
 * - Client-side `askForConfirmation` tool (no execute -> pauses for user input)
 * - `addToolOutput` to resume after confirmation
 * - `sendAutomaticallyWhen` auto-sends when user provides tool output
 */
export function useReconcileAgent({ sessionId, companyName, agentSummary }: UseReconcileAgentOptions) {
  const {
    messages,
    sendMessage,
    addToolOutput,
    setMessages,
    status,
    error,
    stop,
  } = useChat({
    id: `reconcile-agent-${sessionId}`,
    transport: new DefaultChatTransport({
      api: '/api/chat/assistant',
      body: { context: { sessionId, companyName, agentSummary } },
    }),
    // Auto-send when user provides tool output (confirms/denies via askForConfirmation)
    sendAutomaticallyWhen: ({ messages: msgs }) => {
      const lastMessage = msgs[msgs.length - 1]
      if (!lastMessage || lastMessage.role !== 'assistant') return false

      // Check if there's a confirmation tool part that has output
      return lastMessage.parts.some((part) => {
        if (!isToolUIPart(part)) return false
        return (
          'toolName' in part &&
          part.toolName === 'askForConfirmation' &&
          part.state === 'output-available'
        )
      })
    },
  })

  return {
    messages,
    sendMessage,
    addToolOutput,
    setMessages,
    status,
    error,
    stop,
    isLoading: status === 'streaming' || status === 'submitted',
  }
}
