'use client'

import * as React from 'react'
import { UIMessage } from '@ai-sdk/react'
import { cn } from '@/lib/utils'
import {
  IconX,
  IconCaretUp,
  IconMaximize,
  IconMinimize,
} from '@/components/brand/icons'
import { useReconcileAgent } from './hooks/use-reconcile-agent'
import { useChatPersistence } from './hooks/use-chat-persistence'
import { AgentMessageList } from './agent-message-list'
import { AgentInputBar } from './agent-input-bar'
import { useAppStore, useIsDemo } from '@/lib/store'

interface ReconcileAgentProps {
  sessionId: string
  companyName?: string
  /** Agent-generated summary from pre-upload analysis */
  agentSummary?: string
  className?: string
}

// Development bypass for testing
const BYPASS_PAYWALL =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_BYPASS_PAYWALL === 'true'

// Geometric AI icon with breathing animation
function AIIcon({ className, animate = false }: { className?: string; animate?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={cn('w-4 h-4', className)} aria-hidden="true">
      <rect x="1" y="1" width="4" height="4" fill="currentColor" className={animate ? 'assistant-icon-cell' : ''} style={{ animationDelay: '0ms' }} />
      <rect x="6" y="1" width="4" height="4" fill="currentColor" opacity="0.6" className={animate ? 'assistant-icon-cell' : ''} style={{ animationDelay: '100ms' }} />
      <rect x="11" y="1" width="4" height="4" fill="currentColor" opacity="0.3" className={animate ? 'assistant-icon-cell' : ''} style={{ animationDelay: '200ms' }} />
      <rect x="1" y="6" width="4" height="4" fill="currentColor" opacity="0.6" className={animate ? 'assistant-icon-cell' : ''} style={{ animationDelay: '100ms' }} />
      <rect x="6" y="6" width="4" height="4" fill="currentColor" className={animate ? 'assistant-icon-cell' : ''} style={{ animationDelay: '200ms' }} />
      <rect x="11" y="6" width="4" height="4" fill="currentColor" opacity="0.6" className={animate ? 'assistant-icon-cell' : ''} style={{ animationDelay: '300ms' }} />
      <rect x="1" y="11" width="4" height="4" fill="currentColor" opacity="0.3" className={animate ? 'assistant-icon-cell' : ''} style={{ animationDelay: '200ms' }} />
      <rect x="6" y="11" width="4" height="4" fill="currentColor" opacity="0.6" className={animate ? 'assistant-icon-cell' : ''} style={{ animationDelay: '300ms' }} />
      <rect x="11" y="11" width="4" height="4" fill="currentColor" className={animate ? 'assistant-icon-cell' : ''} style={{ animationDelay: '400ms' }} />
    </svg>
  )
}

export function ReconcileAgent({ sessionId, companyName, agentSummary, className }: ReconcileAgentProps) {
  const isDemo = useIsDemo()
  const { setShowPaywall } = useAppStore()

  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isMaximized, setIsMaximized] = React.useState(false)
  const [isVisible, setIsVisible] = React.useState(false)

  // Core agent hook
  const {
    messages,
    sendMessage,
    addToolOutput,
    setMessages,
    isLoading,
  } = useReconcileAgent({ sessionId, companyName, agentSummary })

  // Chat persistence
  useChatPersistence({ sessionId, messages, setMessages })

  // Handle expansion with delayed visibility for smooth animation
  React.useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => setIsVisible(true), 50)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [isExpanded])

  // Add welcome message if empty
  React.useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          parts: [{
            type: 'text',
            text: "How can I help with reconciliation? I can query your data, analyze matches, and execute actions with your confirmation.",
          }],
        } as UIMessage,
      ])
    }
  }, [messages.length, setMessages])

  // Keyboard shortcut: Cmd+J to toggle
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        setIsExpanded(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleExpand = () => {
    if (!BYPASS_PAYWALL && isDemo) {
      setShowPaywall(true)
      return
    }
    setIsExpanded(true)
  }

  const handleCollapse = () => {
    setIsExpanded(false)
    setIsMaximized(false)
  }

  const handleSendMessage = async (text: string) => {
    if (!BYPASS_PAYWALL && isDemo) {
      setShowPaywall(true)
      return
    }

    if (!isExpanded) {
      handleExpand()
    }

    await sendMessage({
      role: 'user',
      parts: [{ type: 'text', text }],
    })
  }

  return (
    <div
      className={cn(
        'assistant-container',
        isExpanded && 'assistant-container--expanded',
        isMaximized && 'assistant-container--maximized',
        className
      )}
    >
      {/* Expanded Panel */}
      <div
        className={cn(
          'assistant-panel',
          isExpanded && 'assistant-panel--expanded',
          isMaximized && 'assistant-panel--maximized',
          isVisible && 'assistant-panel--visible'
        )}
      >
        {/* Header */}
        <header className="assistant-header">
          <div className="flex items-center gap-3">
            <div className="assistant-header-icon">
              <AIIcon className="text-foreground" animate={isLoading} />
            </div>
            <span className="text-sm font-medium tracking-tight">Reconciliation Agent</span>
            {isLoading && (
              <span className="text-[10px] text-muted-foreground animate-pulse">thinking...</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="assistant-close-btn"
              aria-label={isMaximized ? 'Minimize' : 'Maximize'}
              title={isMaximized ? 'Minimize' : 'Maximize'}
            >
              {isMaximized ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
            </button>
            <button
              onClick={handleCollapse}
              className="assistant-close-btn"
              aria-label="Close agent"
            >
              <IconX size={16} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <AgentMessageList
          messages={messages}
          isLoading={isLoading}
          addToolOutput={addToolOutput}
        />
      </div>

      {/* Input bar - always visible at bottom */}
      <div>
        {/* Collapsed state: icon + input + expand */}
        {!isExpanded && (
          <div className="assistant-input-bar">
            <button
              type="button"
              onClick={handleExpand}
              className="assistant-input-icon"
              aria-label="Open agent"
            >
              <AIIcon className="text-foreground" />
            </button>
            <input
              type="text"
              placeholder="Ask AI about reconciliation..."
              aria-label="Ask reconciliation agent"
              className="assistant-input"
              onFocus={handleExpand}
              readOnly
            />
            <button
              type="button"
              onClick={handleExpand}
              className="assistant-expand-btn"
              aria-label="Expand panel"
            >
              <IconCaretUp size={16} />
            </button>
          </div>
        )}

        {/* Expanded state: full input bar with quick actions */}
        {isExpanded && (
          <AgentInputBar
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            isExpanded={isExpanded}
            showQuickActions={messages.length <= 2}
          />
        )}
      </div>
    </div>
  )
}
