'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  IconSend,
  IconBrain,
  IconQuestion,
  IconSearch,
} from '@/components/brand/icons'

interface AgentInputBarProps {
  onSendMessage: (text: string) => void
  isLoading: boolean
  isExpanded: boolean
  showQuickActions: boolean
}

export function AgentInputBar({
  onSendMessage,
  isLoading,
  isExpanded,
  showQuickActions,
}: AgentInputBarProps) {
  const [input, setInput] = React.useState('')
  const [isFocused, setIsFocused] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Focus input when expanded
  React.useEffect(() => {
    if (isExpanded && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(timer)
    }
  }, [isExpanded])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    onSendMessage(input.trim())
    setInput('')
  }

  const handleQuickAction = (prompt: string) => {
    if (isLoading) return
    onSendMessage(prompt)
  }

  return (
    <div>
      {/* Quick action chips */}
      {showQuickActions && isExpanded && (
        <div className="assistant-quick-actions">
          <button
            onClick={() => handleQuickAction('Analyze pending transactions and suggest matches')}
            disabled={isLoading}
            className="assistant-action-primary"
          >
            <IconBrain size={14} />
            <span>Run AI Analysis</span>
          </button>
          <button
            onClick={() => handleQuickAction("What's the current reconciliation status?")}
            disabled={isLoading}
            className="assistant-action-secondary"
          >
            <IconQuestion size={14} />
            <span>Show summary</span>
          </button>
          <button
            onClick={() => handleQuickAction('List all suspense items')}
            disabled={isLoading}
            className="assistant-action-secondary"
          >
            <IconSearch size={14} />
            <span>Find unmatched</span>
          </button>
        </div>
      )}

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          'assistant-input-bar',
          isExpanded && 'assistant-input-bar--expanded',
          isFocused && 'assistant-input-bar--focused'
        )}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={
            isExpanded
              ? 'Ask about matches, suspense items, approve matches...'
              : 'Ask AI about reconciliation...'
          }
          aria-label="Ask reconciliation agent"
          className="assistant-input"
          disabled={isLoading}
        />

        {isExpanded && (
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="assistant-send-btn"
            aria-label="Send message"
          >
            <IconSend size={16} />
          </button>
        )}
      </form>
    </div>
  )
}
