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
} from '@/lib/store'
import { cn } from '@/lib/utils'
import { X, Send, Sparkles, Maximize2, Minimize2, Command, Brain, HelpCircle, Search } from 'lucide-react'
import { ChatMessage, TypingIndicator, AnalysisMessage, MatchResult } from './chat-message'

interface AssistantPanelProps {
  sessionId?: string
  companyName?: string
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

export function AssistantPanel({ sessionId, companyName, className }: AssistantPanelProps) {
  const isDemo = useIsDemo()
  const matches = useMatches()
  // Mode-aware selectors - automatically return correct data based on isDemo
  const cashTransactions = useCashTransactionsSafe()
  const accrualDocuments = useAccrualDocumentsSafe()
  const { setShowPaywall } = useAppStore()
  const [isOpen, setIsOpen] = React.useState(false)
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [input, setInput] = React.useState('')
  const [isPending, setIsPending] = React.useState(false)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [analysisMatches, setAnalysisMatches] = React.useState<MatchResult[]>([])
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

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
      suspenseItems: suspenseFromTx.slice(0, 10),
    }
  }, [sessionId, companyName, matches, cashTransactions])

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
    stop: stopAnalysis,
  } = useCompletion({
    api: '/api/matching/stream',
    onFinish: (prompt, completion) => {
      setIsAnalyzing(false)
      // Parse final match count from completion
      const finalConfidences = Array.from(completion.matchAll(/CONFIDENCE:\s*(\d+)/gi))
      const finalRecs = Array.from(completion.matchAll(/RECOMMENDATION:\s*(MATCH)/gi))
      setMessages(prev => [
        ...prev,
        {
          id: `analysis-complete-${Date.now()}`,
          role: 'assistant',
          parts: [{
            type: 'text',
            text: `Analysis complete! Found ${finalConfidences.length} potential matches. ${finalRecs.length} are high-confidence matches.`,
          }],
        } as UIMessage,
      ])
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
    id: 'reconciliation-assistant',
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
            text: "Hello! I'm your reconciliation assistant. I can help you understand matches, find potential matches for suspense items, and provide insights on your transactions.\n\nHow can I help you today?",
          }],
        } as UIMessage,
      ])
    }
  }, [messages.length, setMessages])

  // Auto-scroll to bottom on new messages or analysis updates
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, analysisCompletion, analysisMatches])

  // Focus input when panel opens
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Use refs for values that change but shouldn't trigger effect re-subscription
  const isOpenRef = React.useRef(isOpen)
  const isDemoRef = React.useRef(isDemo)
  const setShowPaywallRef = React.useRef(setShowPaywall)

  // Keep refs in sync
  React.useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  React.useEffect(() => {
    isDemoRef.current = isDemo
  }, [isDemo])

  React.useEffect(() => {
    setShowPaywallRef.current = setShowPaywall
  }, [setShowPaywall])

  // NOTE: Global ⌘K shortcut removed - AssistantPanel is deprecated
  // Use ReconcileAssistant for reconcile page which is page-scoped without global shortcut

  const handleOpenPanel = () => {
    if (!BYPASS_PAYWALL && isDemo) {
      setShowPaywall(true)
      return
    }
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isPending) return

    if (!BYPASS_PAYWALL && isDemo) {
      setShowPaywall(true)
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

    if (pendingCashTransactions.length === 0 || pendingAccrualDocuments.length === 0) {
      setMessages(prev => [
        ...prev,
        {
          id: `no-data-${Date.now()}`,
          role: 'assistant',
          parts: [{
            type: 'text',
            text: "I don't have any pending transactions to analyze. Upload some bank statements and invoices first, then run the deterministic matching layers before using AI analysis.",
          }],
        } as UIMessage,
      ])
      return
    }

    setIsAnalyzing(true)
    setAnalysisMatches([])

    // Add user message
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
          text: `Starting semantic analysis of ${pendingCashTransactions.length} transactions against ${pendingAccrualDocuments.length} documents...`,
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
            text: 'Sorry, there was an error running the analysis. Please try again.',
          }],
        } as UIMessage,
      ])
    }
  }, [isDemo, setShowPaywall, pendingCashTransactions, pendingAccrualDocuments, setMessages, runAnalysis])

  // Floating bar when closed - centered at bottom
  if (!isOpen) {
    return (
      <button
        onClick={handleOpenPanel}
        className={cn(
          'group fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
          'flex items-center gap-3 w-[420px] h-12 px-4',
          'bg-white/95 dark:bg-slate-900/95',
          'text-slate-600 dark:text-slate-300',
          'border border-slate-200 dark:border-slate-700',
          'rounded-full',
          'shadow-lg shadow-black/5 dark:shadow-black/20',
          'backdrop-blur-xl',
          'hover:border-slate-300 dark:hover:border-slate-600',
          'hover:shadow-xl hover:shadow-black/10',
          'transition-all duration-300 ease-out',
          className
        )}
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800">
          <Sparkles className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </div>

        {/* Placeholder text */}
        <span className="flex-1 text-left text-sm text-slate-400 dark:text-slate-500">
          Ask AI anything...
        </span>

        {/* Keyboard shortcut hint */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-400 dark:text-slate-500">
          <Command className="w-3 h-3" />
          <span>K</span>
        </div>

        {isDemo && !BYPASS_PAYWALL && (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full">
            PRO
          </span>
        )}
      </button>
    )
  }

  // Expanded panel - centered, grows upward
  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col',
        'bg-white dark:bg-slate-900',
        'border border-slate-200 dark:border-slate-700',
        'shadow-2xl shadow-black/10 dark:shadow-black/30',
        'rounded-2xl overflow-hidden',
        'backdrop-blur-xl',
        'animate-in fade-in-0 slide-in-from-bottom-4 zoom-in-95 duration-300 ease-out',
        isExpanded
          ? 'inset-4'
          : 'bottom-6 left-1/2 -translate-x-1/2 w-[420px] h-[500px]',
        'transition-all duration-300 ease-out',
        className
      )}
    >
      {/* Header - Minimal */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800">
            <Sparkles className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            AI Assistant
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-150"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            ) : (
              <Maximize2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-150"
          >
            <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-slate-50/50 dark:bg-slate-950/50"
      >
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role as 'user' | 'assistant'}
            content={getMessageText(message)}
          />
        ))}

        {/* Analysis streaming content */}
        {isAnalyzing && analysisCompletion && (
          <AnalysisMessage
            content={analysisCompletion}
            matches={analysisMatches}
            isStreaming={isAnalysisLoading}
          />
        )}

        {/* Show final match results after analysis completes */}
        {!isAnalyzing && analysisMatches.length > 0 && !analysisCompletion && (
          <div className="space-y-2 pl-10">
            {analysisMatches.map((match, i) => (
              <div key={`final-${match.cashId}-${i}`} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                <div
                  className={cn(
                    'relative p-3 rounded-xl text-sm overflow-hidden',
                    match.recommendation === 'MATCH' && 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800',
                    match.recommendation === 'REVIEW' && 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800',
                    match.recommendation === 'NO_MATCH' && 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{match.cashId} → {match.accrualId}</span>
                    <span className={cn(
                      'text-xs font-mono',
                      match.recommendation === 'MATCH' && 'text-emerald-600',
                      match.recommendation === 'REVIEW' && 'text-amber-600',
                      match.recommendation === 'NO_MATCH' && 'text-slate-500'
                    )}>{match.confidence}%</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{match.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {isPending && <TypingIndicator />}

        {/* Analysis loading indicator */}
        {isAnalyzing && !analysisCompletion && (
          <div className="flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 animate-pulse" />
            </div>
            <div className="px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Initializing AI analysis...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && !isAnalyzing && (
        <div className="px-4 pb-2">
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Quick Actions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {/* Primary AI Analysis action */}
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5',
                'text-xs font-medium',
                'bg-slate-900 dark:bg-white',
                'text-white dark:text-slate-900',
                'rounded-full',
                'hover:bg-slate-800 dark:hover:bg-slate-100',
                'transition-all duration-150',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Brain className="w-3 h-3" />
              Run AI Analysis
              {isDemo && !BYPASS_PAYWALL && (
                <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-white/20 dark:bg-slate-900/20 rounded">PRO</span>
              )}
            </button>

            {/* Secondary actions */}
            {[
              { label: 'Explain matches', icon: HelpCircle },
              { label: 'Find suspense matches', icon: Search },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => handleQuickAction(label)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5',
                  'text-xs text-slate-600 dark:text-slate-400',
                  'bg-white dark:bg-slate-800',
                  'border border-slate-200 dark:border-slate-700',
                  'rounded-full',
                  'hover:bg-slate-50 dark:hover:bg-slate-700',
                  'hover:border-slate-300 dark:hover:border-slate-600',
                  'transition-all duration-150'
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about matches, suspense items..."
            className={cn(
              'flex-1 px-4 py-2.5',
              'text-sm text-slate-800 dark:text-white',
              'placeholder:text-slate-400 dark:placeholder:text-slate-500',
              'bg-slate-50 dark:bg-slate-800',
              'border border-slate-200 dark:border-slate-700',
              'rounded-full',
              'focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:border-transparent',
              'transition-all duration-150',
              'disabled:opacity-50'
            )}
            disabled={isPending}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!input.trim() || isPending}
            className={cn(
              'flex-shrink-0 w-9 h-9 rounded-full',
              'flex items-center justify-center',
              'transition-all duration-150',
              input.trim() && !isPending
                ? [
                    'bg-slate-900 dark:bg-white',
                    'text-white dark:text-slate-900',
                    'hover:bg-slate-800 dark:hover:bg-slate-100',
                    'active:scale-95',
                  ]
                : [
                    'bg-slate-100 dark:bg-slate-800',
                    'text-slate-400 dark:text-slate-500',
                    'cursor-not-allowed',
                  ]
            )}
          >
            <Send className={cn('w-4 h-4', isPending && 'animate-pulse')} />
          </button>
        </div>
      </form>
    </div>
  )
}
