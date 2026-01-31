'use client'

import * as React from 'react'
import { useCompletion } from '@ai-sdk/react'
import { cn } from '@/lib/utils'
import { Brain, CheckCircle2, XCircle, Loader2, X, Sparkles, Zap } from 'lucide-react'
import { MatchingStepIndicator } from '@/components/brand'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  reference?: string
}

interface AccrualDocument {
  id: string
  docDate: string
  description?: string
  amount: number
  docNumber?: string
  counterparty?: string
}

interface MatchingReasoningProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  cashTransactions: Transaction[]
  accrualDocuments: AccrualDocument[]
  onMatchFound?: (match: {
    cashId: string
    accrualId: string
    confidence: number
    reason: string
  }) => void
  onComplete?: () => void
}

interface ParsedMatch {
  cashId: string
  accrualId: string
  confidence: number
  recommendation: 'MATCH' | 'REVIEW' | 'NO_MATCH'
  reason: string
}

export function MatchingReasoningOverlay({
  isOpen,
  onClose,
  sessionId,
  cashTransactions,
  accrualDocuments,
  onMatchFound,
  onComplete,
}: MatchingReasoningProps) {
  const [currentStep, setCurrentStep] = React.useState(1)
  const [matches, setMatches] = React.useState<ParsedMatch[]>([])
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const {
    completion,
    isLoading,
    complete,
    stop,
  } = useCompletion({
    api: '/api/matching/stream',
    body: {
      cashTransactions,
      accrualDocuments,
      sessionId,
    },
    onFinish: () => {
      setCurrentStep(5)
      onComplete?.()
    },
  })

  // Start matching when overlay opens
  React.useEffect(() => {
    if (isOpen && cashTransactions.length > 0 && accrualDocuments.length > 0) {
      setCurrentStep(4)
      setMatches([])
      complete('')
    }
  }, [isOpen, cashTransactions.length, accrualDocuments.length, complete])

  // Auto-scroll as text streams
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [completion])

  // Parse matches from completion text
  React.useEffect(() => {
    if (!completion) return

    const confidenceMatches = completion.matchAll(/CONFIDENCE:\s*(\d+)/gi)
    const recommendationMatches = completion.matchAll(/RECOMMENDATION:\s*(MATCH|REVIEW|NO_MATCH|REJECT)/gi)
    const reasonMatches = completion.matchAll(/REASON:\s*([^\n]+)/gi)

    const confidences = Array.from(confidenceMatches).map(m => parseInt(m[1]))
    const recommendations = Array.from(recommendationMatches).map(m => m[1].toUpperCase() as 'MATCH' | 'REVIEW' | 'NO_MATCH')
    const reasons = Array.from(reasonMatches).map(m => m[1].trim())

    if (confidences.length > matches.length) {
      const newMatches: ParsedMatch[] = confidences.map((conf, i) => ({
        cashId: cashTransactions[i]?.id || `tx-${i}`,
        accrualId: accrualDocuments[i]?.id || `doc-${i}`,
        confidence: conf,
        recommendation: recommendations[i] || 'REVIEW',
        reason: reasons[i] || 'Analysis in progress',
      }))
      setMatches(newMatches)

      newMatches.forEach((match, i) => {
        if (i >= matches.length && match.recommendation === 'MATCH') {
          onMatchFound?.({
            cashId: match.cashId,
            accrualId: match.accrualId,
            confidence: match.confidence,
            reason: match.reason,
          })
        }
      })
    }
  }, [completion, cashTransactions, accrualDocuments, matches.length, onMatchFound])

  const handleClose = React.useCallback(() => {
    if (isLoading) {
      stop()
    }
    onClose()
  }, [isLoading, stop, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl h-[85vh] bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-500">
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-8 py-6 border-b border-slate-700/50">
          <div className="flex items-center gap-5">
            {/* Animated logo */}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 shadow-lg shadow-amber-500/30 flex items-center justify-center">
                <Brain className="w-7 h-7 text-white" />
              </div>
              {/* Pulse ring */}
              {isLoading && (
                <div className="absolute inset-0 rounded-2xl border-2 border-amber-400 animate-ping opacity-30" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                AI Matching Analysis
                {isLoading && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300 rounded-full">
                    <Zap className="w-3 h-3" />
                    Processing
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Layer 5: Semantic matching with Claude
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <MatchingStepIndicator currentStep={currentStep} />
            <button
              onClick={handleClose}
              className="p-2.5 hover:bg-slate-800 rounded-xl transition-colors duration-200"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Reasoning Stream */}
          <div className="flex-1 flex flex-col border-r border-slate-700/50">
            <div className="px-6 py-3 border-b border-slate-700/30 bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-white">AI Reasoning</span>
                </div>
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Analyzing transactions...</span>
                  </div>
                )}
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed text-slate-300"
              style={{
                backgroundImage: 'linear-gradient(to bottom, transparent, rgba(251, 191, 36, 0.02))',
              }}
            >
              {completion ? (
                <pre className="whitespace-pre-wrap">
                  {completion}
                  {isLoading && (
                    <span className="inline-block w-2 h-5 bg-amber-400 animate-pulse ml-0.5 align-middle" />
                  )}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Brain className="w-12 h-12 mb-4 opacity-30" />
                  <p>Initializing AI analysis...</p>
                </div>
              )}
            </div>
          </div>

          {/* Match Results Sidebar */}
          <div className="w-80 flex flex-col bg-slate-800/20">
            <div className="px-5 py-3 border-b border-slate-700/30">
              <h3 className="text-sm font-medium text-white">Match Decisions</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {matches.length} of {cashTransactions.length} analyzed
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {matches.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-5 h-5 opacity-30" />
                  </div>
                  <p>Matches will appear here</p>
                </div>
              ) : (
                matches.map((match, i) => (
                  <MatchResultCard key={i} match={match} index={i} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative px-8 py-4 border-t border-slate-700/50 bg-slate-900/50 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            Analyzing{' '}
            <span className="text-white font-medium">{cashTransactions.length}</span>{' '}
            transactions ×{' '}
            <span className="text-white font-medium">{accrualDocuments.length}</span>{' '}
            documents
          </div>
          <div className="flex items-center gap-3">
            {isLoading ? (
              <button
                onClick={stop}
                className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl transition-colors duration-200"
              >
                Stop Analysis
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all duration-200"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MatchResultCard({ match, index }: { match: ParsedMatch; index: number }) {
  const isMatch = match.recommendation === 'MATCH'
  const isReview = match.recommendation === 'REVIEW'

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl text-sm overflow-hidden',
        'animate-in fade-in-0 slide-in-from-right-4 duration-500',
        'transition-all duration-300',
        isMatch && 'bg-emerald-500/10 border border-emerald-500/30',
        isReview && 'bg-amber-500/10 border border-amber-500/30',
        !isMatch && !isReview && 'bg-slate-800/50 border border-slate-700/50'
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Confidence bar */}
      <div
        className={cn(
          'absolute top-0 left-0 h-1',
          isMatch && 'bg-gradient-to-r from-emerald-500 to-emerald-400',
          isReview && 'bg-gradient-to-r from-amber-500 to-amber-400',
          !isMatch && !isReview && 'bg-slate-600'
        )}
        style={{ width: `${match.confidence}%` }}
      />

      <div className="flex items-start justify-between mb-2 pt-1">
        <span className="font-medium text-white truncate max-w-[160px]">
          {match.cashId}
        </span>
        {isMatch ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        ) : isReview ? (
          <Loader2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 text-slate-500 flex-shrink-0" />
        )}
      </div>

      <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
        <span>{match.confidence}% confidence</span>
        <span
          className={cn(
            'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
            isMatch && 'bg-emerald-500/20 text-emerald-300',
            isReview && 'bg-amber-500/20 text-amber-300',
            !isMatch && !isReview && 'bg-slate-700 text-slate-400'
          )}
        >
          {match.recommendation}
        </span>
      </div>

      <p className="text-xs text-slate-500 line-clamp-2">{match.reason}</p>
    </div>
  )
}
