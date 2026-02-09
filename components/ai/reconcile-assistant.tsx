'use client'

import * as React from 'react'
import { useChat, useCompletion, UIMessage } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
  useAppStore,
  useIsDemo,
  useMatches,
  useCashTransactionsSafe,
  useAccrualDocumentsSafe,
  MatchPair,
  Transaction,
} from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  IconX,
  IconSend,
  IconBrain,
  IconQuestion,
  IconSearch,
  IconCaretUp,
  IconMaximize,
  IconMinimize,
} from '@/components/brand/icons'
import { ChatMessage, TypingIndicator, AnalysisMessage, MatchResult } from './chat-message'
import { AssistantActionButtons } from './assistant-action-buttons'
import { LoadingSpinner } from '@/components/brand'

/**
 * @deprecated Use `ReconcileAgent` from `./reconcile-agent` instead.
 * This single-turn assistant is replaced by the multi-step agentic assistant
 * that uses tool calling, client-side confirmation, and Convex persistence.
 * Will be removed in a future release.
 */
interface ReconcileAssistantProps {
  sessionId?: string
  companyName?: string
  matches?: MatchPair[]
  pendingMatches?: MatchPair[]
  suspenseItems?: Transaction[]
  onApproveMatch?: (matchId: string) => void
  onRejectMatch?: (matchId: string) => void
  className?: string
}

// Development bypass for testing - only in dev mode
const BYPASS_PAYWALL =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_BYPASS_PAYWALL === 'true'

// Helper to extract text content from message parts
function getMessageText(message: UIMessage): string {
  return message.parts
    .map(part => (part.type === 'text' ? part.text : ''))
    .join('')
}

