'use client'

import * as React from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { UIMessage } from '@ai-sdk/react'
import { isToolUIPart, getToolName } from 'ai'
import { useWorkosUserId } from '@/lib/convex-hooks/shared'

interface UseChatPersistenceOptions {
  sessionId: string
  messages: UIMessage[]
  setMessages: (messages: UIMessage[]) => void
}

/**
 * Handles chat persistence to Convex with 24h retention.
 *
 * - On mount: loads messages from Convex and hydrates chat
 * - On new messages: saves to Convex
 * - Handles serialization/deserialization of UIMessage
 */
export function useChatPersistence({
  sessionId,
  messages,
  setMessages,
}: UseChatPersistenceOptions) {
  const [isHydrated, setIsHydrated] = React.useState(false)
  const lastSavedCountRef = React.useRef(0)
  const workosUserId = useWorkosUserId()

  // Query persisted messages
  const persistedMessages = useQuery(
    api.reconciliationChat.getMessages,
    sessionId
      ? {
          sessionId: sessionId as Id<'reconciliationSessions'>,
          limit: 50,
          workosUserId,
        }
      : 'skip'
  )

  // Mutation to add messages
  const addMessage = useMutation(api.reconciliationChat.addMessage)
  const clearHistory = useMutation(api.reconciliationChat.clearHistory)

  // Hydrate messages from Convex on initial load
  React.useEffect(() => {
    if (isHydrated || !persistedMessages || persistedMessages.length === 0) return

    try {
      const hydrated: UIMessage[] = persistedMessages.map((msg: { _id: string; role: string; content: string }) => {
        try {
          return JSON.parse(msg.content) as UIMessage
        } catch {
          // Fallback: treat as plain text
          return {
            id: msg._id,
            role: msg.role,
            parts: [{ type: 'text' as const, text: msg.content }],
          } as UIMessage
        }
      })

      if (hydrated.length > 0) {
        setMessages(hydrated)
        lastSavedCountRef.current = hydrated.length
      }
    } catch (error) {
      console.error('[ChatPersistence] Failed to hydrate messages:', error)
    }

    setIsHydrated(true)
  }, [persistedMessages, isHydrated, setMessages])

  // Mark hydrated even if no persisted messages
  React.useEffect(() => {
    if (!isHydrated && persistedMessages !== undefined) {
      setIsHydrated(true)
    }
  }, [persistedMessages, isHydrated])

  // Save new messages to Convex
  React.useEffect(() => {
    if (!isHydrated || !sessionId || !workosUserId) return

    // Only save messages that haven't been saved yet
    const newMessages = messages.slice(lastSavedCountRef.current)
    if (newMessages.length === 0) return

    // Only save complete messages (not currently streaming)
    for (const msg of newMessages) {
      // Skip messages that are still being streamed (tool call pending)
      const hasStreamingPart = msg.parts.some((part) => {
        if (!isToolUIPart(part)) return false
        return part.state === 'input-streaming' || part.state === 'input-available'
      })
      if (hasStreamingPart) break // Stop at first streaming message to preserve order

      let serialized: string
      try {
        serialized = JSON.stringify(msg)
      } catch (err) {
        console.error('[ChatPersistence] Failed to serialize message:', err)
        // Skip this message but don't increment counter — will retry next render
        break
      }

      // Extract tool call metadata
      const toolCalls = msg.parts
        .filter((part) => isToolUIPart(part))
        .map((part) => ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          toolName: getToolName(part as any),
          toolCallId: (part as { toolCallId: string }).toolCallId,
        }))

      // Capture the current index before the async operation
      const currentIndex = lastSavedCountRef.current

      addMessage({
        sessionId: sessionId as Id<'reconciliationSessions'>,
        role: msg.role as 'user' | 'assistant',
        content: serialized,
        metadata: toolCalls.length > 0 ? { toolCalls } : undefined,
        workosUserId,
      }).then(() => {
        // Only advance the counter on success, and only if we haven't gone past this point
        if (lastSavedCountRef.current === currentIndex) {
          lastSavedCountRef.current = currentIndex + 1
        }
      }).catch((err) => {
        console.error('[ChatPersistence] Failed to save message:', err instanceof Error ? err.message : err)
      })

      // Optimistically advance to avoid duplicate saves in the same render cycle
      lastSavedCountRef.current++
    }
  }, [messages, isHydrated, sessionId, addMessage, workosUserId])

  const handleClearHistory = React.useCallback(async () => {
    if (!sessionId || !workosUserId) return
    try {
      await clearHistory({
        sessionId: sessionId as Id<'reconciliationSessions'>,
        workosUserId,
      })
      lastSavedCountRef.current = 0
    } catch (error) {
      console.error('[ChatPersistence] Failed to clear history:', error)
    }
  }, [sessionId, clearHistory, workosUserId])

  return {
    isHydrated,
    clearHistory: handleClearHistory,
  }
}
