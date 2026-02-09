'use client'

import * as React from 'react'
import { UIMessage } from '@ai-sdk/react'
import { AgentMessage } from './agent-message'
import { TypingIndicator } from '../chat-message'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AddToolOutputFn = (...args: any[]) => any

interface AgentMessageListProps {
  messages: UIMessage[]
  isLoading: boolean
  addToolOutput: AddToolOutputFn
}

export function AgentMessageList({ messages, isLoading, addToolOutput }: AgentMessageListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages])

  return (
    <div ref={scrollRef} className="assistant-messages" role="log" aria-label="Agent messages" aria-live="polite">
      {messages.map((message) => (
        <AgentMessage
          key={message.id}
          message={message}
          addToolOutput={addToolOutput}
        />
      ))}

      {isLoading && <TypingIndicator />}
    </div>
  )
}