// Elegant geometric AI icon - 3x3 grid with breathing animation
function AIIcon({ className, animate = false }: { className?: string; animate?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn('w-4 h-4', className)}
      aria-hidden="true"
    >
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

export function ReconcileAssistant({
  sessionId,
  companyName,
  matches: propMatches,
  suspenseItems: propSuspenseItems,
  onApproveMatch,
  onRejectMatch,
  className,
}: ReconcileAssistantProps) {
  const isDemo = useIsDemo()
  const storeMatches = useMatches()
  const matches = propMatches ?? storeMatches
  // Mode-aware selectors - automatically return correct data based on isDemo
  const cashTransactions = useCashTransactionsSafe()
  const accrualDocuments = useAccrualDocumentsSafe()
  const { setShowPaywall } = useAppStore()

  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isMaximized, setIsMaximized] = React.useState(false)
  const [isVisible, setIsVisible] = React.useState(false) // Controls content visibility for animation
  const [input, setInput] = React.useState('')
  const [isPending, setIsPending] = React.useState(false)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [analysisMatches, setAnalysisMatches] = React.useState<MatchResult[]>([])
  const [isFocused, setIsFocused] = React.useState(false)

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Handle expansion with delayed visibility for smooth animation
  React.useEffect(() => {
    if (isExpanded) {
      // Small delay for the container to start expanding before showing content
      const timer = setTimeout(() => setIsVisible(true), 50)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [isExpanded])

  // Build context for the assistant
  const context = React.useMemo(() => {
    const suspenseFromTx = cashTransactions
      .filter(tx => tx.status === 'suspense')
      .map(tx => ({
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        date: tx.date,
        reason: 'no_match',
      }))

    return {
      sessionId,
      companyName,
      matches: matches.slice(0, 10).map(m => ({
        id: m.id,
        cashDescription: m.cashTransaction.description,
        cashAmount: m.cashTransaction.amount,
        cashDate: m.cashTransaction.date,
        accrualDescription: m.accrualTransaction.description,
        accrualAmount: m.accrualTransaction.amount,
        accrualDate: m.accrualTransaction.date,
        confidence: m.confidence,
        matchLayer: m.matchLayer,
        approved: m.approved,
      })),
      suspenseItems: propSuspenseItems?.slice(0, 10).map(s => ({
        id: s.id,
        description: s.description,
        amount: s.amount,
        date: s.date,
        reason: 'no_match',
      })) ?? suspenseFromTx.slice(0, 10),
    }
  }, [sessionId, companyName, matches, cashTransactions, propSuspenseItems])

  // Prepare data for AI analysis
  const pendingCashTransactions = React.useMemo(() =>
    cashTransactions.filter(t => t.status === 'pending').slice(0, 10).map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
    })),
    [cashTransactions]
  )

  const pendingAccrualDocuments = React.useMemo(() =>
    accrualDocuments.filter(d => d.status === 'pending').slice(0, 10).map(d => ({
      id: d.id,
      docDate: d.docDate,
      description: d.description,
      amount: d.amount,
      docNumber: d.docNumber,
      counterparty: d.counterparty,
    })),
    [accrualDocuments]
  )

  // AI Analysis completion hook
  const {
    completion: analysisCompletion,
    isLoading: isAnalysisLoading,
    complete: runAnalysisComplete,
  } = useCompletion({
    api: '/api/matching/stream',
    onFinish: () => {
      setIsAnalyzing(false)
    },
  })

  // Wrapper to pass fresh body data when running analysis
  const runAnalysis = React.useCallback((prompt: string) => {
    return runAnalysisComplete(prompt, {
      body: {
        cashTransactions: pendingCashTransactions,
        accrualDocuments: pendingAccrualDocuments,
        sessionId: sessionId || 'demo-session',
      },
    })
  }, [runAnalysisComplete, pendingCashTransactions, pendingAccrualDocuments, sessionId])

  // Parse matches from analysis completion
  React.useEffect(() => {
    if (!analysisCompletion || !isAnalyzing) return

    const confidenceMatches = analysisCompletion.matchAll(/CONFIDENCE:\s*(\d+)/gi)
    const recommendationMatches = analysisCompletion.matchAll(/RECOMMENDATION:\s*(MATCH|REVIEW|NO_MATCH|REJECT)/gi)
    const reasonMatches = analysisCompletion.matchAll(/REASON:\s*([^\n]+)/gi)

    const confidences = Array.from(confidenceMatches).map(m => parseInt(m[1]))
    const recommendations = Array.from(recommendationMatches).map(m => {
      const rec = m[1].toUpperCase()
      return rec === 'REJECT' ? 'NO_MATCH' : rec as 'MATCH' | 'REVIEW' | 'NO_MATCH'
    })
    const reasons = Array.from(reasonMatches).map(m => m[1].trim())

    if (confidences.length > 0) {
      const newMatches: MatchResult[] = confidences.map((conf, i) => ({
        cashId: pendingCashTransactions[i]?.id || `tx-${i}`,
        accrualId: pendingAccrualDocuments[i]?.id || `doc-${i}`,
        cashDescription: pendingCashTransactions[i]?.description,
        accrualDescription: pendingAccrualDocuments[i]?.description,
        confidence: conf,
        recommendation: recommendations[i] || 'REVIEW',
        reason: reasons[i] || 'Analysis in progress',
      }))
      setAnalysisMatches(newMatches)
    }
  }, [analysisCompletion, isAnalyzing, pendingCashTransactions, pendingAccrualDocuments])

  const { messages, sendMessage, setMessages } = useChat({
    id: 'reconcile-assistant',
    transport: new DefaultChatTransport({
      api: '/api/chat/assistant',
      body: { context },
    }),
  })

  // Add initial message if empty
  React.useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          parts: [{
            type: 'text',
            text: "How can I help with reconciliation?",
          }],
        } as UIMessage,
      ])
    }
  }, [messages.length, setMessages])

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, analysisCompletion, analysisMatches])

  // Focus input when panel expands
  React.useEffect(() => {
    if (isExpanded && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(timer)
    }
  }, [isExpanded])

  const handleExpand = () => {
    if (!BYPASS_PAYWALL && isDemo) {
      setShowPaywall(true)
      return
    }
    setIsExpanded(true)
  }

  const handleCollapse = () => {
    setIsExpanded(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isPending) return

    if (!BYPASS_PAYWALL && isDemo) {
      setShowPaywall(true)
      return
    }

    if (!isExpanded) {
      handleExpand()
      return
    }

    setIsPending(true)
    const messageText = input.trim()
    setInput('')

    try {
      await sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: messageText }],
      })
    } finally {
      setIsPending(false)
    }
  }

  const handleQuickAction = async (suggestion: string) => {
    if (!BYPASS_PAYWALL && isDemo) {
      setShowPaywall(true)
      return
    }

    if (!isExpanded) {
      setIsExpanded(true)
    }

    setIsPending(true)
    try {
      await sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: suggestion }],
      })
    } finally {
      setIsPending(false)
    }
  }

  // Run AI Analysis
  const handleRunAnalysis = React.useCallback(async () => {
    if (!BYPASS_PAYWALL && isDemo) {
      setShowPaywall(true)
      return
    }

    if (!isExpanded) {
      setIsExpanded(true)
    }

    if (pendingCashTransactions.length === 0 || pendingAccrualDocuments.length === 0) {
      setMessages(prev => [
        ...prev,
        {
          id: `no-data-${Date.now()}`,
          role: 'assistant',
          parts: [{
            type: 'text',
            text: "No pending transactions to analyze. Upload documents and run deterministic matching first.",
          }],
        } as UIMessage,
      ])
      return
    }

    setIsAnalyzing(true)
    setAnalysisMatches([])

    setMessages(prev => [
      ...prev,
      {
        id: `analysis-request-${Date.now()}`,
        role: 'user',
        parts: [{ type: 'text', text: 'Run AI Analysis' }],
      } as UIMessage,
      {
        id: `analysis-start-${Date.now()}`,
        role: 'assistant',
        parts: [{
          type: 'text',
          text: `Analyzing ${pendingCashTransactions.length} transactions against ${pendingAccrualDocuments.length} documents...`,
        }],
      } as UIMessage,
    ])

    try {
      await runAnalysis('')
    } catch {
      setIsAnalyzing(false)
      setMessages(prev => [
        ...prev,
        {
          id: `analysis-error-${Date.now()}`,
          role: 'assistant',
          parts: [{
            type: 'text',
            text: 'Analysis failed. Please try again.',
          }],
        } as UIMessage,
      ])
    }
  }, [isDemo, setShowPaywall, isExpanded, pendingCashTransactions, pendingAccrualDocuments, setMessages, runAnalysis])

  return (
    <div
      className={cn(
        'assistant-container',
        isExpanded && 'assistant-container--expanded',
        isMaximized && 'assistant-container--maximized',
        className
      )}
    >
      {/* Expanded Panel - Grows above the input bar */}
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
              <AIIcon className="text-foreground" animate={isPending || isAnalyzing} />
            </div>
            <span className="text-sm font-medium tracking-tight">Reconciliation Assistant</span>
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
              aria-label="Close assistant"
            >
              <IconX size={16} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="assistant-messages">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className="assistant-message-wrapper"
              style={{ '--message-index': index } as React.CSSProperties}
            >
              <ChatMessage
                role={message.role as 'user' | 'assistant'}
                content={getMessageText(message)}
              />
            </div>
          ))}

          {/* Analysis streaming content */}
          {isAnalyzing && analysisCompletion && (
            <AnalysisMessage
              content={analysisCompletion}
              matches={analysisMatches}
              isStreaming={isAnalysisLoading}
            />
          )}

          {/* Match results with action buttons */}
          {!isAnalyzing && analysisMatches.length > 0 && !analysisCompletion && (
            <div className="space-y-3 pl-10">
              {analysisMatches.map((match, i) => (
                <div
                  key={`final-${match.cashId}-${i}`}
                  className="assistant-match-result"
                  style={{ '--match-index': i } as React.CSSProperties}
                >
                  <div className={cn(
                    'assistant-match-card',
                    match.recommendation === 'MATCH' && 'assistant-match-card--success',
                    match.recommendation === 'REVIEW' && 'assistant-match-card--warning',
                    match.recommendation === 'NO_MATCH' && 'assistant-match-card--neutral'
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium tracking-tight">{match.cashId} → {match.accrualId}</span>
                      <span className={cn(
                        'text-xs font-mono tabular-nums',
                        match.recommendation === 'MATCH' && 'text-success',
                        match.recommendation === 'REVIEW' && 'text-warning',
                        match.recommendation === 'NO_MATCH' && 'text-muted-foreground'
                      )}>{match.confidence}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{match.reason}</p>

                    {(match.recommendation === 'MATCH' || match.recommendation === 'REVIEW') && (
                      <AssistantActionButtons
                        matchId={match.cashId}
                        recommendation={match.recommendation}
                        onApprove={onApproveMatch}
                        onReject={onRejectMatch}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isPending && <TypingIndicator />}

          {/* Analysis loading indicator */}
          {isAnalyzing && !analysisCompletion && (
            <div className="assistant-loading">
              <div className="assistant-loading-icon">
                <LoadingSpinner size="sm" />
              </div>
              <div className="assistant-loading-text">
                <span>Analyzing transactions...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {messages.length <= 2 && !isAnalyzing && (
          <div className="assistant-quick-actions">
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="assistant-action-primary"
            >
              <IconBrain size={14} />
              <span>Run AI Analysis</span>
              {isDemo && !BYPASS_PAYWALL && (
                <span className="assistant-pro-badge">PRO</span>
              )}
            </button>

            <button
              onClick={() => handleQuickAction('Explain the current matches and their confidence levels')}
              className="assistant-action-secondary"
            >
              <IconQuestion size={14} />
              <span>Explain matches</span>
            </button>

            <button
              onClick={() => handleQuickAction('Find potential matches for suspense items')}
              className="assistant-action-secondary"
            >
              <IconSearch size={14} />
              <span>Find matches</span>
            </button>
          </div>
        )}
      </div>

      {/* Input Bar - Always visible at bottom */}
      <form onSubmit={handleSubmit} className={cn(
        'assistant-input-bar',
        isExpanded && 'assistant-input-bar--expanded',
        isFocused && 'assistant-input-bar--focused'
      )}>
        {/* AI icon - collapsed state only */}
        {!isExpanded && (
          <button
            type="button"
            onClick={handleExpand}
            className="assistant-input-icon"
            aria-label="Open assistant"
          >
            <AIIcon className="text-foreground" />
          </button>
        )}

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => {
            setIsFocused(true)
            if (!isExpanded) handleExpand()
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={isExpanded ? "Ask about matches, suspense items..." : "Ask AI about reconciliation..."}
          aria-label="Ask reconciliation assistant"
          className="assistant-input"
          disabled={isPending}
        />

        {/* Expand indicator - collapsed state */}
        {!isExpanded && (
          <button
            type="button"
            onClick={handleExpand}
            className="assistant-expand-btn"
            aria-label="Expand panel"
          >
            <IconCaretUp size={16} />
          </button>
        )}

        {/* Send button - expanded state */}
        {isExpanded && (
          <button
            type="submit"
            disabled={!input.trim() || isPending}
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
